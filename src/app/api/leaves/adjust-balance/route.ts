import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeaveBalance, User } from "@/models";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUser = session.user as any;
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only administrators can adjust individual employee leave balances." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, balances, adjustmentNote = "" } = body;

    if (!userId || !balances) {
      return NextResponse.json(
        { success: false, error: "userId and balances are required." },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    const userDoc = await User.findById(userId).select("name email department");
    if (!userDoc) {
      return NextResponse.json({ success: false, error: "Employee not found." }, { status: 404 });
    }

    let userBalance = await LeaveBalance.findOne({ userId, year: currentYear });

    if (!userBalance) {
      userBalance = new LeaveBalance({
        userId,
        userName: userDoc.name,
        userEmail: userDoc.email,
        department: userDoc.department || "Engineering",
        year: currentYear,
      });
    }

    // Update allocated and used values for each leave type if provided
    const leaveKeys = [
      "casualLeave",
      "sickLeave",
      "earnedLeave",
      "maternityLeave",
      "paternityLeave",
      "medicalLeave",
    ] as const;

    for (const key of leaveKeys) {
      if (balances[key]) {
        if (balances[key].allocated !== undefined) {
          userBalance[key].allocated = Math.max(0, Number(balances[key].allocated));
        }
        if (balances[key].used !== undefined) {
          userBalance[key].used = Math.max(0, Number(balances[key].used));
        }
      }
    }

    userBalance.customAdjusted = true;
    userBalance.adjustmentNote = adjustmentNote.trim();
    userBalance.lastAdjustedBy = currentUser.id;
    userBalance.lastAdjustedAt = new Date();

    await userBalance.save();

    return NextResponse.json({
      success: true,
      message: `Leave balance updated for ${userDoc.name}.`,
      balance: userBalance,
    });
  } catch (error: any) {
    console.error("Adjust Balance API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to adjust employee leave balance" },
      { status: 500 }
    );
  }
}
