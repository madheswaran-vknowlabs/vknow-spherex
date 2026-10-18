import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  LeaveBalance,
  LeaveRequest,
  DailyWorkUpdate,
  User,
  Notification,
  DEFAULT_CORPORATE_LEAVE_QUOTAS,
} from "@/models";
import { eachDayOfInterval, parseISO, format } from "date-fns";

const LEAVE_TYPE_TO_KEY: Record<string, keyof typeof DEFAULT_CORPORATE_LEAVE_QUOTAS> = {
  "Casual Leave": "casualLeave",
  "Sick Leave": "sickLeave",
  "Earned Leave": "earnedLeave",
  "Maternity Leave": "maternityLeave",
  "Paternity Leave": "paternityLeave",
  "Medical Leave": "medicalLeave",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = session.user as any;
    const isAdmin = currentUser.role === "admin";
    const isManager = currentUser.role === "manager";

    if (!isAdmin && !isManager) {
      return NextResponse.json(
        { success: false, error: "Only managers and administrators can review leave requests." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { requestId, action, remarks = "" } = body;

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Valid requestId and action ('approve' | 'reject') are required." },
        { status: 400 }
      );
    }

    const leaveRequest = await LeaveRequest.findById(requestId);
    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: "Leave request not found." }, { status: 404 });
    }

    if (leaveRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `Leave request has already been ${leaveRequest.status}.` },
        { status: 400 }
      );
    }

    // Manager authority check: must be manager of the employee or admin
    if (isManager && !isAdmin && leaveRequest.managerId?.toString() !== currentUser.id) {
      return NextResponse.json(
        { success: false, error: "You are not the designated reporting manager for this employee." },
        { status: 403 }
      );
    }

    const currentYear = new Date().getFullYear();
    const balanceKey = LEAVE_TYPE_TO_KEY[leaveRequest.leaveType];

    const userBalance = await LeaveBalance.findOne({
      userId: leaveRequest.userId,
      year: currentYear,
    });

    if (action === "approve") {
      leaveRequest.status = "approved";
      leaveRequest.reviewedBy = currentUser.id;
      leaveRequest.reviewedByName = currentUser.name || "Manager";
      leaveRequest.reviewedAt = new Date();
      leaveRequest.reviewRemarks = remarks.trim();
      await leaveRequest.save();

      // Deduct from pending, add to used in balance
      if (userBalance && balanceKey && userBalance[balanceKey]) {
        const typeBal = userBalance[balanceKey];
        typeBal.pending = Math.max(0, typeBal.pending - leaveRequest.totalDays);
        typeBal.used = typeBal.used + leaveRequest.totalDays;
        await userBalance.save();
      }

      // Sync DailyWorkUpdate for all days in leave interval
      const startObj = parseISO(leaveRequest.startDate);
      const endObj = parseISO(leaveRequest.endDate);
      const dates = eachDayOfInterval({ start: startObj, end: endObj });

      for (const d of dates) {
        const dateStr = format(d, "yyyy-MM-dd");
        await DailyWorkUpdate.findOneAndUpdate(
          { userId: leaveRequest.userId, dateString: dateStr },
          {
            $set: {
              userId: leaveRequest.userId,
              userName: leaveRequest.userName,
              userEmail: leaveRequest.userEmail,
              userRole: leaveRequest.userRole,
              department: leaveRequest.department,
              managerId: leaveRequest.managerId,
              date: d,
              dateString: dateStr,
              status: "on_leave",
              workLocation: "In Office",
              dayType: "Non Work Day",
              leaveType: leaveRequest.leaveType,
              leaveReason: leaveRequest.reason,
              totalHours: 0,
            },
          },
          { upsert: true, new: true }
        );
      }

      // Send approval notification
      await Notification.create({
        userId: leaveRequest.userId,
        title: "Leave Application Approved! 🎉",
        message: `Your ${leaveRequest.leaveType} (${leaveRequest.startDate} to ${leaveRequest.endDate}, ${leaveRequest.totalDays} day(s)) has been approved by ${currentUser.name || "Management"}.`,
        type: "stage_approved",
        link: "/attendance",
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: `Leave approved for ${leaveRequest.userName}. Daily attendance records have been synchronized.`,
        request: leaveRequest,
      });
    } else {
      // Reject action
      leaveRequest.status = "rejected";
      leaveRequest.reviewedBy = currentUser.id;
      leaveRequest.reviewedByName = currentUser.name || "Manager";
      leaveRequest.reviewedAt = new Date();
      leaveRequest.reviewRemarks = remarks.trim() || "No specific reason provided.";
      await leaveRequest.save();

      // Release pending count
      if (userBalance && balanceKey && userBalance[balanceKey]) {
        const typeBal = userBalance[balanceKey];
        typeBal.pending = Math.max(0, typeBal.pending - leaveRequest.totalDays);
        await userBalance.save();
      }

      // Send rejection notification
      await Notification.create({
        userId: leaveRequest.userId,
        title: "Leave Application Rejected",
        message: `Your ${leaveRequest.leaveType} (${leaveRequest.startDate} to ${leaveRequest.endDate}) was rejected. Reason: ${remarks.trim() || "Not approved by management."}`,
        type: "stage_rejected",
        link: "/attendance",
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: `Leave request rejected. Notification sent to ${leaveRequest.userName}.`,
        request: leaveRequest,
      });
    }
  } catch (error: any) {
    console.error("Leave Action API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process leave action" },
      { status: 500 }
    );
  }
}
