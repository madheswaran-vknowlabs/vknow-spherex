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

    const [tasks, stages, discrepancies, weeklyUpdates, dailyWorkUpdates, allUsers] = await Promise.all([
      Task.find(taskQuery)
        .populate("projectId", "name code client")
        .populate("stageId", "name order")
        .populate("assigneeId", "name email department managerId")
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
        .populate("userId", "name department email managerId")
        .populate("projectId", "name code")
        .sort({ weekStartDate: -1 })
        .lean(),
      DailyWorkUpdate.find(dailyQuery).sort({ date: -1 }).lean(),
      User.find({ isActive: true })
        .populate("managerId", "name email role")
        .populate("createdBy", "name email role")
        .sort({ name: 1 })
        .lean(),
    ]);

    // Build comprehensive manager lookup and direct reports maps
    const userManagerMap = new Map<string, { managerName: string; managerEmail: string }>();
    const directReportsMap = new Map<string, string[]>();

    allUsers.forEach((u: any) => {
      let mgrName = "-";
      let mgrEmail = "-";

      if (u.managerId && typeof u.managerId === "object" && u.managerId.name) {
        mgrName = u.managerId.name;
        mgrEmail = u.managerId.email || "-";
        const mId = u.managerId._id?.toString();
        if (mId) {
          if (!directReportsMap.has(mId)) directReportsMap.set(mId, []);
          directReportsMap.get(mId)!.push(u.name);
        }
      } else if (u.createdBy && typeof u.createdBy === "object" && u.createdBy.name && u.createdBy.role === "manager") {
        mgrName = u.createdBy.name;
        mgrEmail = u.createdBy.email || "-";
        const cId = u.createdBy._id?.toString();
        if (cId) {
          if (!directReportsMap.has(cId)) directReportsMap.set(cId, []);
          directReportsMap.get(cId)!.push(u.name);
        }
      } else if (u.role === "admin") {
        mgrName = "Executive Board";
      } else if (u.role === "manager") {
        mgrName = "Direct to Leadership / Admin";
      } else {
        mgrName = "Direct / Leadership";
      }

      userManagerMap.set(u._id.toString(), { managerName: mgrName, managerEmail: mgrEmail });
    });

    // Enrich tasks with assignee's reporting manager
    tasks.forEach((t: any) => {
      const aId = t.assigneeId?._id?.toString() || (typeof t.assigneeId === "string" ? t.assigneeId : null);
      const mgrInfo = aId ? userManagerMap.get(aId) : null;
      t.assigneeManagerName = mgrInfo?.managerName || (t.assigneeId?.managerId ? (userManagerMap.get(t.assigneeId.managerId.toString())?.managerName || "-") : "Direct / Leadership");
    });

    // Enrich weekly updates with author's reporting manager
    weeklyUpdates.forEach((w: any) => {
      const uId = w.userId?._id?.toString() || (typeof w.userId === "string" ? w.userId : null);
      w.reportingManagerName = (uId ? userManagerMap.get(uId)?.managerName : null) || "Direct / Leadership";
    });

    // Enrich daily work updates with employee's reporting manager
    dailyWorkUpdates.forEach((u: any) => {
      const uId = u.userId?.toString();
      const mgrInfo = uId ? userManagerMap.get(uId) : null;
      u.reportingManagerName = mgrInfo?.managerName || (u.managerId ? (userManagerMap.get(u.managerId.toString())?.managerName || "-") : "Direct / Leadership");
    });

    // Construct team roster dataset with explicit Reporting Manager breakdown
    const teamMembers = allUsers.map((u: any) => {
      const uId = u._id.toString();
      const mgrInfo = userManagerMap.get(uId) || { managerName: "Direct / Leadership", managerEmail: "-" };
      const userTasks = tasks.filter((t: any) => {
        const tAssigneeId = t.assigneeId?._id?.toString() || t.assigneeId?.toString();
        return tAssigneeId === uId;
      });
      const est = userTasks.reduce((acc: number, t: any) => acc + (t.estimatedHours || 0), 0);
      const log = userTasks.reduce((acc: number, t: any) => acc + (t.loggedHours || 0), 0);
      const directReports = directReportsMap.get(uId) || [];

      return {
        _id: uId,
        name: u.name,
        email: u.email,
        department: u.department || "Engineering",
        role: u.role,
        reportingManager: mgrInfo.managerName,
        managerEmail: mgrInfo.managerEmail,
        directReportsCount: directReports.length,
        directReportsList: directReports.length > 0 ? directReports.join(", ") : "-",
        assignedTasksCount: userTasks.length,
        estimatedHours: est,
        loggedHours: log,
        varianceHours: log - est,
        isActive: u.isActive !== false,
      };
    });

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
        staffList = allUsers.filter((u: any) => ["employee", "manager", "user"].includes(u.role));
      } else if (user.role === "manager") {
        staffList = allUsers.filter(
          (u: any) =>
            u._id.toString() === user.id ||
            u.managerId?._id?.toString() === user.id ||
            u.createdBy?._id?.toString() === user.id ||
            u.role === "employee"
        );
      } else {
        const selfDoc = allUsers.find((u: any) => u._id.toString() === user.id);
        staffList = [selfDoc || user];
      }

      const staffIds = staffList.map((s) => s._id);
      const attUpdates = await DailyWorkUpdate.find({
        userId: { $in: staffIds },
        dateString: { $gte: startDateStr, $lte: endDateStr },
      }).lean();

      // Enrich attendance updates with reporting manager name
      attUpdates.forEach((u: any) => {
        const uId = u.userId?.toString();
        u.reportingManager = (uId ? userManagerMap.get(uId)?.managerName : null) || "Direct / Leadership";
      });

      let totalLoggedHours = 0;
      let inOfficeCount = 0;
      let wfhCount = 0;
      let clientSiteCount = 0;
      let workDayCount = 0;
      let festivalDayCount = 0;
      let nonWorkDayCount = 0;
      let leaveCount = 0;

      const staffConsolidated = staffList.map((staff) => {
        const staffIdStr = staff._id.toString();
        const mgrInfo = userManagerMap.get(staffIdStr) || {
          managerName: staff.managerId?.name || (staff.role === "manager" ? "Direct to Leadership / Admin" : staff.role === "admin" ? "Executive Board" : "Direct / Leadership"),
          managerEmail: staff.managerId?.email || "-",
        };

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
          reportingManager: mgrInfo.managerName,
          reportingManagerEmail: mgrInfo.managerEmail,
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
      const targetUserDoc: any = targetUserId ? allUsers.find((u: any) => u._id.toString() === targetUserId) || (await User.findById(targetUserId).lean()) : user;
      const targetUserIdStr = targetUserDoc?._id?.toString() || (targetUserDoc as any)?.id || user.id;
      const targetMgr = userManagerMap.get(targetUserIdStr) || {
        managerName: targetUserDoc?.managerId?.name || "Direct / Leadership",
        managerEmail: targetUserDoc?.managerId?.email || "-",
      };
      const enrichedUser = {
        ...(targetUserDoc || user),
        reportingManager: targetMgr.managerName,
        managerEmail: targetMgr.managerEmail,
      };

      excelBuffer = await buildIndividualExcel({
        user: enrichedUser,
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
        teamMembers,
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
