import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { createUserSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    await connectDB();

    const isAdmin = sessionUser.role === "admin";
    const filter = isAdmin ? {} : { isActive: true };

    const users = await User.find(filter)
      .select("name email role department avatar isActive createdAt")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch users" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();
    await connectDB();

    const body = await req.json();
    const validated = createUserSchema.parse(body);

    const existingUser = await User.findOne({
      email: validated.email.trim().toLowerCase(),
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `An employee with email '${validated.email}' already exists.` },
        { status: 400 }
      );
    }

    const rawPassword = validated.password?.trim() || "password123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = await User.create({
      name: validated.name.trim(),
      email: validated.email.trim().toLowerCase(),
      password: hashedPassword,
      role: validated.role || "user",
      department: validated.department?.trim() || "Engineering",
      isActive: true,
    });

    await logAuditEvent({
      actor: {
        userId: adminUser.id,
        name: adminUser.name,
        role: adminUser.role,
        email: adminUser.email,
      },
      action: "CREATE",
      entityType: "User",
      entityId: newUser._id.toString(),
      after: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        isActive: newUser.isActive,
      },
      req,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create employee" },
      { status: error.status || 500 }
    );
  }
}
