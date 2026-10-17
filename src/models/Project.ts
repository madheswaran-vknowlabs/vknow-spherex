import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProject extends Document {
  name: string;
  code: string;
  description?: string;
  client?: string;
  status: "Planning" | "Active" | "On Hold" | "Completed" | "Archived";
  health: "Green" | "Amber" | "Red";
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  progress: number;
  members: mongoose.Types.ObjectId[];
  currentStageId?: mongoose.Types.ObjectId | null;
  lagInDays: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: "" },
    client: { type: String, default: "Internal" },
    status: {
      type: String,
      enum: ["Planning", "Active", "On Hold", "Completed", "Archived"],
      default: "Active",
      index: true,
    },
    health: {
      type: String,
      enum: ["Green", "Amber", "Red"],
      default: "Green",
      index: true,
    },
    plannedStartDate: { type: Date, required: true, index: true },
    plannedEndDate: { type: Date, required: true, index: true },
    actualStartDate: { type: Date, default: null },
    actualEndDate: { type: Date, default: null },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    members: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    currentStageId: { type: Schema.Types.ObjectId, ref: "Stage", default: null },
    lagInDays: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ isArchived: 1, status: 1, health: 1 });
ProjectSchema.index({ members: 1, isArchived: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
