import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Task, Stage, Project, Notification, Setting } from "@/models";
import { requireAuth } from "@/lib/auth";
import { updateTaskSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";
import { syncProjectTracking } from "@/lib/lag-engine";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await connectDB();

    const body = await req.json();
    const validated = updateTaskSchema.parse(body);

    const task = await Task.findById(id);
    if (!task || task.isArchived) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const beforeState = task.toObject();

    if (validated.title) task.title = validated.title.trim();
    if (validated.description !== undefined) task.description = validated.description;
    if (validated.assigneeId !== undefined) task.assigneeId = validated.assigneeId ? (validated.assigneeId as any) : null;
    if (validated.priority) task.priority = validated.priority;
    if (validated.plannedStartDate) task.plannedStartDate = new Date(validated.plannedStartDate);
    if (validated.plannedEndDate) task.plannedEndDate = new Date(validated.plannedEndDate);
    if (validated.actualStartDate !== undefined)
      task.actualStartDate = validated.actualStartDate ? new Date(validated.actualStartDate) : null;
    if (validated.actualEndDate !== undefined)
      task.actualEndDate = validated.actualEndDate ? new Date(validated.actualEndDate) : null;
    if (validated.estimatedHours !== undefined) task.estimatedHours = validated.estimatedHours;
    if (validated.loggedHours !== undefined) task.loggedHours = validated.loggedHours;
    if (validated.percentComplete !== undefined) task.percentComplete = validated.percentComplete;
    if (validated.blockedBy !== undefined) task.blockedBy = validated.blockedBy as any;

    if (validated.status) {
      task.status = validated.status;
      if (validated.status === "Completed") {
        task.percentComplete = 100;
        if (!task.actualEndDate) task.actualEndDate = new Date();
      } else if (validated.status === "In Progress" && !task.actualStartDate) {
        task.actualStartDate = new Date();
      }
    }

    await task.save();

    // Trigger full tracking sync: lag, at-risk dependency cascade, stage & project rollups
    await syncProjectTracking(task.projectId);

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: validated.status && validated.status !== beforeState.status ? "STATUS_CHANGE" : "UPDATE",
      entityType: "Task",
      entityId: task._id.toString(),
      projectId: task.projectId,
      before: beforeState,
      after: task.toObject(),
      req,
    });

    const updated = await Task.findById(task._id)
      .populate("assigneeId", "name email avatar department")
      .populate("blockedBy", "title status priority");

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update task" },
      { status: error.status || 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await connectDB();

    const task = await Task.findById(id);
    if (!task || task.isArchived) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const canDelete =
      user.role === "admin" ||
      user.role === "manager" ||
      (task.assigneeId && task.assigneeId.toString() === user.id);

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to delete this deliverable" },
        { status: 403 }
      );
    }

    task.isArchived = true;
    await task.save();

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "DELETE",
      entityType: "Task",
      entityId: task._id.toString(),
      projectId: task.projectId,
      before: { title: task.title, status: task.status },
      after: { isArchived: true },
      req,
    });

    return NextResponse.json({ success: true, message: "Task archived successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete task" },
      { status: error.status || 500 }
    );
  }
}
