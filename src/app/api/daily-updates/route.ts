import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Project from "@/models/Project";
import Stage from "@/models/Stage";
import Task from "@/models/Task";
import DailyWorkUpdate from "@/models/DailyWorkUpdate";
import { format, subDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { buildAttendanceExcel } from "@/lib/reports/excel-generator";

export const dynamic = "force-dynamic";

// Helper to format Date to YYYY-MM-DD
function getFormattedDate(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = session.user as any;
    const url = new URL(req.url);
    const requestedDate = url.searchParams.get("date") || getFormattedDate(new Date());
    const filterUserId = url.searchParams.get("userId");
    const period = (url.searchParams.get("period") || "week") as "day" | "week" | "month";
    const exportFormat = url.searchParams.get("export");

    // Yesterday's date string for check
    const todayObj = new Date();
    const yesterdayObj = subDays(todayObj, 1);
    const todayString = getFormattedDate(todayObj);
    const yesterdayString = getFormattedDate(yesterdayObj);

    // ==========================================
    // CASE 1: EMPLOYEE VIEW
    // ==========================================
    if (currentUser.role === "employee" && (!filterUserId || filterUserId === currentUser.id)) {
      // 1. Fetch user's daily update for requestedDate
      let update = await DailyWorkUpdate.findOne({
        userId: currentUser.id,
        dateString: requestedDate,
      });

      // 2. Check if submitted today and yesterday
      const todayUpdate = await DailyWorkUpdate.findOne({
        userId: currentUser.id,
        dateString: todayString,
      });
      const yesterdayUpdate = await DailyWorkUpdate.findOne({
        userId: currentUser.id,
        dateString: yesterdayString,
      });

      const hasSubmittedToday = !!todayUpdate && (todayUpdate.status === "submitted" || todayUpdate.status === "on_leave");
      const hasSubmittedYesterday = !!yesterdayUpdate && (yesterdayUpdate.status === "submitted" || yesterdayUpdate.status === "on_leave");

      // 3. Fetch active projects with stages & tasks for dropdowns
      const projects = await Project.find({
        isArchived: false,
        $or: [
          { members: currentUser.id },
          { createdBy: currentUser.id },
        ],
      })
        .select("_id name code key status stages members")
        .lean();

      // Fetch stages for these projects
      const projectIds = projects.map((p) => p._id);
      const stages = await Stage.find({ projectId: { $in: projectIds } })
        .select("_id projectId name order status")
        .sort({ order: 1 })
        .lean();

      // Fetch existing tasks assigned to or in progress for current user
      const existingTasks = await Task.find({
        projectId: { $in: projectIds },
        isArchived: false,
        $or: [{ assigneeId: currentUser.id }, { assigneeId: null }],
      })
        .select("_id projectId stageId title status estimatedHours loggedHours")
        .lean();

      return NextResponse.json({
        success: true,
        data: {
          role: "employee",
          date: requestedDate,
          todayString,
          yesterdayString,
          hasSubmittedToday,
          hasSubmittedYesterday,
          update,
          projects,
          stages,
          existingTasks,
          user: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
          },
        },
      });
    }

    // Helper function for computing consolidated attendance across staff
    async function computeAttendanceData(staffList: any[]) {
      let refDate: Date;
      try {
        refDate = parseISO(requestedDate);
        if (isNaN(refDate.getTime())) refDate = new Date();
      } catch {
        refDate = new Date();
      }

      let start: Date;
      let end: Date;
      let periodLabel = "";

      if (period === "week") {
        start = startOfWeek(refDate, { weekStartsOn: 1 });
        end = endOfWeek(refDate, { weekStartsOn: 1 });
        periodLabel = `Week of ${format(start, "dd MMM yyyy")} - ${format(end, "dd MMM yyyy")}`;
      } else if (period === "month") {
        start = startOfMonth(refDate);
        end = endOfMonth(refDate);
        periodLabel = format(refDate, "MMMM yyyy");
      } else {
        // "day"
        start = refDate;
        end = refDate;
        periodLabel = format(refDate, "dd MMMM yyyy");
      }

      const startDateStr = format(start, "yyyy-MM-dd");
      const endDateStr = format(end, "yyyy-MM-dd");
      const daysList = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));

      const staffIds = staffList.map((s) => s._id);

      const periodUpdates = await DailyWorkUpdate.find({
        userId: { $in: staffIds },
        dateString: { $gte: startDateStr, $lte: endDateStr },
      }).lean();

      const updatesByUser = new Map<string, any[]>();
      for (const u of periodUpdates) {
        const uid = u.userId.toString();
        if (!updatesByUser.has(uid)) updatesByUser.set(uid, []);
        updatesByUser.get(uid)!.push(u);
      }

      let totalLoggedHours = 0;
      let inOfficeCount = 0;
      let wfhCount = 0;
      let clientSiteCount = 0;
      let workDayCount = 0;
      let festivalDayCount = 0;
      let nonWorkDayCount = 0;
      let leaveCount = 0;

      const staffConsolidated = staffList.map((staff) => {
        const userUpdates = updatesByUser.get(staff._id.toString()) || [];

        let staffInOffice = 0;
        let staffWfh = 0;
        let staffClientSite = 0;
        let staffWorkDays = 0;
        let staffFestivalDays = 0;
        let staffNonWorkDays = 0;
        let staffLeaves = 0;
        let staffHours = 0;

        userUpdates.forEach((u) => {
          if (u.status === "on_leave") {
            staffLeaves++;
          } else {
            if (u.workLocation === "Work From Home") staffWfh++;
            else if (u.workLocation === "Client Site") staffClientSite++;
            else staffInOffice++;

            if (u.dayType === "Festival Day") staffFestivalDays++;
            else if (u.dayType === "Non Work Day") staffNonWorkDays++;
            else staffWorkDays++;

            staffHours += u.totalHours || 0;
          }
        });

        staffHours = Number(staffHours.toFixed(1));
        const avg = staffWorkDays > 0 ? Number((staffHours / staffWorkDays).toFixed(1)) : 0;

        totalLoggedHours += staffHours;
        inOfficeCount += staffInOffice;
        wfhCount += staffWfh;
        clientSiteCount += staffClientSite;
        workDayCount += staffWorkDays;
        festivalDayCount += staffFestivalDays;
        nonWorkDayCount += staffNonWorkDays;
        leaveCount += staffLeaves;

        return {
          employee: staff,
          inOfficeDays: staffInOffice,
          wfhDays: staffWfh,
          clientSiteDays: staffClientSite,
          workDays: staffWorkDays,
          festivalDays: staffFestivalDays,
          nonWorkDays: staffNonWorkDays,
          leaveDays: staffLeaves,
          totalHours: staffHours,
          avgHoursPerDay: avg,
          dailyRecords: userUpdates,
        };
      });

      totalLoggedHours = Number(totalLoggedHours.toFixed(1));
      const avgHoursPerWorkDay = workDayCount > 0 ? Number((totalLoggedHours / workDayCount).toFixed(1)) : 0;

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
        avgHoursPerWorkDay,
      };

      return {
        period,
        periodLabel,
        startDateStr,
        endDateStr,
        daysList,
        teamSummary,
        staffConsolidated,
        updates: periodUpdates,
      };
    }

    // ==========================================
    // CASE 2: MANAGER VIEW (Their reporting team & project members)
    // ==========================================
    if (currentUser.role === "manager") {
      let teamEmployees = await User.find({
        isActive: true,
        $or: [
          { managerId: currentUser.id },
          { role: "employee" },
        ],
      })
        .select("_id name email role department managerId")
        .sort({ name: 1 })
        .lean();

      const employeeIds = teamEmployees.map((e) => e._id);

      // Attendance consolidated calculation
      const attendanceData = await computeAttendanceData(teamEmployees);

      if (exportFormat === "excel") {
        const excelBuffer = await buildAttendanceExcel({
          period: attendanceData.period,
          periodLabel: attendanceData.periodLabel,
          startDateStr: attendanceData.startDateStr,
          endDateStr: attendanceData.endDateStr,
          daysList: attendanceData.daysList,
          teamSummary: attendanceData.teamSummary,
          staffConsolidated: attendanceData.staffConsolidated,
          updates: attendanceData.updates,
          generatedBy: currentUser.name || "Manager",
        });

        return new NextResponse(excelBuffer as any, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="SphereX_Team_Attendance_${attendanceData.period}_${attendanceData.startDateStr}_to_${attendanceData.endDateStr}.xlsx"`,
          },
        });
      }

      // Fetch all daily updates for the specific requestedDate (Single Day Tracker)
      const updates = await DailyWorkUpdate.find({
        userId: { $in: employeeIds },
        dateString: requestedDate,
      }).lean();

      const updateMap = new Map();
      updates.forEach((u) => updateMap.set(u.userId.toString(), u));

      let submittedCount = 0;
      let leaveCount = 0;
      let pendingCount = 0;
      let totalHours = 0;

      const employeeCards = teamEmployees.map((emp) => {
        const empUpdate = updateMap.get(emp._id.toString());
        if (empUpdate) {
          if (empUpdate.status === "on_leave") {
            leaveCount++;
          } else if (empUpdate.status === "submitted") {
            submittedCount++;
            totalHours += empUpdate.totalHours || 0;
          } else {
            pendingCount++;
          }
          return {
            employee: emp,
            update: empUpdate,
            status: empUpdate.status,
          };
        } else {
          pendingCount++;
          return {
            employee: emp,
            update: null,
            status: "pending",
          };
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          role: "manager",
          date: requestedDate,
          todayString,
          yesterdayString,
          summary: {
            totalMembers: teamEmployees.length,
            submittedCount,
            leaveCount,
            pendingCount,
            totalHours,
          },
          team: employeeCards,
          attendance: attendanceData,
        },
      });
    }

    // ==========================================
    // CASE 3: ADMIN VIEW (Entire Organization)
    // ==========================================
    if (currentUser.role === "admin") {
      let query: any = { isActive: true, role: { $in: ["employee", "manager"] } };
      const department = url.searchParams.get("department");
      if (department) query.department = department;

      const allStaff = await User.find(query)
        .populate("managerId", "name email")
        .select("_id name email role department managerId")
        .sort({ name: 1 })
        .lean();

      const staffIds = allStaff.map((s) => s._id);

      // Attendance consolidated calculation
      const attendanceData = await computeAttendanceData(allStaff);

      if (exportFormat === "excel") {
        const excelBuffer = await buildAttendanceExcel({
          period: attendanceData.period,
          periodLabel: attendanceData.periodLabel,
          startDateStr: attendanceData.startDateStr,
          endDateStr: attendanceData.endDateStr,
          daysList: attendanceData.daysList,
          teamSummary: attendanceData.teamSummary,
          staffConsolidated: attendanceData.staffConsolidated,
          updates: attendanceData.updates,
          generatedBy: currentUser.name || "Administrator",
        });

        return new NextResponse(excelBuffer as any, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="SphereX_Company_Attendance_${attendanceData.period}_${attendanceData.startDateStr}_to_${attendanceData.endDateStr}.xlsx"`,
          },
        });
      }

      const updates = await DailyWorkUpdate.find({
        userId: { $in: staffIds },
        dateString: requestedDate,
      }).lean();

      const updateMap = new Map();
      updates.forEach((u) => updateMap.set(u.userId.toString(), u));

      let submittedCount = 0;
      let leaveCount = 0;
      let pendingCount = 0;
      let totalHours = 0;

      const staffCards = allStaff.map((staff) => {
        const staffUpdate = updateMap.get(staff._id.toString());
        if (staffUpdate) {
          if (staffUpdate.status === "on_leave") {
            leaveCount++;
          } else if (staffUpdate.status === "submitted") {
            submittedCount++;
            totalHours += staffUpdate.totalHours || 0;
          } else {
            pendingCount++;
          }
          return {
            employee: staff,
            update: staffUpdate,
            status: staffUpdate.status,
          };
        } else {
          pendingCount++;
          return {
            employee: staff,
            update: null,
            status: "pending",
          };
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          role: "admin",
          date: requestedDate,
          todayString,
          yesterdayString,
          summary: {
            totalMembers: allStaff.length,
            submittedCount,
            leaveCount,
            pendingCount,
            totalHours,
          },
          team: staffCards,
          attendance: attendanceData,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  } catch (error: any) {
    console.error("GET /api/daily-updates error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = session.user as any;
    const body = await req.json();

    const {
      dateString,
      status = "submitted",
      leaveType = null,
      leaveReason = "",
      workLocation = "In Office",
      dayType = "Work Day",
      tasks = [],
      generalNotes = "",
    } = body;

    if (!dateString) {
      return NextResponse.json({ success: false, error: "Date string is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const dateObj = new Date(dateString);

    // Calculate total hours
    const totalHours =
      status === "on_leave"
        ? 0
        : tasks.reduce((sum: number, t: any) => sum + (parseFloat(t.hours) || 0), 0);

    // Find user record to get managerId
    const userDoc = await User.findById(currentUser.id).select("managerId department name email role");

    // Upsert or find existing DailyWorkUpdate
    let dailyUpdate = await DailyWorkUpdate.findOne({
      userId: currentUser.id,
      dateString,
    });

    // ==========================================
    // SYNC WITH PROJECT TASKS & WORKLOGS
    // "if they do in daily basic in the daily task update tab it will shown under the project as already implemented"
    // ==========================================
    const processedTasks = [];

    if (status === "submitted" && Array.isArray(tasks)) {
      for (const t of tasks) {
        if (!t.title || !t.projectId) continue;

        let linkedTaskId = t.taskId;
        const taskHours = parseFloat(t.hours) || 0;

        // Find or create project Task to show under project
        let taskRecord = null;
        if (linkedTaskId) {
          taskRecord = await Task.findById(linkedTaskId);
        }

        if (!taskRecord && t.projectId && t.stageId) {
          // Check if a task with the same title exists in this stage
          taskRecord = await Task.findOne({
            projectId: t.projectId,
            stageId: t.stageId,
            title: t.title.trim(),
            isArchived: false,
          });
        }

        if (!taskRecord && t.projectId && t.stageId) {
          // Create new task under project & stage
          const plannedStart = dateObj;
          const plannedEnd = dateObj;

          taskRecord = await Task.create({
            projectId: t.projectId,
            stageId: t.stageId,
            title: t.title.trim(),
            description: t.description || "",
            assigneeId: currentUser.id,
            priority: "Medium",
            plannedStartDate: plannedStart,
            plannedEndDate: plannedEnd,
            actualStartDate: dateObj,
            actualEndDate: t.taskStatus === "Completed" ? dateObj : null,
            estimatedHours: taskHours || 2,
            loggedHours: 0,
            percentComplete: t.taskStatus === "Completed" ? 100 : 50,
            status: t.taskStatus || "Completed",
            isAtRisk: t.taskStatus === "Blocked",
            workLogs: [],
          });
        }

        if (taskRecord) {
          linkedTaskId = taskRecord._id;

          // Append work log entry
          const workLogEntry = {
            userId: currentUser.id,
            userName: currentUser.name,
            date: dateObj,
            startTime: t.startTime || "10:00 AM",
            endTime: t.endTime || "12:00 PM",
            hours: taskHours,
            notes: t.description || t.title,
            createdAt: new Date(),
          };

          taskRecord.workLogs = taskRecord.workLogs || [];
          taskRecord.workLogs.push(workLogEntry);
          taskRecord.loggedHours = (taskRecord.loggedHours || 0) + taskHours;
          if (t.taskStatus) {
            taskRecord.status = t.taskStatus;
            if (t.taskStatus === "Completed") {
              taskRecord.percentComplete = 100;
              taskRecord.actualEndDate = dateObj;
            } else if (t.taskStatus === "Blocked") {
              taskRecord.isAtRisk = true;
            }
          }
          await taskRecord.save();
        }

        processedTasks.push({
          taskId: linkedTaskId || null,
          projectId: t.projectId,
          projectName: t.projectName,
          stageId: t.stageId || null,
          stageName: t.stageName || "",
          title: t.title,
          description: t.description || "",
          startTime: t.startTime || "",
          endTime: t.endTime || "",
          hours: taskHours,
          taskStatus: t.taskStatus || "Completed",
          blockers: t.blockers || "",
          doubts: t.doubts || [],
        });
      }
    }

    if (!dailyUpdate) {
      dailyUpdate = new DailyWorkUpdate({
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userRole: currentUser.role,
        department: userDoc?.department || "Engineering",
        managerId: userDoc?.managerId || null,
        date: dateObj,
        dateString,
        status,
        leaveType: status === "on_leave" ? leaveType : null,
        leaveReason: status === "on_leave" ? leaveReason : "",
        workLocation: workLocation || "In Office",
        dayType: dayType || "Work Day",
        totalHours,
        tasks: processedTasks,
        generalNotes,
      });
    } else {
      dailyUpdate.status = status;
      dailyUpdate.leaveType = status === "on_leave" ? leaveType : null;
      dailyUpdate.leaveReason = status === "on_leave" ? leaveReason : "";
      dailyUpdate.workLocation = workLocation || dailyUpdate.workLocation || "In Office";
      dailyUpdate.dayType = dayType || dailyUpdate.dayType || "Work Day";
      dailyUpdate.totalHours = totalHours;
      dailyUpdate.tasks = processedTasks;
      dailyUpdate.generalNotes = generalNotes;
    }

    await dailyUpdate.save();

    return NextResponse.json({
      success: true,
      message:
        status === "on_leave"
          ? `Leave recorded successfully for ${dateString}`
          : `Daily work update logged successfully (${totalHours} hrs)`,
      data: dailyUpdate,
    });
  } catch (error: any) {
    console.error("POST /api/daily-updates error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
