import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Task, Stage, Project } from "@/models";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { syncProjectTracking } from "@/lib/lag-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const body = await req.json();
    const { taskId, status, progress, addHours, notes } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
    }

    const task = await Task.findById(taskId);
    if (!task || task.isArchived) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    // Role check: Admin or the assigned user
    if (user.role !== "admin" && task.assigneeId?.toString() !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only update your own assigned tasks." },
        { status: 403 }
      );
    }

    const beforeState = task.toObject();

    if (status) {
      task.status = status;
      if (status === "Completed") {
        task.percentComplete = 100;
        if (!task.actualEndDate) task.actualEndDate = new Date();
      } else if (status === "In Progress" && !task.actualStartDate) {
        task.actualStartDate = new Date();
      }
    }

    if (progress !== undefined) {
      task.percentComplete = Math.min(100, Math.max(0, Number(progress)));
      if (task.percentComplete === 100 && task.status !== "Completed") {
        task.status = "Completed";
        if (!task.actualEndDate) task.actualEndDate = new Date();
      }
    }

    if (addHours && Number(addHours) > 0) {
      task.loggedHours = (task.loggedHours || 0) + Number(addHours);
    }

    await task.save();

    // Recompute lag, at-risk flags, stage & project tracking
    await syncProjectTracking(task.projectId);

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: status && status !== beforeState.status ? "STATUS_CHANGE" : "UPDATE",
      entityType: "Task",
      entityId: task._id.toString(),
      projectId: task.projectId,
      before: beforeState,
      after: task.toObject(),
      req,
    });

    const updatedTask = await Task.findById(task._id)
      .populate("projectId", "name code health")
      .populate("stageId", "name order status")
      .populate("blockedBy", "title status priority");

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update task" },
      { status: error.status || 400 }
    );
  }
}
