import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project } from "@/models";
import { requireAuth } from "@/lib/auth";
import { syncProjectTracking } from "@/lib/lag-engine";
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

    const project = await Project.findById(id);
    if (!project || project.isArchived) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Role check: Admin or member of project
    if (user.role !== "admin") {
      const isMember = project.members.some((m) => m.toString() === user.id);
      if (!isMember) {
        return NextResponse.json({ success: false, error: "Permission denied" }, { status: 403 });
      }
    }

    const result = await syncProjectTracking(id);

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "UPDATE",
      entityType: "Project",
      entityId: id,
      projectId: project._id,
      after: result,
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Project tracking metrics, lag, and risk flags recalculated successfully",
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to recalculate project" },
      { status: error.status || 500 }
    );
  }
}
