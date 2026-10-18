import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStageSignOff {
  approvedBy?: mongoose.Types.ObjectId | null;
  approvedAt?: Date | null;
  remarks?: string;
  requestedBy?: mongoose.Types.ObjectId | null;
  requestedAt?: Date | null;
  status?: "pending_approval" | "approved" | "rejected" | null;
}

export interface IStage extends Document {
  projectId: mongoose.Types.ObjectId;
  order: number;
  name: string;
  ownerId?: mongoose.Types.ObjectId | null;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  status: "Not Started" | "In Progress" | "On Hold" | "Blocked" | "Completed" | "Approved";
  percentComplete: number;
  notes?: string;
  attachments: string[];
  signOff: IStageSignOff;
  lagInDays: number;
  health: "Green" | "Amber" | "Red";
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StageSignOffSchema = new Schema<IStageSignOff>(
  {
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    remarks: { type: String, default: "" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    requestedAt: { type: Date, default: null },
    status: { type: String, enum: ["pending_approval", "approved", "rejected", null], default: null },
  },
  { _id: false }
);

const StageSchema = new Schema<IStage>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    order: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    plannedStartDate: { type: Date, required: true },
    plannedEndDate: { type: Date, required: true },
    actualStartDate: { type: Date, default: null },
    actualEndDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "On Hold", "Blocked", "Completed", "Approved"],
      default: "Not Started",
      index: true,
    },
    percentComplete: { type: Number, default: 0, min: 0, max: 100 },
    notes: { type: String, default: "" },
    attachments: [{ type: String }],
    signOff: { type: StageSignOffSchema, default: () => ({}) },
    lagInDays: { type: Number, default: 0 },
    health: { type: String, enum: ["Green", "Amber", "Red"], default: "Green" },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

StageSchema.index({ projectId: 1, order: 1 });
StageSchema.index({ projectId: 1, status: 1 });

export const Stage: Model<IStage> =
  mongoose.models.Stage || mongoose.model<IStage>("Stage", StageSchema);

export default Stage;
