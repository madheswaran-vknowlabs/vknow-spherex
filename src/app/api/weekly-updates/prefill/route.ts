import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Task, WeeklyUpdate } from "@/models";
import { requireAuth } from "@/lib/auth";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const selectedProjectId = searchParams.get("projectId");

    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekNumber = parseInt(
      new Intl.DateTimeFormat("en", { week: "numeric" } as any).format(currentWeekStart) || "42"
    );
    const year = currentWeekStart.getFullYear();

    // 1. Get user's assigned projects
    const query = user.role === "admin" ? { isArchived: false } : { members: user.id, isArchived: false };
    const projects = await Project.find(query).select("name code client health").sort({ name: 1 }).lean();

    const targetProjectId = selectedProjectId || (projects.length > 0 ? projects[0]._id.toString() : null);

    // 2. Get active tasks for this user in the target project
    let activeTasks: any[] = [];
    if (targetProjectId) {
      activeTasks = await Task.find({
        projectId: targetProjectId,
        assigneeId: user.id,
        isArchived: false,
        status: { $ne: "Completed" },
      })
        .select("title priority status percentComplete estimatedHours loggedHours plannedEndDate")
        .sort({ plannedEndDate: 1 })
        .lean();
    }

    // 3. Get last week's update for "Same as last week" feature
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const lastWeekUpdate = targetProjectId
      ? await WeeklyUpdate.findOne({
          userId: user.id,
          projectId: targetProjectId,
          weekStartDate: { $gte: lastWeekStart, $lte: lastWeekEnd },
        }).lean()
      : null;

    // 4. Check if current week update is already submitted
    const existingSubmission = targetProjectId
      ? await WeeklyUpdate.findOne({
          userId: user.id,
          projectId: targetProjectId,
          weekStartDate: { $gte: currentWeekStart, $lte: currentWeekEnd },
        }).lean()
      : null;

    return NextResponse.json({
      success: true,
      data: {
        projects,
        currentWeek: {
          weekStartDate: currentWeekStart,
          weekEndDate: currentWeekEnd,
          weekNumber,
          year,
        },
        activeTasks,
        lastWeekUpdate,
        existingSubmission,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prefill data" },
      { status: error.status || 500 }
    );
  }
}
