import { differenceInCalendarDays, isAfter } from "date-fns";
import mongoose from "mongoose";
import { Setting, Task, Stage, Project, Notification } from "@/models";
import { HealthStatus } from "@/types/models";

export interface LagThresholds {
  lagWarningThresholdDays: number;
  lagCriticalThresholdDays: number;
}

export interface EffortVariance {
  estimatedHours: number;
  loggedHours: number;
  varianceHours: number;
  variancePercent: number;
  status: "Over Budget" | "Under Budget" | "On Track";
}

/**
 * Fetch configured lag thresholds from settings, falling back to defaults (2 warning, 5 critical)
 */
export async function getLagThresholds(): Promise<LagThresholds> {
  const setting = await Setting.findOne().lean();
  return {
    lagWarningThresholdDays: setting?.lagWarningThresholdDays ?? 2,
    lagCriticalThresholdDays: setting?.lagCriticalThresholdDays ?? 5,
  };
}

/**
 * Compute lag in calendar days and health status for an individual task
 */
export function calculateTaskLagAndHealth(
  task: {
    status: string;
    plannedStartDate: Date | string;
    plannedEndDate: Date | string;
    actualStartDate?: Date | string | null;
    actualEndDate?: Date | string | null;
    percentComplete?: number;
    updatedAt?: Date | string;
  },
  thresholds: LagThresholds = { lagWarningThresholdDays: 2, lagCriticalThresholdDays: 5 }
): { lagInDays: number; health: HealthStatus; isSlipping: boolean } {
  const plannedEnd = new Date(task.plannedEndDate);
  const now = new Date();

  let effectiveEnd: Date;

  if (task.status === "Completed") {
    effectiveEnd = task.actualEndDate
      ? new Date(task.actualEndDate)
      : task.updatedAt
      ? new Date(task.updatedAt)
      : now;
  } else {
    // If incomplete and past planned end date, current date serves as forecast minimum
    if (isAfter(now, plannedEnd)) {
      effectiveEnd = task.actualEndDate ? new Date(task.actualEndDate) : now;
    } else {
      effectiveEnd = task.actualEndDate ? new Date(task.actualEndDate) : plannedEnd;
    }
  }

  const rawDiff = differenceInCalendarDays(effectiveEnd, plannedEnd);
  const lagInDays = Math.max(0, rawDiff);

  let health: HealthStatus = "Green";
  if (lagInDays >= thresholds.lagCriticalThresholdDays) {
    health = "Red";
  } else if (lagInDays >= thresholds.lagWarningThresholdDays) {
    health = "Amber";
  } else {
    health = "Green";
  }

  return {
    lagInDays,
    health,
    isSlipping: lagInDays > 0,
  };
}

/**
 * Compute effort variance between estimated and logged hours
 */
export function calculateEffortVariance(
  estimatedHours: number = 0,
  loggedHours: number = 0
): EffortVariance {
  const varianceHours = Math.round((loggedHours - estimatedHours) * 10) / 10;
  const variancePercent =
    estimatedHours > 0
      ? Math.round(((loggedHours - estimatedHours) / estimatedHours) * 100)
      : loggedHours > 0
      ? 100
      : 0;

  let status: EffortVariance["status"] = "On Track";
  if (varianceHours > 0) {
    status = "Over Budget";
  } else if (varianceHours < 0) {
    status = "Under Budget";
  }

  return {
    estimatedHours,
    loggedHours,
    varianceHours,
    variancePercent,
    status,
  };
}

/**
 * Full project tracking recalculation:
 * 1. Computes lag and health for all tasks.
 * 2. Checks predecessor task delays & marks downstream dependents as "At Risk" with notifications.
 * 3. Aggregates stage-level progress, lag, and health.
 * 4. Aggregates project-level progress, lag, and overall health (Green / Amber / Red).
 */
export async function syncProjectTracking(
  projectId: string | mongoose.Types.ObjectId
): Promise<{
  projectHealth: HealthStatus;
  projectLag: number;
  projectProgress: number;
  tasksUpdated: number;
  stagesUpdated: number;
}> {
  const pId = new mongoose.Types.ObjectId(projectId.toString());
  const thresholds = await getLagThresholds();
  const now = new Date();

  // 1. Fetch all active tasks
  const tasks = await Task.find({ projectId: pId, isArchived: false });
  const taskMap = new Map<string, any>();
  tasks.forEach((t) => taskMap.set(t._id.toString(), t));

  // Compute baseline lag & health for all tasks
  for (const task of tasks) {
    const { lagInDays, health } = calculateTaskLagAndHealth(task, thresholds);
    task.lagInDays = lagInDays;
    task.health = health;
  }

  // 2. Dependency & At Risk cascade:
  // "When a task slips, automatically mark dependent tasks as 'At Risk'."
  let tasksUpdatedCount = 0;
  for (const task of tasks) {
    const previousAtRisk = task.isAtRisk;
    let hasSlippingBlocker = false;
    let blockingSlipDescription = "";

    if (task.blockedBy && task.blockedBy.length > 0) {
      for (const blockerRef of task.blockedBy) {
        const blockerId = blockerRef.toString();
        const blocker = taskMap.get(blockerId);
        if (blocker) {
          const isBlockerSlipping =
            blocker.lagInDays > 0 ||
            blocker.status === "Blocked" ||
            blocker.health === "Red" ||
            (blocker.status !== "Completed" && isAfter(now, blocker.plannedEndDate));

          if (isBlockerSlipping) {
            hasSlippingBlocker = true;
            blockingSlipDescription = blocker.title;
            break;
          }
        }
      }
    }

    // Set or clear at risk
    task.isAtRisk = hasSlippingBlocker;

    // If at risk and health was Green, elevate to Amber
    if (task.isAtRisk && task.health === "Green") {
      task.health = "Amber";
    }

    // If newly marked at risk and has assignee, dispatch notification
    if (!previousAtRisk && task.isAtRisk && task.assigneeId) {
      await Notification.create({
        userId: task.assigneeId,
        title: "Task At Risk: Dependency Slipped",
        message: `Task '${task.title}' is now At Risk because predecessor '${blockingSlipDescription}' has slipped.`,
        type: "dependency_slipped",
        link: `/projects/${pId.toString()}`,
      });
    }

    await task.save();
    tasksUpdatedCount++;
  }

  // 3. Stage roll-up:
  const stages = await Stage.find({ projectId: pId, isArchived: false }).sort({ order: 1 });
  let stagesUpdatedCount = 0;

  for (const stage of stages) {
    const stageTasks = tasks.filter((t) => t.stageId.toString() === stage._id.toString());
    const stagePlannedEnd = new Date(stage.plannedEndDate);

    // Calculate percent complete
    if (stageTasks.length > 0) {
      const avgProgress = Math.round(
        stageTasks.reduce((acc, t) => acc + (t.percentComplete || 0), 0) / stageTasks.length
      );
      stage.percentComplete = avgProgress;
      if (avgProgress === 100 && stage.status !== "Approved") {
        stage.status = "Completed";
        if (!stage.actualEndDate) stage.actualEndDate = now;
      }
    }

    // Effective end date of stage
    let stageEffectiveEnd: Date;
    if (stage.status === "Completed" || stage.status === "Approved") {
      stageEffectiveEnd = stage.actualEndDate ? new Date(stage.actualEndDate) : stagePlannedEnd;
    } else {
      if (isAfter(now, stagePlannedEnd)) {
        stageEffectiveEnd = now;
      } else {
        stageEffectiveEnd = stagePlannedEnd;
      }

      // If any incomplete task in this stage has a forecast end date beyond stageEffectiveEnd
      for (const st of stageTasks) {
        if (st.status !== "Completed") {
          const taskEffective = st.actualEndDate ? new Date(st.actualEndDate) : new Date(st.plannedEndDate);
          if (isAfter(taskEffective, stageEffectiveEnd)) {
            stageEffectiveEnd = taskEffective;
          }
        }
      }
    }

    const stageLag = Math.max(0, differenceInCalendarDays(stageEffectiveEnd, stagePlannedEnd));
    stage.lagInDays = stageLag;

    // Determine stage health
    const hasRedTask = stageTasks.some((t) => t.health === "Red" && t.status !== "Completed");
    const hasAmberTask = stageTasks.some((t) => t.health === "Amber" && t.status !== "Completed");

    if (hasRedTask || stageLag >= thresholds.lagCriticalThresholdDays) {
      stage.health = "Red";
    } else if (hasAmberTask || stageLag >= thresholds.lagWarningThresholdDays || stage.status === "Blocked") {
      stage.health = "Amber";
    } else {
      stage.health = "Green";
    }

    await stage.save();
    stagesUpdatedCount++;
  }

  // 4. Project roll-up:
  const project = await Project.findById(pId);
  if (!project) {
    return {
      projectHealth: "Green",
      projectLag: 0,
      projectProgress: 0,
      tasksUpdated: tasksUpdatedCount,
      stagesUpdated: stagesUpdatedCount,
    };
  }

  const projPlannedEnd = new Date(project.plannedEndDate);
  let projectEffectiveEnd = projPlannedEnd;

  // Max forecast end among all active/pending stages
  for (const stg of stages) {
    if (stg.status !== "Approved" && stg.status !== "Completed") {
      const stgEnd = stg.actualEndDate ? new Date(stg.actualEndDate) : new Date(stg.plannedEndDate);
      if (isAfter(stgEnd, projectEffectiveEnd)) {
        projectEffectiveEnd = stgEnd;
      }
    }
  }

  if (project.status !== "Completed" && isAfter(now, projPlannedEnd) && isAfter(now, projectEffectiveEnd)) {
    projectEffectiveEnd = now;
  }

  const projectLag = Math.max(0, differenceInCalendarDays(projectEffectiveEnd, projPlannedEnd));
  project.lagInDays = projectLag;

  // Project progress
  if (stages.length > 0) {
    project.progress = Math.round(
      stages.reduce((acc, s) => acc + (s.percentComplete || 0), 0) / stages.length
    );
  }

  // Project health
  const hasRedStage = stages.some((s) => s.health === "Red" && s.status !== "Approved");
  const hasAmberStage = stages.some((s) => s.health === "Amber" && s.status !== "Approved");

  if (hasRedStage || projectLag >= thresholds.lagCriticalThresholdDays) {
    project.health = "Red";
  } else if (hasAmberStage || projectLag >= thresholds.lagWarningThresholdDays || project.status === "On Hold") {
    project.health = "Amber";
  } else {
    project.health = "Green";
  }

  await project.save();

  return {
    projectHealth: project.health,
    projectLag: project.lagInDays,
    projectProgress: project.progress,
    tasksUpdated: tasksUpdatedCount,
    stagesUpdated: stagesUpdatedCount,
  };
}
