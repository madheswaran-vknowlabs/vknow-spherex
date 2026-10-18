import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { requireAdminOrManager } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminOrManager();
    const { id } = await params;
    await connectDB();

    const project = await Project.findOne({ _id: id, isArchived: false })
      .populate("members", "name email role department avatar")
      .lean();

    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    // Fetch all active employees/users who are NOT yet members of this project
    const currentMemberIds = (project.members || []).map((m: any) => m._id.toString());
    const availableUsers = await User.find({
      isActive: true,
      _id: { $nin: currentMemberIds },
    })
      .select("name email role department avatar managerId")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        project: {
          _id: project._id,
          name: project.name,
          code: project.code,
        },
        members: project.members || [],
        availableUsers,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch project members" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminOrManager();
    const { id } = await params;
    await connectDB();

    const body = await req.json();
    const { userId, userIds } = body;

    const targetUserIds: string[] = userIds || (userId ? [userId] : []);
    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one employee userId is required" },
        { status: 400 }
      );
    }

    const project = await Project.findOne({ _id: id, isArchived: false });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const beforeMembers = [...project.members];

    // Add employees to project members list
    const addedUsers = await User.find({ _id: { $in: targetUserIds } }).select("name email role");

    for (const u of addedUsers) {
      const uIdStr = u._id.toString();
      const alreadyMember = project.members.some((m) => m.toString() === uIdStr);
      if (!alreadyMember) {
        project.members.push(u._id);

        // Send a targeted notification to the added employee
        await Notification.create({
          userId: u._id,
          title: `Added to Project: ${project.name}`,
          message: `${user.name} (${user.role}) has added you to project "${project.name}" (${project.code}). You can now collaborate on deliverables and log daily work.`,
          type: "task_assigned",
          link: `/projects/${project._id}`,
          isRead: false,
        });
      }
    }

    await project.save();

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "UPDATE",
      entityType: "Project",
      entityId: project._id.toString(),
      projectId: project._id,
      before: { members: beforeMembers },
      after: { members: project.members },
      req,
    });

    const populatedProject = await Project.findById(id)
      .populate("members", "name email role department avatar")
      .lean();

    const addedNames = addedUsers.map((u) => u.name).join(", ");

    return NextResponse.json({
      success: true,
      message: `Successfully added ${addedNames} to ${project.name}`,
      data: {
        members: populatedProject?.members || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add member to project" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdminOrManager();
    const { id } = await params;
    await connectDB();

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId parameter is required" }, { status: 400 });
    }

    const project = await Project.findOne({ _id: id, isArchived: false });
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    project.members = project.members.filter((m) => m.toString() !== userId);
    await project.save();

    const populatedProject = await Project.findById(id)
      .populate("members", "name email role department avatar")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Member removed from project",
      data: {
        members: populatedProject?.members || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove member from project" },
      { status: error.status || 500 }
    );
  }
}
