import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  LeaveBalance,
  LeaveRequest,
  LeavePolicy,
  User,
  DEFAULT_CORPORATE_LEAVE_QUOTAS,
} from "@/models";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = session.user as any;
    const currentYear = new Date().getFullYear();
    const isAdmin = currentUser.role === "admin";
    const isManager = currentUser.role === "manager";

    // 1. Get or create corporate policy for this year
    let policy = await LeavePolicy.findOne({ year: currentYear });
    if (!policy) {
      policy = await LeavePolicy.create({
        year: currentYear,
        quotas: DEFAULT_CORPORATE_LEAVE_QUOTAS,
        carryForwardLimit: 5,
        notes: "Corporate Standard Enterprise Leave Policy",
      });
    }

    // 2. Get or initialize current user's LeaveBalance
    let userBalance = await LeaveBalance.findOne({
      userId: currentUser.id,
      year: currentYear,
    });

    if (!userBalance) {
      const uDoc = await User.findById(currentUser.id).select("name email department").lean();
      userBalance = await LeaveBalance.create({
        userId: currentUser.id,
        userName: uDoc?.name || currentUser.name || "Employee",
        userEmail: uDoc?.email || currentUser.email || "",
        department: uDoc?.department || "Engineering",
        year: currentYear,
        casualLeave: { allocated: policy.quotas.casualLeave, used: 0, pending: 0 },
        sickLeave: { allocated: policy.quotas.sickLeave, used: 0, pending: 0 },
        earnedLeave: { allocated: policy.quotas.earnedLeave, used: 0, pending: 0 },
        maternityLeave: { allocated: policy.quotas.maternityLeave, used: 0, pending: 0 },
        paternityLeave: { allocated: policy.quotas.paternityLeave, used: 0, pending: 0 },
        medicalLeave: { allocated: policy.quotas.medicalLeave, used: 0, pending: 0 },
        customAdjusted: false,
      });
    }

    // 3. User's personal leave applications
    const myLeaveRequests = await LeaveRequest.find({ userId: currentUser.id })
      .sort({ createdAt: -1 })
      .lean();

    // 4. Pending team approvals for Manager or Admin
    let pendingApprovals: any[] = [];
    if (isAdmin) {
      pendingApprovals = await LeaveRequest.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .lean();
    } else if (isManager) {
      pendingApprovals = await LeaveRequest.find({
        status: "pending",
        managerId: currentUser.id,
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    // 5. Admin directory of all employee leave balances
    let allEmployeeBalances: any[] = [];
    if (isAdmin) {
      allEmployeeBalances = await LeaveBalance.find({ year: currentYear })
        .sort({ userName: 1 })
        .lean();

      // If any active users don't have a balance yet, create and include them
      const activeUsers = await User.find({ isActive: true }).select("name email department").lean();
      const existingUserIds = new Set(allEmployeeBalances.map((b) => b.userId.toString()));

      for (const u of activeUsers) {
        if (!existingUserIds.has(u._id.toString())) {
          const newBal = await LeaveBalance.create({
            userId: u._id,
            userName: u.name,
            userEmail: u.email,
            department: u.department || "Engineering",
            year: currentYear,
            casualLeave: { allocated: policy.quotas.casualLeave, used: 0, pending: 0 },
            sickLeave: { allocated: policy.quotas.sickLeave, used: 0, pending: 0 },
            earnedLeave: { allocated: policy.quotas.earnedLeave, used: 0, pending: 0 },
            maternityLeave: { allocated: policy.quotas.maternityLeave, used: 0, pending: 0 },
            paternityLeave: { allocated: policy.quotas.paternityLeave, used: 0, pending: 0 },
            medicalLeave: { allocated: policy.quotas.medicalLeave, used: 0, pending: 0 },
            customAdjusted: false,
          });
          allEmployeeBalances.push(newBal.toObject());
        }
      }
    }

    return NextResponse.json({
      success: true,
      currentYear,
      policy,
      balance: userBalance,
      myRequests: myLeaveRequests,
      pendingApprovals,
      allEmployeeBalances,
    });
  } catch (error: any) {
    console.error("Leaves API GET Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch leave data" },
      { status: 500 }
    );
  }
}
