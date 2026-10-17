import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Discrepancy, Notification, Project } from "@/models";
import { requireAuth } from "@/lib/auth";
import { resolveDiscrepancySchema } from "@/types/schemas";
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

    const discrepancy = await Discrepancy.findById(id)
      .populate("projectId", "name code health members")
      .populate("stageId", "name order status")
      .populate("taskId", "title priority status")
      .populate("raisedById", "name email avatar department")
      .lean();

    if (!discrepancy) {
      return NextResponse.json({ success: false, error: "Discrepancy not found" }, { status: 404 });
    }

    // RBAC: Admin or member of project or creator
    if (user.role !== "admin") {
      const isMember = (discrepancy.projectId as any)?.members?.some(
        (m: any) => m.toString() === user.id
      );
      const isCreator = (discrepancy.raisedById as any)?._id?.toString() === user.id;

      if (!isMember && !isCreator) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: discrepancy });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch discrepancy" },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    await connectDB();

    const discrepancy = await Discrepancy.findById(id);
    if (!discrepancy) {
      return NextResponse.json({ success: false, error: "Discrepancy not found" }, { status: 404 });
    }

    const project = await Project.findById(discrepancy.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Role check: Admin or project member
    if (user.role !== "admin") {
      const isMember = project.members.some((m) => m.toString() === user.id);
      if (!isMember && discrepancy.raisedById.toString() !== user.id) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
      }
    }

    const body = await req.json();
    const validated = resolveDiscrepancySchema.parse(body);
    const beforeState = discrepancy.toObject();

    discrepancy.status = validated.status;
    discrepancy.resolution = validated.resolution.trim();
    if (validated.status === "Resolved" || validated.status === "Closed") {
      discrepancy.resolutionDate = new Date();
    }

    await discrepancy.save();

    // Notify the user who raised it
    if (discrepancy.raisedById.toString() !== user.id) {
      await Notification.create({
        userId: discrepancy.raisedById,
        title: `Discrepancy ${validated.status}: ${discrepancy.type}`,
        message: `${user.name} marked your discrepancy as ${validated.status}: "${validated.resolution.slice(0, 100)}..."`,
        type: "discrepancy_resolved",
        link: `/discrepancies`,
      });
    }

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "UPDATE",
      entityType: "Discrepancy",
      entityId: discrepancy._id.toString(),
      projectId: discrepancy.projectId,
      before: beforeState,
      after: discrepancy.toObject(),
      req,
    });

    const populated = await Discrepancy.findById(discrepancy._id)
      .populate("projectId", "name code health")
      .populate("stageId", "name order status")
      .populate("taskId", "title priority status")
      .populate("raisedById", "name email avatar department");

    return NextResponse.json({
      success: true,
      message: `Discrepancy marked as ${validated.status}`,
      data: populated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update discrepancy" },
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

    if (user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin role required" }, { status: 403 });
    }

    const discrepancy = await Discrepancy.findById(id);
    if (!discrepancy) {
      return NextResponse.json({ success: false, error: "Discrepancy not found" }, { status: 404 });
    }

    const beforeState = discrepancy.toObject();
    await Discrepancy.findByIdAndDelete(id);

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "DELETE",
      entityType: "Discrepancy",
      entityId: id,
      projectId: discrepancy.projectId,
      before: beforeState,
      after: null,
      req,
    });

    return NextResponse.json({ success: true, message: "Discrepancy removed successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete discrepancy" },
      { status: error.status || 500 }
    );
  }
}
