import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Task, Project, WeeklyUpdate } from "@/models";
import { requireAuth } from "@/lib/auth";
import { startOfWeek, endOfWeek, isBefore, isAfter } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Fetch all active projects assigned to this user (or all active projects if admin)
    const projectQuery: any = { isArchived: false };
    if (user.role !== "admin") {
      projectQuery.members = user.id;
    }

    const [userTasks, assignedProjects, weeklyUpdatesThisWeek] = await Promise.all([
      Task.find({
        assigneeId: user.id,
        isArchived: false,
      })
        .populate("projectId", "name code health")
        .populate("stageId", "name order status")
        .populate("blockedBy", "title status priority")
        .sort({ plannedEndDate: 1 })
        .lean(),

      Project.find(projectQuery)
        .populate("currentStageId", "name order status percentComplete")
        .populate("members", "name email department role avatar")
        .sort({ updatedAt: -1 })
        .lean(),

      WeeklyUpdate.find({
        userId: user.id,
        weekStartDate: { $gte: currentWeekStart, $lte: currentWeekEnd },
      }).lean(),
    ]);

    // Categorize tasks
    const overdueTasks = userTasks.filter(
      (t) => t.status !== "Completed" && isBefore(new Date(t.plannedEndDate), now)
    );

    const dueThisWeekTasks = userTasks.filter(
      (t) =>
        t.status !== "Completed" &&
        isAfter(new Date(t.plannedEndDate), currentWeekStart) &&
        isBefore(new Date(t.plannedEndDate), currentWeekEnd)
    );

    const inProgressTasks = userTasks.filter((t) => t.status === "In Progress");
    const completedTasks = userTasks.filter((t) => t.status === "Completed");

    // Check weekly update compliance for the user for current week
    const currentWeekNumber = parseInt(
      new Intl.DateTimeFormat("en", { week: "numeric" } as any).format(currentWeekStart) || "42"
    );
    const currentYear = currentWeekStart.getFullYear();

    // Calculate total hours logged this week from weekly updates
    const hoursLoggedThisWeek = weeklyUpdatesThisWeek.reduce(
      (acc, u) => acc + (u.hoursSpent || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          overdueCount: overdueTasks.length,
          dueThisWeekCount: dueThisWeekTasks.length,
          inProgressCount: inProgressTasks.length,
          completedCount: completedTasks.length,
          totalAssigned: userTasks.length,
          hoursLoggedThisWeek,
          hasSubmittedWeeklyUpdate: weeklyUpdatesThisWeek.length > 0,
          currentWeekNumber,
          currentYear,
          assignedProjectsCount: assignedProjects.length,
        },
        overdueTasks,
        dueThisWeekTasks,
        inProgressTasks,
        allTasks: userTasks,
        assignedProjects,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch user tasks" },
      { status: error.status || 500 }
    );
  }
}
