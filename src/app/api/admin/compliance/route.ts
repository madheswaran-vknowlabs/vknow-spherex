import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User, Project, WeeklyUpdate } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const weekOffset = parseInt(searchParams.get("offset") || "0"); // 0 = current week, -1 = last week, etc.

    const targetDate = subWeeks(new Date(), -weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    const weekNumber = parseInt(
      new Intl.DateTimeFormat("en", { week: "numeric" } as any).format(weekStart) || "42"
    );
    const year = weekStart.getFullYear();

    // 1. Get all active standard users
    const users = await User.find({ isActive: true, role: "user" })
      .select("name email department avatar")
      .sort({ name: 1 })
      .lean();

    // 2. Get all weekly updates for this week
    const updates = await WeeklyUpdate.find({
      weekStartDate: { $gte: weekStart, $lte: weekEnd },
    })
      .populate("projectId", "name code")
      .lean();

    const userUpdateMap = new Map();
    for (const u of updates) {
      userUpdateMap.set(u.userId.toString(), u);
    }

    // 3. Match each user to their submission status
    const complianceRoster = users.map((u) => {
      const update = userUpdateMap.get(u._id.toString());
      let status: "Submitted" | "Late" | "Missing" = "Missing";
      if (update) {
        status = update.isLate ? "Late" : "Submitted";
      }

      return {
        user: u,
        status,
        update: update
          ? {
              _id: update._id,
              projectName: update.projectId?.name || "Project",
              projectCode: update.projectId?.code || "",
              hoursSpent: update.hoursSpent,
              submittedAt: update.submittedAt,
              workCompleted: update.workCompleted,
              blockers: update.blockers,
            }
          : null,
      };
    });

    const submittedCount = complianceRoster.filter((r) => r.status === "Submitted").length;
    const lateCount = complianceRoster.filter((r) => r.status === "Late").length;
    const missingCount = complianceRoster.filter((r) => r.status === "Missing").length;
    const totalUsers = complianceRoster.length;
    const complianceRate = totalUsers > 0 ? Math.round(((submittedCount + lateCount) / totalUsers) * 100) : 100;

    return NextResponse.json({
      success: true,
      data: {
        weekInfo: {
          weekNumber,
          year,
          weekStart,
          weekEnd,
          weekOffset,
        },
        metrics: {
          totalUsers,
          submittedCount,
          lateCount,
          missingCount,
          complianceRate,
        },
        roster: complianceRoster,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch compliance" },
      { status: error.status || 500 }
    );
  }
}
