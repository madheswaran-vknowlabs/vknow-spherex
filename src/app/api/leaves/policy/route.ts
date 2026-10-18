import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { LeavePolicy, LeaveBalance } from "@/models";

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
        { success: false, error: "Only administrators can configure corporate leave policies." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { quotas, carryForwardLimit = 5, notes = "", applyToExisting = false } = body;

    if (!quotas) {
      return NextResponse.json({ success: false, error: "Quotas object is required." }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();

    const policy = await LeavePolicy.findOneAndUpdate(
      { year: currentYear },
      {
        $set: {
          quotas: {
            casualLeave: Math.max(0, Number(quotas.casualLeave) || 12),
            sickLeave: Math.max(0, Number(quotas.sickLeave) || 12),
            earnedLeave: Math.max(0, Number(quotas.earnedLeave) || 15),
            maternityLeave: Math.max(0, Number(quotas.maternityLeave) || 180),
            paternityLeave: Math.max(0, Number(quotas.paternityLeave) || 15),
            medicalLeave: Math.max(0, Number(quotas.medicalLeave) || 15),
          },
          carryForwardLimit: Math.max(0, Number(carryForwardLimit) || 5),
          notes,
          updatedBy: currentUser.id,
        },
      },
      { upsert: true, new: true }
    );

    // If applyToExisting is true or by default for employees without custom adjustments:
    // update all employee balances that are not customAdjusted
    await LeaveBalance.updateMany(
      { year: currentYear, customAdjusted: false },
      {
        $set: {
          "casualLeave.allocated": policy.quotas.casualLeave,
          "sickLeave.allocated": policy.quotas.sickLeave,
          "earnedLeave.allocated": policy.quotas.earnedLeave,
          "maternityLeave.allocated": policy.quotas.maternityLeave,
          "paternityLeave.allocated": policy.quotas.paternityLeave,
          "medicalLeave.allocated": policy.quotas.medicalLeave,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Corporate standard leave policy updated successfully and synced to employee rosters.",
      policy,
    });
  } catch (error: any) {
    console.error("Policy API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update corporate leave policy" },
      { status: 500 }
    );
  }
}
