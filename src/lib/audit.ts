import connectDB from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import mongoose from "mongoose";

export interface LogAuditOptions {
  actor: {
    userId?: string | mongoose.Types.ObjectId | null;
    name: string;
    role: "admin" | "manager" | "employee" | "user" | "system" | string;
    email?: string;
  };
  action: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | mongoose.Types.ObjectId | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  req?: Request;
  ipAddress?: string;
  userAgent?: string;
}

export function computeFieldDiff(
  before?: Record<string, any> | null,
  after?: Record<string, any> | null
): Record<string, { before: any; after: any }> | null {
  if (!before && !after) return null;
  if (!before && after) {
    const diff: Record<string, { before: any; after: any }> = {};
    for (const key of Object.keys(after)) {
      if (key !== "_id" && key !== "__v" && key !== "updatedAt") {
        diff[key] = { before: null, after: after[key] };
      }
    }
    return diff;
  }
  if (before && !after) {
    const diff: Record<string, { before: any; after: any }> = {};
    for (const key of Object.keys(before)) {
      if (key !== "_id" && key !== "__v" && key !== "updatedAt") {
        diff[key] = { before: before[key], after: null };
      }
    }
    return diff;
  }

  const diff: Record<string, { before: any; after: any }> = {};
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    if (key === "_id" || key === "__v" || key === "updatedAt" || key === "password") {
      continue;
    }
    const valBefore = before ? before[key] : undefined;
    const valAfter = after ? after[key] : undefined;

    // Convert Date objects or ObjectIds to string for clean comparison
    const strBefore = valBefore instanceof Date ? valBefore.toISOString() : JSON.stringify(valBefore);
    const strAfter = valAfter instanceof Date ? valAfter.toISOString() : JSON.stringify(valAfter);

    if (strBefore !== strAfter) {
      diff[key] = { before: valBefore, after: valAfter };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

export async function logAuditEvent(options: LogAuditOptions): Promise<void> {
  try {
    await connectDB();

    let ipAddress = options.ipAddress || "127.0.0.1";
    let userAgent = options.userAgent || "";

    if (options.req) {
      const forwarded = options.req.headers.get("x-forwarded-for");
      if (forwarded) {
        ipAddress = forwarded.split(",")[0].trim();
      } else {
        const realIp = options.req.headers.get("x-real-ip");
        if (realIp) ipAddress = realIp;
      }
      userAgent = options.req.headers.get("user-agent") || "";
    }

    const diff = computeFieldDiff(options.before, options.after);

    const actorUserId =
      options.actor.userId && mongoose.isValidObjectId(options.actor.userId)
        ? new mongoose.Types.ObjectId(options.actor.userId.toString())
        : null;

    const projectId =
      options.projectId && mongoose.isValidObjectId(options.projectId)
        ? new mongoose.Types.ObjectId(options.projectId.toString())
        : null;

    await AuditLog.create({
      actor: {
        userId: actorUserId,
        name: options.actor.name,
        role: options.actor.role,
        email: options.actor.email || "",
      },
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId ? String(options.entityId) : null,
      projectId,
      before: options.before || null,
      after: options.after || null,
      diff,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[AuditLog Error] Failed to record audit event:", error);
  }
}
