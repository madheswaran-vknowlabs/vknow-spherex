import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { DailyWorkUpdate, User } from "@/models";
import {
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  isWeekend,
  parseISO,
} from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = session.user as any;
    const { searchParams } = new URL(req.url);

    // month format: "YYYY-MM", defaults to current month
    const monthParam = searchParams.get("month") || format(new Date(), "yyyy-MM");
    const mode = searchParams.get("mode") || "self"; // "self" | "team" | "company"
    const targetUserId = searchParams.get("userId") || currentUser.id;

    const isAdmin = currentUser.role === "admin";
    const isManager = currentUser.role === "manager";

    // Permission check
    if (targetUserId !== currentUser.id && !isAdmin && !isManager) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    // Parse month date range
    const [yearStr, monthStr] = monthParam.split("-");
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const monthStart = startOfMonth(new Date(year, monthIndex, 1));
    const monthEnd = endOfMonth(monthStart);

    const monthStartStr = format(monthStart, "yyyy-MM-dd");
    const monthEndStr = format(monthEnd, "yyyy-MM-dd");

    // Build days array for the month
    const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    if (mode === "company" && isAdmin) {
      // Company-wide monthly attendance summary
      const allUsers = await User.find({ isActive: true }).select("name email role department").lean();
      const updates = await DailyWorkUpdate.find({
        dateString: { $gte: monthStartStr, $lte: monthEndStr },
      }).lean();

      return NextResponse.json({
        success: true,
        month: monthParam,
        mode: "company",
        totalUsers: allUsers.length,
        users: allUsers,
        updates,
      });
    }

    if (mode === "team" && (isManager || isAdmin)) {
      // Manager's team attendance
      const teamQuery = isAdmin
        ? { isActive: true }
        : { $or: [{ managerId: currentUser.id }, { _id: currentUser.id }], isActive: true };

      const teamUsers = await User.find(teamQuery).select("name email role department").lean();
      const teamUserIds = teamUsers.map((u) => u._id);

      const updates = await DailyWorkUpdate.find({
        userId: { $in: teamUserIds },
        dateString: { $gte: monthStartStr, $lte: monthEndStr },
      }).lean();

      return NextResponse.json({
        success: true,
        month: monthParam,
        mode: "team",
        teamUsers,
        updates,
      });
    }

    // Default: Self / Single Employee Monthly Attendance
    const queryUserId = targetUserId;
    const userDoc = await User.findById(queryUserId).select("name email role department").lean();

    const monthlyUpdates = await DailyWorkUpdate.find({
      userId: queryUserId,
      dateString: { $gte: monthStartStr, $lte: monthEndStr },
    })
      .sort({ dateString: 1 })
      .lean();

    const updatesMap = new Map<string, any>();
    monthlyUpdates.forEach((up) => {
      updatesMap.set(up.dateString, up);
    });

    let presentDays = 0;
    let officeDays = 0;
    let wfhDays = 0;
    let clientSiteDays = 0;
    let leaveDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;
    let totalHoursLogged = 0;

    const leaveBreakdown: Record<string, number> = {
      "Casual Leave": 0,
      "Sick Leave": 0,
      "Earned Leave": 0,
      "Maternity Leave": 0,
      "Paternity Leave": 0,
      "Medical Leave": 0,
      Other: 0,
    };

    const dailyRegister = allDaysInMonth.map((dayDate) => {
      const dateString = format(dayDate, "yyyy-MM-dd");
      const dayName = format(dayDate, "EEE");
      const dayNumber = format(dayDate, "d");
      const isWknd = isWeekend(dayDate);
      const update = updatesMap.get(dateString);

      if (isWknd) {
        weekendDays++;
      }

      let attendanceStatus: "present" | "on_leave" | "weekend" | "holiday" | "unlogged" = "unlogged";
      let workLocation: string = "In Office";
      let dayType: string = isWknd ? "Non Work Day" : "Work Day";
      let leaveType: string | null = null;
      let hours = 0;

      if (update) {
        hours = update.totalHours || 0;
        totalHoursLogged += hours;
        workLocation = update.workLocation || "In Office";
        dayType = update.dayType || "Work Day";

        if (update.status === "on_leave") {
          attendanceStatus = "on_leave";
          const resolvedLeaveType: string = update.leaveType || "Casual Leave";
          leaveType = resolvedLeaveType;
          leaveDays++;
          if (leaveBreakdown[resolvedLeaveType] !== undefined) {
            leaveBreakdown[resolvedLeaveType]++;
          } else {
            leaveBreakdown.Other = (leaveBreakdown.Other || 0) + 1;
          }
        } else if (update.dayType === "Festival Day") {
          attendanceStatus = "holiday";
          holidayDays++;
        } else {
          attendanceStatus = "present";
          presentDays++;
          if (workLocation === "Work From Home") wfhDays++;
          else if (workLocation === "Client Site") clientSiteDays++;
          else officeDays++;
        }
      } else {
        if (isWknd) {
          attendanceStatus = "weekend";
        }
      }

      return {
        dateString,
        dayName,
        dayNumber,
        isWeekend: isWknd,
        attendanceStatus,
        workLocation,
        dayType,
        leaveType,
        leaveReason: update?.leaveReason || "",
        hours,
        tasksCount: update?.tasks?.length || 0,
        updateId: update?._id,
      };
    });

    const totalWorkingDays = allDaysInMonth.filter((d) => !isWeekend(d)).length;
    const workingDaysPresentOrLeave = presentDays + leaveDays;
    const complianceRate =
      totalWorkingDays > 0 ? Math.round((workingDaysPresentOrLeave / totalWorkingDays) * 100) : 100;
    const avgDailyHours = presentDays > 0 ? Math.round((totalHoursLogged / presentDays) * 10) / 10 : 0;

    return NextResponse.json({
      success: true,
      month: monthParam,
      user: userDoc,
      stats: {
        totalDaysInMonth: allDaysInMonth.length,
        totalWorkingDays,
        presentDays,
        officeDays,
        wfhDays,
        clientSiteDays,
        leaveDays,
        weekendDays,
        holidayDays,
        totalHoursLogged: Math.round(totalHoursLogged * 10) / 10,
        avgDailyHours,
        complianceRate,
        leaveBreakdown,
      },
      dailyRegister,
    });
  } catch (error: any) {
    console.error("Attendance API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch attendance data" },
      { status: 500 }
    );
  }
}
