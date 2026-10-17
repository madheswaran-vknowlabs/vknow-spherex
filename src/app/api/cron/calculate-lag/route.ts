import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Stage, Task, Setting } from "@/models";
import { createNotification } from "@/lib/notifications";
import { differenceInDays, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Dev fallback

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
    const settings = await Setting.findOne().lean();
    const warningDays = settings?.lagThresholds?.warningDays || 2;
    const criticalDays = settings?.lagThresholds?.criticalDays || 5;

    const today = startOfDay(new Date());

    // 1. Process Tasks
    const activeTasks = await Task.find({ isArchived: false, status: { $ne: "Completed" } });
    let tasksUpdated = 0;
    const slippedTaskIds = new Set<string>();

    for (const task of activeTasks) {
      if (!task.plannedEndDate) continue;
      const plannedEnd = startOfDay(new Date(task.plannedEndDate));
      let lag = 0;

      if (today > plannedEnd) {
        lag = differenceInDays(today, plannedEnd);
      }

      let health: "Green" | "Amber" | "Red" = "Green";
      if (lag > criticalDays) health = "Red";
      else if (lag > warningDays) health = "Amber";

      const hadLagBefore = (task.lagInDays || 0) > 0;
      task.lagInDays = lag;
      task.health = health;

      if (lag > 0) {
        slippedTaskIds.add(String(task._id));
        if (!hadLagBefore && task.assigneeId) {
          // Notify assignee of overdue task
          await createNotification({
            userId: String(task.assigneeId),
            title: `Task Overdue: ${task.title}`,
            message: `Your task "${task.title}" is ${lag} day(s) past its planned completion date.`,
            type: "task_overdue",
            link: "/my-work",
            emailNotify: true,
          });
        }
      }

      await task.save();
      tasksUpdated++;
    }

    // 2. Cascade "At Risk" to Dependent Tasks
    const pendingDependentTasks = await Task.find({
      isArchived: false,
      status: { $ne: "Completed" },
      blockedBy: { $exists: true, $not: { $size: 0 } },
    });

    for (const depTask of pendingDependentTasks) {
      const isBlockedBySlipped = depTask.blockedBy.some((bId: any) =>
        slippedTaskIds.has(String(bId))
      );

      if (isBlockedBySlipped && !depTask.isAtRisk) {
        depTask.isAtRisk = true;
        await depTask.save();

        if (depTask.assigneeId) {
          await createNotification({
            userId: String(depTask.assigneeId),
            title: `Dependency Slipped: ${depTask.title}`,
            message: `A prerequisite deliverable has slipped, placing "${depTask.title}" at risk.`,
            type: "dependency_slipped",
            link: "/my-work",
            emailNotify: false,
          });
        }
      } else if (!isBlockedBySlipped && depTask.isAtRisk) {
        depTask.isAtRisk = false;
        await depTask.save();
      }
    }

    // 3. Process Stages & Projects
    const projects = await Project.find({ isArchived: false, status: "Active" });
    let projectsUpdated = 0;

    for (const project of projects) {
      const projectStages = await Stage.find({ projectId: project._id, isArchived: false });
      let projMaxLag = 0;

      for (const stg of projectStages) {
        if (!stg.plannedEndDate || stg.status === "Approved" || stg.status === "Completed") continue;
        const stgEnd = startOfDay(new Date(stg.plannedEndDate));
        let stgLag = 0;
        if (today > stgEnd) {
          stgLag = differenceInDays(today, stgEnd);
        }
        stg.lagInDays = stgLag;
        if (stgLag > criticalDays) stg.health = "Red";
        else if (stgLag > warningDays) stg.health = "Amber";
        else stg.health = "Green";
        await stg.save();

        if (stgLag > projMaxLag) projMaxLag = stgLag;
      }

      project.lagInDays = projMaxLag;
      if (projMaxLag > criticalDays) project.health = "Red";
      else if (projMaxLag > warningDays) project.health = "Amber";
      else project.health = "Green";

      await project.save();
      projectsUpdated++;
    }

    return NextResponse.json({
      success: true,
      message: "Daily lag calculation and dependency cascade completed successfully",
      data: {
        tasksProcessed: tasksUpdated,
        projectsProcessed: projectsUpdated,
        slippedCount: slippedTaskIds.size,
      },
    });
  } catch (error: any) {
    console.error("CRON_CALCULATE_LAG_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate work lag" },
      { status: 500 }
    );
  }
}
