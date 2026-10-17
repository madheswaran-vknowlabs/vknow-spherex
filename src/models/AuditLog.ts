import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditActor {
  userId?: mongoose.Types.ObjectId | null;
  name: string;
  role: "admin" | "manager" | "employee" | "user" | "system" | string;
  email?: string;
}

export interface IAuditLog extends Document {
  actor: IAuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  projectId?: mongoose.Types.ObjectId | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  diff?: Record<string, { before: any; after: any }> | null;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt: Date;
}

const AuditActorSchema = new Schema<IAuditActor>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true },
    role: { type: String, required: true },
    email: { type: String, default: "" },
  },
  { _id: false }
);

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: AuditActorSchema, required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    diff: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: "127.0.0.1" },
    userAgent: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ "actor.userId": 1, timestamp: -1 });
AuditLogSchema.index({ projectId: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, action: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
