import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Stage, Task, Discrepancy, WeeklyUpdate, User, DailyWorkUpdate } from "@/models";
import { requireAuth } from "@/lib/auth";
import { buildConsolidatedExcel, buildIndividualExcel, buildAttendanceExcel } from "@/lib/reports/excel-generator";
import { format, subWeeks, subMonths, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";
    const selectedProjectId = searchParams.get("projectId");
    const requestedUserId = searchParams.get("userId");
    const isAdmin = user.role === "admin";
    const isManager = user.role === "manager";
    const canManage = isAdmin || isManager;
    const reportType = searchParams.get("type") || (canManage ? "consolidated" : "individual");
    const targetUserId = canManage ? requestedUserId : user.id;

    // Period calculation
    const now = new Date();
    let dateFilter: any = null;
    let periodLabel = "All Time";
    if (period === "weekly") {
      dateFilter = { $gte: subWeeks(now, 1) };
      periodLabel = "Past 7 Days";
    } else if (period === "monthly") {
      dateFilter = { $gte: subMonths(now, 1) };
      periodLabel = "Past 30 Days";
    } else if (period === "yearly") {
      dateFilter = { $gte: subYears(now, 1) };
      periodLabel = "Past 365 Days";
    }

    // Projects Query
    const projectQuery: any = { isArchived: false };
    if (!isAdmin && !isManager) {
      projectQuery.members = user.id;
    } else if (isManager && !selectedProjectId) {
      projectQuery.$or = [{ members: user.id }, { createdBy: user.id }];
    }
    if (selectedProjectId && selectedProjectId !== "ALL") {
      projectQuery._id = selectedProjectId;
    }

    const projects = await Project.find(projectQuery).lean();
    const projectIds = projects.map((p) => p._id);

    // Tasks Query
    const taskQuery: any = { projectId: { $in: projectIds }, isArchived: false };
    if (targetUserId && targetUserId !== "ALL") {
      taskQuery.assigneeId = targetUserId;
    }

    // Weekly Updates Query
    const weeklyQuery: any = { projectId: { $in: projectIds } };
    if (targetUserId && targetUserId !== "ALL") {
      weeklyQuery.userId = targetUserId;
    }
    if (dateFilter) {
      weeklyQuery.weekStartDate = dateFilter;
    }

    // Daily Work Updates Query
    const dailyQuery: any = {};
    if (targetUserId && targetUserId !== "ALL") {
      dailyQuery.userId = targetUserId;
    } else if (user.role === "manager") {
      const myEmployees = await User.find({
        $or: [{ createdBy: user.id }, { managerId: user.id }, { _id: user.id }],
      }).select("_id");
      dailyQuery.userId = { $in: myEmployees.map((e) => e._id) };
    }
    if (dateFilter) {
      dailyQuery.date = dateFilter;
    }

    const [tasks, stages, discrepancies, weeklyUpdates, dailyWorkUpdates] = await Promise.all([
      Task.find(taskQuery)
        .populate("projectId", "name code client")
        .populate("stageId", "name order")
        .populate("assigneeId", "name email department")
        .lean(),
      Stage.find({ projectId: { $in: projectIds }, isArchived: false })
        .populate("projectId", "code name")
        .populate("signOff.approvedBy", "name")
        .lean(),
      Discrepancy.find({ projectId: { $in: projectIds } })
        .populate("projectId", "name code")
        .populate("stageId", "name")
        .populate("taskId", "title")
        .populate("raisedById", "name")
        .lean(),
      WeeklyUpdate.find(weeklyQuery)
        .populate("userId", "name department")
        .populate("projectId", "name code")
        .sort({ weekStartDate: -1 })
        .lean(),
      DailyWorkUpdate.find(dailyQuery).sort({ date: -1 }).lean(),
    ]);

    const totalEst = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
    const totalLag = projects.reduce((acc, p) => acc + (p.lagInDays || 0), 0);
    const onTimeTasks = tasks.filter((t) => (t.lagInDays || 0) === 0);
    const onTimeRate = tasks.length > 0 ? Math.round((onTimeTasks.length / tasks.length) * 100) : 100;

    let excelBuffer: Buffer;
    let fileName = `VKnow-SphereX-Report-${format(new Date(), "yyyyMMdd")}.xlsx`;

    if (reportType === "attendance") {
      const granularity = searchParams.get("granularity") || period || "monthly";
      const baseDate = searchParams.get("date") ? parseISO(searchParams.get("date")!) : new Date();

      let startDateObj: Date;
      let endDateObj: Date;

      if (granularity === "weekly" || granularity === "week") {
        startDateObj = startOfWeek(baseDate, { weekStartsOn: 1 });
        endDateObj = endOfWeek(baseDate, { weekStartsOn: 1 });
      } else if (granularity === "monthly" || granularity === "month") {
        startDateObj = startOfMonth(baseDate);
        endDateObj = endOfMonth(baseDate);
      } else {
        startDateObj = baseDate;
        endDateObj = baseDate;
      }

      const daysList = eachDayOfInterval({ start: startDateObj, end: endDateObj }).map((d) => format(d, "yyyy-MM-dd"));
      const startDateStr = format(startDateObj, "yyyy-MM-dd");
      const endDateStr = format(endDateObj, "yyyy-MM-dd");

      // Staff list to include
      let staffList: any[] = [];
      if (isAdmin) {
        staffList = await User.find({ isActive: true, role: { $in: ["employee", "manager"] } })
          .select("name email role department avatar")
          .sort({ name: 1 })
          .lean();
      } else if (user.role === "manager") {
        staffList = await User.find({
          isActive: true,
          $or: [{ managerId: user.id }, { createdBy: user.id }, { role: "employee" }],
        })
          .select("name email role department avatar")
          .sort({ name: 1 })
          .lean();
      } else {
        staffList = [user];
      }

      const staffIds = staffList.map((s) => s._id);
      const attUpdates = await DailyWorkUpdate.find({
        userId: { $in: staffIds },
        dateString: { $gte: startDateStr, $lte: endDateStr },
      }).lean();

      let totalLoggedHours = 0;
      let inOfficeCount = 0;
      let wfhCount = 0;
      let clientSiteCount = 0;
      let workDayCount = 0;
      let festivalDayCount = 0;
      let nonWorkDayCount = 0;
      let leaveCount = 0;

      const staffConsolidated = staffList.map((staff) => {
        const userUpdates = attUpdates.filter((u) => u.userId.toString() === staff._id.toString());
        let sInOffice = 0;
        let sWfh = 0;
        let sClientSite = 0;
        let sWorkDays = 0;
        let sFest = 0;
        let sNonWork = 0;
        let sLeaves = 0;
        let sHours = 0;

        userUpdates.forEach((u) => {
          if (u.status === "on_leave") {
            sLeaves++;
            leaveCount++;
          } else {
            if (u.workLocation === "Work From Home") {
              sWfh++;
              wfhCount++;
            } else if (u.workLocation === "Client Site") {
              sClientSite++;
              clientSiteCount++;
            } else {
              sInOffice++;
              inOfficeCount++;
            }

            if (u.dayType === "Festival Day") {
              sFest++;
              festivalDayCount++;
            } else if (u.dayType === "Non Work Day") {
              sNonWork++;
              nonWorkDayCount++;
            } else {
              sWorkDays++;
              workDayCount++;
            }

            sHours += u.totalHours || 0;
            totalLoggedHours += u.totalHours || 0;
          }
        });

        return {
          employee: staff,
          inOfficeDays: sInOffice,
          wfhDays: sWfh,
          clientSiteDays: sClientSite,
          workDays: sWorkDays,
          festivalDays: sFest,
          nonWorkDays: sNonWork,
          leaveDays: sLeaves,
          totalHours: sHours,
          avgHoursPerDay: sWorkDays > 0 ? Math.round((sHours / sWorkDays) * 10) / 10 : 0,
          dailyRecords: userUpdates,
        };
      });

      const teamSummary = {
        totalMembers: staffList.length,
        totalLoggedHours,
        inOfficeCount,
        wfhCount,
        clientSiteCount,
        workDayCount,
        festivalDayCount,
        nonWorkDayCount,
        leaveCount,
        avgHoursPerWorkDay: workDayCount > 0 ? Math.round((totalLoggedHours / workDayCount) * 10) / 10 : 0,
      };

      excelBuffer = await buildAttendanceExcel({
        period: granularity,
        periodLabel: `${granularity.toUpperCase()} Attendance (${startDateStr} to ${endDateStr})`,
        startDateStr,
        endDateStr,
        daysList,
        teamSummary,
        staffConsolidated,
        updates: attUpdates,
        generatedBy: user.name,
      });

      fileName = `VKnow-SphereX-Attendance-${granularity}-${startDateStr}.xlsx`;
    } else if (!isAdmin || reportType === "individual") {
      // Individual Report for the requested or current user
      const targetUserDoc = targetUserId ? await User.findById(targetUserId).lean() : user;
      excelBuffer = await buildIndividualExcel({
        user: targetUserDoc || user,
        summary: {
          totalEstimatedHours: totalEst,
          totalLoggedHours: totalLogged,
          effortVarianceHours: totalLogged - totalEst,
          onTimeRate,
        },
        tasks,
        weeklyUpdates,
        dailyWorkUpdates,
        periodLabel,
      });
      fileName = `VKnow-${(targetUserDoc?.name || user.name).replace(/\s+/g, "_")}-Report.xlsx`;
    } else {
      // Consolidated Report for Admin / Manager
      excelBuffer = await buildConsolidatedExcel({
        summary: {
          totalProjects: projects.length,
          activeProjects: projects.filter((p) => p.status === "Active").length,
          totalLagDays: totalLag,
          avgLagDays: projects.length > 0 ? Math.round((totalLag / projects.length) * 10) / 10 : 0,
          totalEstimatedHours: totalEst,
          totalLoggedHours: totalLogged,
          effortVarianceHours: totalLogged - totalEst,
          effortVariancePercent: totalEst > 0 ? Math.round(((totalLogged - totalEst) / totalEst) * 100) : 0,
          openDiscrepanciesCount: discrepancies.filter((d) => d.status === "Open" || d.status === "In Review").length,
          criticalDiscrepanciesCount: discrepancies.filter((d) => d.severity === "Critical").length,
          atRiskTasksCount: tasks.filter((t) => t.isAtRisk).length,
          onTimeRate,
        },
        projects,
        stages,
        tasks,
        weeklyUpdates,
        discrepancies,
        dailyWorkUpdates,
        periodLabel,
        generatedBy: user.name,
      });
      fileName = `VKnow-SphereX-Consolidated-Report-${format(new Date(), "yyyyMMdd")}.xlsx`;
    }

    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("EXCEL_EXPORT_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export Excel report" },
      { status: error.status || 500 }
    );
  }
}
