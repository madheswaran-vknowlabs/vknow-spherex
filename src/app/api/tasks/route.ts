import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Task, Project, Stage, Notification } from "@/models";
import { requireAuth } from "@/lib/auth";
import { createTaskSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const stageId = searchParams.get("stageId");
    const assigneeId = searchParams.get("assigneeId");
    const status = searchParams.get("status");

    const query: any = { isArchived: false };

    if (projectId) query.projectId = projectId;
    if (stageId) query.stageId = stageId;
    if (assigneeId) query.assigneeId = assigneeId;
    if (status && status !== "ALL") query.status = status;

    // For non-admin, if no specific project requested, restrict to assigned tasks
    if (user.role !== "admin" && !projectId) {
      query.assigneeId = user.id;
    }

    const tasks = await Task.find(query)
      .populate("assigneeId", "name email avatar department")
      .populate("stageId", "name order status")
      .populate("projectId", "name code")
      .populate("blockedBy", "title status priority")
      .sort({ plannedStartDate: 1 })
      .lean();

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tasks" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const body = await req.json();
    const validated = createTaskSchema.parse(body);

    const project = await Project.findById(validated.projectId);
    if (!project || project.isArchived) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const stage = await Stage.findById(validated.stageId);
    if (!stage || stage.isArchived) {
      return NextResponse.json({ success: false, error: "Stage not found" }, { status: 404 });
    }

    // Role check: Admin or assigned project member
    if (user.role !== "admin") {
      const isMember = project.members.some((m) => m.toString() === user.id);
      if (!isMember) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
      }
    }

    const task = await Task.create({
      projectId: validated.projectId,
      stageId: validated.stageId,
      title: validated.title.trim(),
      description: validated.description || "",
      assigneeId: validated.assigneeId || null,
      priority: validated.priority,
      plannedStartDate: new Date(validated.plannedStartDate),
      plannedEndDate: new Date(validated.plannedEndDate),
      estimatedHours: validated.estimatedHours || 0,
      loggedHours: 0,
      percentComplete: 0,
      status: "To Do",
      blockedBy: validated.blockedBy || [],
      isAtRisk: false,
      lagInDays: 0,
      health: "Green",
      isArchived: false,
    });

    // Notify assignee if assigned to someone else
    if (validated.assigneeId && validated.assigneeId.toString() !== user.id) {
      await Notification.create({
        userId: validated.assigneeId,
        title: "New Task Assigned",
        message: `${user.name} assigned you task: '${task.title}' in project '${project.name}'.`,
        type: "task_assigned",
        link: `/projects/${project._id}`,
      });
    }

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "CREATE",
      entityType: "Task",
      entityId: task._id.toString(),
      projectId: project._id,
      after: {
        title: task.title,
        priority: task.priority,
        stageId: stage._id,
        assigneeId: task.assigneeId,
      },
      req,
    });

    const populated = await Task.findById(task._id)
      .populate("assigneeId", "name email avatar department")
      .populate("blockedBy", "title status priority");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create task" },
      { status: error.status || 400 }
    );
  }
}
