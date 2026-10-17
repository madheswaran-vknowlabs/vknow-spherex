import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();
    await connectDB();

    const users = await User.find({ isActive: true })
      .select("name email role department avatar")
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
