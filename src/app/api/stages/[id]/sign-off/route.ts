import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Stage, Project, Notification } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { stageSignOffSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await connectDB();

    const body = await req.json();
    const validated = stageSignOffSchema.parse(body);

    const stage = await Stage.findById(id);
    if (!stage || stage.isArchived) {
      return NextResponse.json({ success: false, error: "Stage not found" }, { status: 404 });
    }

    const project = await Project.findById(stage.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const beforeState = stage.toObject();

    if (validated.approved) {
      // Must be marked Completed before Approved
      if (stage.status !== "Completed" && stage.percentComplete < 100) {
        return NextResponse.json(
          {
            success: false,
            error: "A stage cannot be Approved until it is marked Completed (100% progress).",
          },
          { status: 400 }
        );
      }

      stage.status = "Approved";
      stage.percentComplete = 100;
      if (!stage.actualEndDate) stage.actualEndDate = new Date();
      stage.signOff = {
        approvedBy: admin.id as any,
        approvedAt: new Date(),
        remarks: validated.remarks.trim(),
      };

      await stage.save();

      // Find next stage in sequence and activate if not started
      const nextStage = await Stage.findOne({
        projectId: stage.projectId,
        order: stage.order + 1,
        isArchived: false,
      });

      if (nextStage) {
        if (nextStage.status === "Not Started") {
          nextStage.status = "In Progress";
          nextStage.actualStartDate = new Date();
          await nextStage.save();
        }
        project.currentStageId = nextStage._id;
        await project.save();
      }

      // Notify project owner/members
      if (stage.ownerId) {
        await Notification.create({
          userId: stage.ownerId,
          title: `Stage Approved: ${stage.name}`,
          message: `${admin.name} approved sign-off for stage '${stage.name}' with remarks: "${validated.remarks}"`,
          type: "stage_approved",
          link: `/projects/${project._id}`,
        });
      }

      await logAuditEvent({
        actor: { userId: admin.id, name: admin.name, role: admin.role, email: admin.email },
        action: "STAGE_SIGN_OFF",
        entityType: "Stage",
        entityId: stage._id.toString(),
        projectId: project._id,
        before: beforeState,
        after: stage.toObject(),
        req,
      });

      return NextResponse.json({
        success: true,
        message: `Stage '${stage.name}' approved successfully`,
        data: stage,
      });
    } else {
      // Rejection
      stage.status = "In Progress";
      stage.signOff = {
        approvedBy: null,
        approvedAt: null,
        remarks: `REJECTED: ${validated.remarks.trim()}`,
      };

      await stage.save();

      if (stage.ownerId) {
        await Notification.create({
          userId: stage.ownerId,
          title: `Stage Sign-Off Rejected: ${stage.name}`,
          message: `${admin.name} rejected stage '${stage.name}': "${validated.remarks}"`,
          type: "stage_rejected",
          link: `/projects/${project._id}`,
        });
      }

      await logAuditEvent({
        actor: { userId: admin.id, name: admin.name, role: admin.role, email: admin.email },
        action: "STAGE_REJECT",
        entityType: "Stage",
        entityId: stage._id.toString(),
        projectId: project._id,
        before: beforeState,
        after: stage.toObject(),
        req,
      });

      return NextResponse.json({
        success: true,
        message: `Stage '${stage.name}' sign-off rejected. Returned to In Progress.`,
        data: stage,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process stage sign-off" },
      { status: error.status || 400 }
    );
  }
}
