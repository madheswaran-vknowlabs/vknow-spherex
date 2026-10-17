import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User, WeeklyUpdate, Task, Project } from "@/models";
import { createNotification } from "@/lib/notifications";
import { startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const urlSecret = req.nextUrl.searchParams.get("key");
  if (urlSecret === cronSecret) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized cron access" }, { status: 401 });
  }

  try {
    await connectDB();

    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Active users
    const users = await User.find({ isActive: true, role: "user" }).lean();
    let remindersSent = 0;

    for (const user of users) {
      // Check if user has active assigned tasks
      const activeTaskCount = await Task.countDocuments({
        assigneeId: user._id,
        isArchived: false,
        status: { $ne: "Completed" },
      });

      if (activeTaskCount === 0) continue;

      // Check if user has filed a weekly update for this week
      const updateThisWeek = await WeeklyUpdate.findOne({
        userId: user._id,
        weekStartDate: { $gte: currentWeekStart, $lte: currentWeekEnd },
      }).lean();

      if (!updateThisWeek) {
        await createNotification({
          userId: String(user._id),
          title: "Weekly Update Reminder",
          message: `You have ${activeTaskCount} active deliverable(s) awaiting your weekly progress update. Filing takes under 2 minutes.`,
          type: "weekly_reminder",
          link: "/my-work",
          emailNotify: true,
        });
        remindersSent++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Weekly update reminders dispatched to ${remindersSent} team member(s)`,
      data: { remindersSent },
    });
  } catch (error: any) {
    console.error("CRON_REMINDERS_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch reminders" },
      { status: 500 }
    );
  }
}
