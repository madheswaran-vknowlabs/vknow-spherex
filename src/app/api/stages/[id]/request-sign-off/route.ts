import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Stage, Project, User, Notification } from "@/models";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await connectDB();

    const stage = await Stage.findById(id);
    if (!stage || stage.isArchived) {
      return NextResponse.json({ success: false, error: "Stage not found" }, { status: 404 });
    }

    const project = await Project.findById(stage.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Determine the required manager:
    // 1. Check if the current user has a specific manager assigned
    const currentUserDoc = await User.findById(user.id);
    let targetManager = null;

    if (currentUserDoc?.managerId) {
      targetManager = await User.findOne({ _id: currentUserDoc.managerId, isActive: true });
    }

    // 2. If not found, look for a manager assigned to the project members
    if (!targetManager && project.members?.length > 0) {
      targetManager = await User.findOne({
        _id: { $in: project.members },
        role: "manager",
        isActive: true,
      });
    }

    // 3. Fallback to any active manager in the organization
    if (!targetManager) {
      targetManager = await User.findOne({ role: "manager", isActive: true });
    }

    // 4. Fallback to admin if no manager exists
    if (!targetManager) {
      targetManager = await User.findOne({ role: "admin", isActive: true });
    }

    if (!targetManager) {
      return NextResponse.json(
        { success: false, error: "No manager found to route sign-off approval request." },
        { status: 404 }
      );
    }

    const beforeState = stage.toObject();

    // Update stage sign-off status to pending_approval
    const currentSignOff = stage.signOff
      ? typeof (stage.signOff as any).toObject === "function"
        ? (stage.signOff as any).toObject()
        : stage.signOff
      : {};

    stage.signOff = {
      ...currentSignOff,
      status: "pending_approval",
      requestedBy: user.id as any,
      requestedAt: new Date(),
    };

    await stage.save();

    // Create notification EXCLUSIVELY for the required manager
    await Notification.create({
      userId: targetManager._id,
      title: `Stage Sign-Off Approval Required: ${stage.name}`,
      message: `${user.name} has requested formal sign-off approval for Stage #${stage.order}: ${stage.name} on project "${project.name}".`,
      type: "stage_approval_needed",
      link: `/projects/${project._id}`,
    });

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "STAGE_SIGN_OFF_REQUESTED",
      entityType: "Stage",
      entityId: stage._id.toString(),
      projectId: project._id,
      before: beforeState,
      after: stage.toObject(),
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Sign-off approval request successfully sent to manager ${targetManager.name}`,
      data: {
        stageId: stage._id,
        managerName: targetManager.name,
        managerEmail: targetManager.email,
        status: "pending_approval",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to request stage sign-off" },
      { status: error.status || 500 }
    );
  }
}
