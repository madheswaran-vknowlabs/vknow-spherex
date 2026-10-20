import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../lib/db";
import {
  User,
  Project,
  Stage,
  Task,
  Discrepancy,
  WeeklyUpdate,
  DailyWorkUpdate,
  LeaveRequest,
  LeaveBalance,
  LeavePolicy,
  AuditLog,
  Notification,
  ReportSnapshot,
  Setting,
} from "../models";
import { DEFAULT_STAGES } from "../types/models";

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/vknow_spherex";
}

async function cleanData() {
  console.log("🧹 Clearing all dummy data from VKnow SphereX database...");
  await connectDB();

  // 1. Delete all business and transactional dummy data
  await Promise.all([
    Project.deleteMany({}),
    Stage.deleteMany({}),
    Task.deleteMany({}),
    Discrepancy.deleteMany({}),
    WeeklyUpdate.deleteMany({}),
    DailyWorkUpdate.deleteMany({}),
    LeaveRequest.deleteMany({}),
    LeaveBalance.deleteMany({}),
    AuditLog.deleteMany({}),
    Notification.deleteMany({}),
    ReportSnapshot.deleteMany({}),
  ]);

  // 2. Remove all non-admin users, keep only the primary admin
  await User.deleteMany({ email: { $ne: "admin@vknowlabs.com" } });

  // 3. Ensure primary admin exists
  const hashedPassword = await bcrypt.hash("password123", 10);
  let admin = await User.findOne({ email: "admin@vknowlabs.com" });
  if (!admin) {
    admin = await User.create({
      name: "Madheswaran",
      email: "admin@vknowlabs.com",
      password: hashedPassword,
      role: "admin",
      department: "Engineering Leadership",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
      isActive: true,
    });
  } else {
    admin.password = hashedPassword;
    admin.role = "admin";
    admin.isActive = true;
    await admin.save();
  }

  // 4. Ensure system settings exist
  let setting = await Setting.findOne();
  if (!setting) {
    setting = await Setting.create({
      lagWarningThresholdDays: 2,
      lagCriticalThresholdDays: 5,
      weeklyReminderDay: 5,
      weeklyReminderTime: "17:00",
      timezone: "Asia/Kolkata",
      defaultStageTemplates: [...DEFAULT_STAGES],
    });
  }

  // 5. Ensure standard leave policy exists
  let policy = await LeavePolicy.findOne({ year: 2026 });
  if (!policy) {
    await LeavePolicy.create({
      year: 2026,
      quotas: {
        casualLeave: 12,
        sickLeave: 12,
        earnedLeave: 15,
        maternityLeave: 180,
        paternityLeave: 15,
        medicalLeave: 15,
      },
      carryForwardLimit: 5,
      notes: "Corporate Standard Enterprise Leave Policy",
      updatedBy: admin._id,
    });
  }

  console.log("✅ Cleanup complete. Only Admin user is retained.");
  console.log("   Admin Email: admin@vknowlabs.com");
  console.log("   Admin Password: password123");

  await mongoose.disconnect();
}

cleanData().catch((err) => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
