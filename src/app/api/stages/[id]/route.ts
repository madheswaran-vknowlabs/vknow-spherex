import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Stage, Project } from "@/models";
import { requireAuth } from "@/lib/auth";
import { updateStageSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";

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
    const validated = updateStageSchema.parse(body);

    const stage = await Stage.findById(id);
    if (!stage || stage.isArchived) {
      return NextResponse.json({ success: false, error: "Stage not found" }, { status: 404 });
    }

    const project = await Project.findById(stage.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Role check: Admin or assigned project member
    if (user.role !== "admin") {
      const isMember = project.members.some((m) => m.toString() === user.id);
      if (!isMember) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
      }
    }

    const beforeState = stage.toObject();

    if (validated.name) stage.name = validated.name;
    if (validated.ownerId !== undefined) stage.ownerId = validated.ownerId ? (validated.ownerId as any) : null;
    if (validated.plannedStartDate) stage.plannedStartDate = new Date(validated.plannedStartDate);
    if (validated.plannedEndDate) stage.plannedEndDate = new Date(validated.plannedEndDate);
    if (validated.actualStartDate !== undefined)
      stage.actualStartDate = validated.actualStartDate ? new Date(validated.actualStartDate) : null;
    if (validated.actualEndDate !== undefined)
      stage.actualEndDate = validated.actualEndDate ? new Date(validated.actualEndDate) : null;
    if (validated.percentComplete !== undefined) stage.percentComplete = validated.percentComplete;
    if (validated.notes !== undefined) stage.notes = validated.notes;

    // Status changes
    if (validated.status) {
      // Cannot manually set to Approved without sign-off endpoint
      if (validated.status === "Approved" && stage.status !== "Approved") {
        return NextResponse.json(
          { success: false, error: "Stage approval requires formal Admin Sign-off." },
          { status: 400 }
        );
      }
      stage.status = validated.status as any;
      if (validated.status === "Completed") {
        stage.percentComplete = 100;
        if (!stage.actualEndDate) stage.actualEndDate = new Date();
      }
    }

    await stage.save();

    // Recalculate project total progress from all 8 stages
    const allStages = await Stage.find({ projectId: stage.projectId, isArchived: false }).lean();
    const totalProgress = Math.round(
      allStages.reduce((acc, s) => acc + (s.percentComplete || 0), 0) / allStages.length
    );
    project.progress = totalProgress;
    await project.save();

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: validated.status && validated.status !== beforeState.status ? "STATUS_CHANGE" : "UPDATE",
      entityType: "Stage",
      entityId: stage._id.toString(),
      projectId: project._id,
      before: beforeState,
      after: stage.toObject(),
      req,
    });

    return NextResponse.json({ success: true, data: stage });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update stage" },
      { status: error.status || 400 }
    );
  }
}
