import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Task, Project } from "@/models";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { syncProjectTracking } from "@/lib/lag-engine";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { startTime, endTime, hours, date, notes, percentComplete, status } = body;

    if (!hours || Number(hours) <= 0) {
      return NextResponse.json(
        { success: false, error: "Logged hours must be greater than 0" },
        { status: 400 }
      );
    }

    const task = await Task.findById(id);
    if (!task || task.isArchived) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Permission check: Admin, or member assigned/in project
    const isAssignee = task.assigneeId?.toString() === user.id;
    const isProjectMember = project.members?.some((m: any) => m.toString() === user.id);

    if (user.role !== "admin" && !isAssignee && !isProjectMember) {
      return NextResponse.json(
        { success: false, error: "You are not authorized to log time on this task." },
        { status: 403 }
      );
    }

    const beforeState = task.toObject();

    // 1. Update hours
    const addedHours = Number(hours);
    task.loggedHours = (task.loggedHours || 0) + addedHours;

    // 2. Update status & progress if specified
    if (status) {
      task.status = status;
      if (status === "Completed") {
        task.percentComplete = 100;
        if (!task.actualEndDate) task.actualEndDate = new Date();
      } else if (status === "In Progress" && !task.actualStartDate) {
        task.actualStartDate = new Date();
      }
    }

    if (percentComplete !== undefined && percentComplete !== null) {
      task.percentComplete = Math.min(100, Math.max(0, Number(percentComplete)));
      if (task.percentComplete === 100 && task.status !== "Completed") {
        task.status = "Completed";
        if (!task.actualEndDate) task.actualEndDate = new Date();
      }
    }

    // 3. Append to workLogs array
    if (!task.workLogs) {
      task.workLogs = [];
    }

    task.workLogs.push({
      userId: user.id as any,
      userName: user.name || "User",
      date: date ? new Date(date) : new Date(),
      startTime: startTime || "",
      endTime: endTime || "",
      hours: addedHours,
      notes: notes?.trim() || "",
      createdAt: new Date(),
    });

    await task.save();

    // 4. Synchronize project tracking and lag recomputation
    await syncProjectTracking(task.projectId);

    // 5. Audit Log
    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "UPDATE",
      entityType: "Task",
      entityId: task._id.toString(),
      projectId: task.projectId,
      before: beforeState,
      after: task.toObject(),
      req,
    });

    const updatedTask = await Task.findById(task._id)
      .populate("assigneeId", "name department email role")
      .populate("stageId", "name order status")
      .populate("blockedBy", "title status priority");

    return NextResponse.json({
      success: true,
      message: `Successfully logged ${addedHours}h on "${task.title}"`,
      data: updatedTask,
    });
  } catch (error: any) {
    console.error("Error in log-work endpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log work" },
      { status: 500 }
    );
  }
}
