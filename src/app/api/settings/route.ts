import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Setting, Project } from "@/models";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { updateSettingsSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";
import { syncProjectTracking } from "@/lib/lag-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    await connectDB();

    let settings = await Setting.findOne().lean();
    if (!settings) {
      settings = await Setting.create({
        lagWarningThresholdDays: 2,
        lagCriticalThresholdDays: 5,
        weeklyReminderDay: 5,
        weeklyReminderTime: "17:00",
        timezone: "Asia/Kolkata",
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin();
    await connectDB();

    const body = await req.json();
    const validated = updateSettingsSchema.parse(body);

    let setting = await Setting.findOne();
    const beforeState = setting ? setting.toObject() : {};

    if (!setting) {
      setting = new Setting();
    }

    setting.lagWarningThresholdDays = validated.lagWarningThresholdDays;
    setting.lagCriticalThresholdDays = validated.lagCriticalThresholdDays;
    setting.weeklyReminderDay = validated.weeklyReminderDay;
    setting.weeklyReminderTime = validated.weeklyReminderTime;
    setting.timezone = validated.timezone;

    await setting.save();

    // Recompute health & lag for all active projects based on new thresholds
    const activeProjects = await Project.find({ isArchived: false }).select("_id");
    for (const proj of activeProjects) {
      try {
        await syncProjectTracking(proj._id);
      } catch (err) {
        console.error(`Error recalculating project ${proj._id}:`, err);
      }
    }

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "UPDATE",
      entityType: "Setting",
      entityId: setting._id.toString(),
      before: beforeState,
      after: setting.toObject(),
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Settings updated and project health recomputed successfully",
      data: setting,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update settings" },
      { status: error.status || 400 }
    );
  }
}
