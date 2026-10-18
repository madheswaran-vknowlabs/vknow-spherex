import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAuth, requireAdminOrManager } from "@/lib/auth";
import { createUserSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    let filter: any = {};

    if (sessionUser.role === "admin") {
      filter = scope === "active" ? { isActive: true } : {};
    } else if (sessionUser.role === "manager") {
      // In manager team directory, view their team. When picking members, view active users.
      if (scope === "team") {
        filter = {
          $or: [
            { _id: sessionUser.id },
            { managerId: sessionUser.id },
            { createdBy: sessionUser.id },
          ],
        };
      } else {
        filter = { isActive: true };
      }
    } else {
      filter = { isActive: true };
    }

    const users = await User.find(filter)
      .select("name email role department avatar isActive managerId createdBy createdAt")
      .populate("managerId", "name email role")
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
    const sessionUser = await requireAdminOrManager();
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

    // If Manager is creating user, enforce role = "employee" and assign managerId
    const assignedRole =
      sessionUser.role === "manager" ? "employee" : validated.role || "employee";
    const managerId =
      sessionUser.role === "manager"
        ? sessionUser.id
        : validated.managerId || null;

    const newUser = await User.create({
      name: validated.name.trim(),
      email: validated.email.trim().toLowerCase(),
      password: hashedPassword,
      role: assignedRole,
      department: validated.department?.trim() || "Engineering",
      managerId: managerId,
      createdBy: sessionUser.id,
      isActive: true,
    });

    await logAuditEvent({
      actor: {
        userId: sessionUser.id,
        name: sessionUser.name,
        role: sessionUser.role,
        email: sessionUser.email,
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
