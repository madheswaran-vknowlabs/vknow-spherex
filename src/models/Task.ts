import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWorkLog {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  date: Date;
  startTime: string;
  endTime: string;
  hours: number;
  notes: string;
  createdAt?: Date;
}

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assigneeId?: mongoose.Types.ObjectId | null;
  priority: "Low" | "Medium" | "High" | "Urgent";
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  estimatedHours: number;
  loggedHours: number;
  percentComplete: number;
  status: "To Do" | "In Progress" | "Under Review" | "Completed" | "Blocked";
  blockedBy: mongoose.Types.ObjectId[];
  workLogs?: IWorkLog[];
  isAtRisk: boolean;
  lagInDays: number;
  health: "Green" | "Amber" | "Red";
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    stageId: { type: Schema.Types.ObjectId, ref: "Stage", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
      index: true,
    },
    plannedStartDate: { type: Date, required: true, index: true },
    plannedEndDate: { type: Date, required: true, index: true },
    actualStartDate: { type: Date, default: null },
    actualEndDate: { type: Date, default: null },
    estimatedHours: { type: Number, default: 0, min: 0 },
    loggedHours: { type: Number, default: 0, min: 0 },
    percentComplete: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Under Review", "Completed", "Blocked"],
      default: "To Do",
      index: true,
    },
    blockedBy: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    workLogs: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        userName: { type: String, default: "" },
        date: { type: Date, default: Date.now },
        startTime: { type: String, default: "" },
        endTime: { type: String, default: "" },
        hours: { type: Number, default: 0 },
        notes: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isAtRisk: { type: Boolean, default: false, index: true },
    lagInDays: { type: Number, default: 0 },
    health: { type: String, enum: ["Green", "Amber", "Red"], default: "Green" },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

TaskSchema.index({ assigneeId: 1, status: 1, isArchived: 1 });
TaskSchema.index({ projectId: 1, stageId: 1, isArchived: 1 });
TaskSchema.index({ plannedEndDate: 1, status: 1 });

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

export default Task;
