import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  LeaveBalance,
  LeaveRequest,
  LeavePolicy,
  User,
  Notification,
  DEFAULT_CORPORATE_LEAVE_QUOTAS,
} from "@/models";
import { parseISO, differenceInCalendarDays, isValid } from "date-fns";

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
    const body = await req.json();

    const {
      leaveType,
      startDate,
      endDate,
      isHalfDay = false,
      halfDaySession = null,
      reason,
    } = body;

    if (!leaveType || !startDate || !endDate || !reason?.trim()) {
      return NextResponse.json(
        { success: false, error: "Leave type, start date, end date, and reason are required." },
        { status: 400 }
      );
    }

    const startObj = parseISO(startDate);
    const endObj = parseISO(endDate);

    if (!isValid(startObj) || !isValid(endObj) || endObj < startObj) {
      return NextResponse.json(
        { success: false, error: "End date must be on or after start date." },
        { status: 400 }
      );
    }

    // Calculate total days
    let totalDays = 0;
    if (isHalfDay) {
      totalDays = 0.5;
    } else {
      totalDays = differenceInCalendarDays(endObj, startObj) + 1;
    }

    if (totalDays <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid leave duration calculation." },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const balanceKey = LEAVE_TYPE_TO_KEY[leaveType];

    // Check user document for manager
    const userDoc = await User.findById(currentUser.id).select(
      "name email role department managerId"
    );

    // Find or create user's leave balance
    let userBalance = await LeaveBalance.findOne({
      userId: currentUser.id,
      year: currentYear,
    });

    if (!userBalance) {
      let policy = await LeavePolicy.findOne({ year: currentYear });
      const quotas = policy?.quotas || DEFAULT_CORPORATE_LEAVE_QUOTAS;

      userBalance = await LeaveBalance.create({
        userId: currentUser.id,
        userName: userDoc?.name || currentUser.name || "Employee",
        userEmail: userDoc?.email || currentUser.email || "",
        department: userDoc?.department || "Engineering",
        year: currentYear,
        casualLeave: { allocated: quotas.casualLeave, used: 0, pending: 0 },
        sickLeave: { allocated: quotas.sickLeave, used: 0, pending: 0 },
        earnedLeave: { allocated: quotas.earnedLeave, used: 0, pending: 0 },
        maternityLeave: { allocated: quotas.maternityLeave, used: 0, pending: 0 },
        paternityLeave: { allocated: quotas.paternityLeave, used: 0, pending: 0 },
        medicalLeave: { allocated: quotas.medicalLeave, used: 0, pending: 0 },
        customAdjusted: false,
      });
    }

    // Balance check for standard leave types
    if (balanceKey && userBalance[balanceKey]) {
      const typeBal = userBalance[balanceKey];
      const available = typeBal.allocated - typeBal.used - typeBal.pending;

      if (totalDays > available) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient leave balance for ${leaveType}. Available: ${available} day(s), Requested: ${totalDays} day(s).`,
          },
          { status: 400 }
        );
      }

      // Add to pending
      typeBal.pending += totalDays;
      await userBalance.save();
    }

    // Create the leave request
    const leaveRequest = await LeaveRequest.create({
      userId: currentUser.id,
      userName: userDoc?.name || currentUser.name || "Employee",
      userEmail: userDoc?.email || currentUser.email || "",
      userRole: userDoc?.role || currentUser.role || "employee",
      department: userDoc?.department || "Engineering",
      managerId: userDoc?.managerId || null,
      leaveType,
      startDate,
      endDate,
      totalDays,
      isHalfDay: !!isHalfDay,
      halfDaySession: isHalfDay ? halfDaySession : null,
      reason: reason.trim(),
      status: "pending",
    });

    // Notify manager if assigned, else notify admins
    if (userDoc?.managerId) {
      await Notification.create({
        userId: userDoc.managerId,
        title: `New Leave Application: ${userDoc.name}`,
        message: `${userDoc.name} applied for ${totalDays} day(s) of ${leaveType} (${startDate} to ${endDate}).`,
        type: "stage_approval_needed",
        link: "/attendance",
        isRead: false,
      });
    } else {
      const admins = await User.find({ role: "admin", isActive: true }).select("_id");
      for (const admin of admins) {
        await Notification.create({
          userId: admin._id,
          title: `New Leave Application: ${userDoc?.name || currentUser.name}`,
          message: `${userDoc?.name || currentUser.name} applied for ${totalDays} day(s) of ${leaveType} (${startDate} to ${endDate}).`,
          type: "stage_approval_needed",
          link: "/attendance",
          isRead: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Leave application for ${totalDays} day(s) submitted successfully. Pending manager review.`,
      request: leaveRequest,
      balance: userBalance,
    });
  } catch (error: any) {
    console.error("Apply Leave Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit leave application" },
      { status: 500 }
    );
  }
}
