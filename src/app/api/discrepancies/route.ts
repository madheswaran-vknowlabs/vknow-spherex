import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Discrepancy, Project, Stage, Task, Notification, User } from "@/models";
import { requireAuth } from "@/lib/auth";
import { createDiscrepancySchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const stageId = searchParams.get("stageId");
    const taskId = searchParams.get("taskId");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const type = searchParams.get("type");
    const raisedById = searchParams.get("raisedById");

    const query: any = {};

    if (projectId) query.projectId = projectId;
    if (stageId) query.stageId = stageId;
    if (taskId) query.taskId = taskId;
    if (status && status !== "ALL") query.status = status;
    if (severity && severity !== "ALL") query.severity = severity;
    if (type && type !== "ALL") query.type = type;
    if (raisedById) query.raisedById = raisedById;

    // RBAC: Non-admin users see discrepancies for projects they are assigned to or raised by them
    if (user.role !== "admin") {
      const userProjects = await Project.find({
        members: user.id,
        isArchived: false,
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);

      query.$or = [{ projectId: { $in: projectIds } }, { raisedById: user.id }];
    }

    const discrepancies = await Discrepancy.find(query)
      .populate("projectId", "name code health")
      .populate("stageId", "name order status")
      .populate("taskId", "title priority status")
      .populate("raisedById", "name email avatar department")
      .sort({ createdAt: -1 })
      .lean();

    // Summary metrics
    const stats = {
      total: discrepancies.length,
      open: discrepancies.filter((d) => d.status === "Open").length,
      inReview: discrepancies.filter((d) => d.status === "In Review").length,
      resolved: discrepancies.filter((d) => d.status === "Resolved" || d.status === "Closed").length,
      critical: discrepancies.filter((d) => d.severity === "Critical").length,
      high: discrepancies.filter((d) => d.severity === "High").length,
      scopeChanges: discrepancies.filter((d) => d.type === "Scope Change").length,
      effortOverruns: discrepancies.filter((d) => d.type === "Effort Overrun").length,
    };

    return NextResponse.json({
      success: true,
      data: discrepancies,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch discrepancies" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const body = await req.json();
    const validated = createDiscrepancySchema.parse(body);

    const project = await Project.findById(validated.projectId);
    if (!project || project.isArchived) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Role check: Admin or assigned project member
    if (user.role !== "admin") {
      const isMember = project.members.some((m) => m.toString() === user.id);
      if (!isMember) {
        return NextResponse.json(
          { success: false, error: "Permission denied. You are not a member of this project." },
          { status: 403 }
        );
      }
    }

    const discrepancy = await Discrepancy.create({
      projectId: validated.projectId,
      stageId: validated.stageId || null,
      taskId: validated.taskId || null,
      type: validated.type,
      severity: validated.severity,
      description: validated.description.trim(),
      raisedById: user.id,
      status: "Open",
    });

    // Notify Admins about the new discrepancy
    const admins = await User.find({ role: "admin", isActive: true }).select("_id");
    for (const admin of admins) {
      if (admin._id.toString() !== user.id) {
        await Notification.create({
          userId: admin._id,
          title: `Discrepancy Raised: ${validated.type} (${validated.severity})`,
          message: `${user.name} reported a ${validated.severity} discrepancy in '${project.name}': ${validated.description.slice(0, 80)}...`,
          type: "discrepancy_raised",
          link: `/discrepancies`,
        });
      }
    }

    // If attached to a task with an assignee, notify assignee
    if (validated.taskId) {
      const task = await Task.findById(validated.taskId);
      if (task && task.assigneeId && task.assigneeId.toString() !== user.id) {
        await Notification.create({
          userId: task.assigneeId,
          title: `Discrepancy on Task: ${task.title}`,
          message: `${user.name} raised a ${validated.type} discrepancy: '${validated.description.slice(0, 80)}...'`,
          type: "discrepancy_raised",
          link: `/projects/${project._id}`,
        });
      }
    }

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "CREATE",
      entityType: "Discrepancy",
      entityId: discrepancy._id.toString(),
      projectId: project._id,
      after: {
        type: discrepancy.type,
        severity: discrepancy.severity,
        description: discrepancy.description,
        taskId: discrepancy.taskId,
        stageId: discrepancy.stageId,
      },
      req,
    });

    const populated = await Discrepancy.findById(discrepancy._id)
      .populate("projectId", "name code health")
      .populate("stageId", "name order status")
      .populate("taskId", "title priority status")
      .populate("raisedById", "name email avatar department");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to raise discrepancy" },
      { status: error.status || 400 }
    );
  }
}
