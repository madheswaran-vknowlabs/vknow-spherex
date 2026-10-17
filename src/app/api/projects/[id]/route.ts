import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Stage, Task, Discrepancy } from "@/models";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { updateProjectSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await connectDB();

    const project = await Project.findOne({ _id: id, isArchived: false })
      .populate("members", "name email avatar department role")
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Role check for regular users
    if (user.role !== "admin") {
      const isMember = project.members.some(
        (m: any) => m._id.toString() === user.id
      );
      if (!isMember) {
        return NextResponse.json(
          { success: false, error: "Access denied. You are not a member of this project." },
          { status: 403 }
        );
      }
    }

    // Fetch stages, tasks, and discrepancies in parallel
    const [stages, tasks, discrepancies] = await Promise.all([
      Stage.find({ projectId: id, isArchived: false })
        .populate("ownerId", "name email avatar department")
        .populate("signOff.approvedBy", "name email role")
        .sort({ order: 1 })
        .lean(),
      Task.find({ projectId: id, isArchived: false })
        .populate("assigneeId", "name email avatar department")
        .populate("blockedBy", "title status priority")
        .sort({ plannedStartDate: 1 })
        .lean(),
      Discrepancy.find({ projectId: id })
        .populate("raisedById", "name email avatar")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        project,
        stages,
        tasks,
        discrepancies,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch project" },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    await connectDB();

    const body = await req.json();
    const validated = updateProjectSchema.parse(body);

    const project = await Project.findOne({ _id: id, isArchived: false });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const beforeState = project.toObject();

    if (validated.name) project.name = validated.name;
    if (validated.code) project.code = validated.code.toUpperCase();
    if (validated.description !== undefined) project.description = validated.description;
    if (validated.client !== undefined) project.client = validated.client;
    if (validated.status) project.status = validated.status as any;
    if (validated.plannedStartDate) project.plannedStartDate = new Date(validated.plannedStartDate);
    if (validated.plannedEndDate) project.plannedEndDate = new Date(validated.plannedEndDate);
    if (validated.actualStartDate !== undefined)
      project.actualStartDate = validated.actualStartDate ? new Date(validated.actualStartDate) : null;
    if (validated.actualEndDate !== undefined)
      project.actualEndDate = validated.actualEndDate ? new Date(validated.actualEndDate) : null;
    if (validated.members) project.members = validated.members as any;

    await project.save();

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "UPDATE",
      entityType: "Project",
      entityId: project._id.toString(),
      projectId: project._id,
      before: beforeState,
      after: project.toObject(),
      req,
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update project" },
      { status: error.status || 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();
    const { id } = await params;
    await connectDB();

    const project = await Project.findOne({ _id: id, isArchived: false });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    project.isArchived = true;
    await project.save();

    // Soft delete associated stages and tasks
    await Promise.all([
      Stage.updateMany({ projectId: id }, { isArchived: true }),
      Task.updateMany({ projectId: id }, { isArchived: true }),
    ]);

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "DELETE",
      entityType: "Project",
      entityId: project._id.toString(),
      projectId: project._id,
      before: { name: project.name, code: project.code },
      after: { isArchived: true },
      req,
    });

    return NextResponse.json({ success: true, message: "Project archived successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to archive project" },
      { status: error.status || 500 }
    );
  }
}
