import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDiscrepancy extends Document {
  projectId: mongoose.Types.ObjectId;
  stageId?: mongoose.Types.ObjectId | null;
  taskId?: mongoose.Types.ObjectId | null;
  type: "Scope Change" | "Effort Overrun" | "Delay" | "Quality Issue" | "Requirement Gap" | "Other";
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  raisedById: mongoose.Types.ObjectId;
  status: "Open" | "In Review" | "Resolved" | "Closed";
  resolution?: string;
  resolutionDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DiscrepancySchema = new Schema<IDiscrepancy>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    stageId: { type: Schema.Types.ObjectId, ref: "Stage", default: null, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null, index: true },
    type: {
      type: String,
      enum: ["Scope Change", "Effort Overrun", "Delay", "Quality Issue", "Requirement Gap", "Other"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true,
    },
    description: { type: String, required: true },
    raisedById: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["Open", "In Review", "Resolved", "Closed"],
      default: "Open",
      index: true,
    },
    resolution: { type: String, default: "" },
    resolutionDate: { type: Date, default: null },
  },
  { timestamps: true }
);

DiscrepancySchema.index({ projectId: 1, status: 1, severity: 1 });

export const Discrepancy: Model<IDiscrepancy> =
  mongoose.models.Discrepancy || mongoose.model<IDiscrepancy>("Discrepancy", DiscrepancySchema);

export default Discrepancy;
