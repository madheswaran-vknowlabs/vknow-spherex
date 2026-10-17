import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaskUpdateItem {
  taskId: mongoose.Types.ObjectId;
  progress: number;
  hours: number;
  status: "To Do" | "In Progress" | "Under Review" | "Completed" | "Blocked";
  notes?: string;
}

export interface IWeeklyUpdate extends Document {
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  weekStartDate: Date;
  weekEndDate: Date;
  weekNumber: number;
  year: number;
  workCompleted: string;
  hoursSpent: number;
  taskUpdates: ITaskUpdateItem[];
  blockers?: string;
  planNextWeek: string;
  submittedAt: Date;
  isLate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TaskUpdateItemSchema = new Schema<ITaskUpdateItem>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    progress: { type: Number, required: true, min: 0, max: 100 },
    hours: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Under Review", "Completed", "Blocked"],
      required: true,
    },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const WeeklyUpdateSchema = new Schema<IWeeklyUpdate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    weekStartDate: { type: Date, required: true, index: true },
    weekEndDate: { type: Date, required: true },
    weekNumber: { type: Number, required: true, index: true },
    year: { type: Number, required: true, index: true },
    workCompleted: { type: String, required: true },
    hoursSpent: { type: Number, required: true, min: 0 },
    taskUpdates: [TaskUpdateItemSchema],
    blockers: { type: String, default: "" },
    planNextWeek: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    isLate: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

WeeklyUpdateSchema.index({ userId: 1, weekStartDate: 1, projectId: 1 }, { unique: true });
WeeklyUpdateSchema.index({ weekStartDate: 1, projectId: 1 });
WeeklyUpdateSchema.index({ year: 1, weekNumber: 1 });

export const WeeklyUpdate: Model<IWeeklyUpdate> =
  mongoose.models.WeeklyUpdate || mongoose.model<IWeeklyUpdate>("WeeklyUpdate", WeeklyUpdateSchema);

export default WeeklyUpdate;
