import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailyTaskDoubt {
  _id?: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  raisedByName: string;
  raisedByRole: string;
  question: string;
  reply?: string;
  repliedAt?: Date | null;
  status: "open" | "resolved";
  createdAt: Date;
}

export interface IDailyTaskItem {
  _id?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId | null;
  projectId: mongoose.Types.ObjectId;
  projectName: string;
  stageId?: mongoose.Types.ObjectId | null;
  stageName?: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  taskStatus: "To Do" | "In Progress" | "Completed" | "Blocked";
  blockers?: string;
  doubts?: IDailyTaskDoubt[];
}

export interface IDailyWorkUpdate extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: "admin" | "manager" | "employee" | "user";
  department: string;
  managerId?: mongoose.Types.ObjectId | null;
  date: Date;
  dateString: string; // "YYYY-MM-DD"
  status: "submitted" | "on_leave" | "pending";
  leaveType?: "Casual Leave" | "Sick Leave" | "Paid Time Off" | "Holiday" | "Other" | null;
  leaveReason?: string;
  totalHours: number;
  tasks: IDailyTaskItem[];
  generalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyTaskDoubtSchema = new Schema<IDailyTaskDoubt>(
  {
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    raisedByName: { type: String, required: true },
    raisedByRole: { type: String, default: "manager" },
    question: { type: String, required: true, trim: true },
    reply: { type: String, default: "" },
    repliedAt: { type: Date, default: null },
    status: { type: String, enum: ["open", "resolved"], default: "open" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const DailyTaskItemSchema = new Schema<IDailyTaskItem>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectName: { type: String, required: true },
    stageId: { type: Schema.Types.ObjectId, ref: "Stage", default: null },
    stageName: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    hours: { type: Number, required: true, default: 0, min: 0 },
    taskStatus: {
      type: String,
      enum: ["To Do", "In Progress", "Completed", "Blocked"],
      default: "Completed",
    },
    blockers: { type: String, default: "" },
    doubts: [DailyTaskDoubtSchema],
  },
  { _id: true }
);

const DailyWorkUpdateSchema = new Schema<IDailyWorkUpdate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, default: "employee" },
    department: { type: String, default: "Engineering" },
    managerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    date: { type: Date, required: true, index: true },
    dateString: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["submitted", "on_leave", "pending"],
      default: "submitted",
      index: true,
    },
    leaveType: {
      type: String,
      enum: ["Casual Leave", "Sick Leave", "Paid Time Off", "Holiday", "Other", null],
      default: null,
    },
    leaveReason: { type: String, default: "" },
    totalHours: { type: Number, default: 0, min: 0 },
    tasks: [DailyTaskItemSchema],
    generalNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

DailyWorkUpdateSchema.index({ userId: 1, dateString: 1 }, { unique: true });
DailyWorkUpdateSchema.index({ managerId: 1, dateString: 1 });
DailyWorkUpdateSchema.index({ dateString: 1, status: 1 });

export const DailyWorkUpdate: Model<IDailyWorkUpdate> =
  (mongoose.models.DailyWorkUpdate as Model<IDailyWorkUpdate>) ||
  mongoose.model<IDailyWorkUpdate>("DailyWorkUpdate", DailyWorkUpdateSchema);

export default DailyWorkUpdate;
