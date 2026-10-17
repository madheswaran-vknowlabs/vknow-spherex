import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAdmin } from "@/lib/auth";
import { updateUserSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin();
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const validated = updateUserSchema.parse(body);

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    const before = {
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      department: targetUser.department,
      isActive: targetUser.isActive,
    };

    if (validated.name !== undefined) targetUser.name = validated.name.trim();
    if (validated.email !== undefined) targetUser.email = validated.email.trim().toLowerCase();
    if (validated.role !== undefined) targetUser.role = validated.role;
    if (validated.department !== undefined) targetUser.department = validated.department.trim();
    if (validated.isActive !== undefined) targetUser.isActive = validated.isActive;

    if (validated.password && validated.password.trim()) {
      targetUser.password = await bcrypt.hash(validated.password.trim(), 10);
    }

    await targetUser.save();

    await logAuditEvent({
      actor: {
        userId: adminUser.id,
        name: adminUser.name,
        role: adminUser.role,
        email: adminUser.email,
      },
      action: "UPDATE",
      entityType: "User",
      entityId: targetUser._id.toString(),
      before,
      after: {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        department: targetUser.department,
        isActive: targetUser.isActive,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        department: targetUser.department,
        isActive: targetUser.isActive,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update employee" },
      { status: error.status || 500 }
    );
  }
}
