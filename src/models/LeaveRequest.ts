import mongoose, { Schema, Document, Model } from "mongoose";

export type CorporateLeaveType =
  | "Casual Leave"
  | "Sick Leave"
  | "Earned Leave"
  | "Maternity Leave"
  | "Paternity Leave"
  | "Medical Leave"
  | "Paid Time Off"
  | "Holiday"
  | "Other";

export interface ILeaveRequest extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: string;
  department: string;
  managerId?: mongoose.Types.ObjectId | null;
  leaveType: CorporateLeaveType;
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  totalDays: number;
  isHalfDay: boolean;
  halfDaySession?: "First Half" | "Second Half" | null;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedByName?: string;
  reviewedAt?: Date | null;
  reviewRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, default: "employee" },
    department: { type: String, default: "Engineering" },
    managerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    leaveType: {
      type: String,
      enum: [
        "Casual Leave",
        "Sick Leave",
        "Earned Leave",
        "Maternity Leave",
        "Paternity Leave",
        "Medical Leave",
        "Paid Time Off",
        "Holiday",
        "Other",
      ],
      required: true,
      index: true,
    },
    startDate: { type: String, required: true, index: true },
    endDate: { type: String, required: true, index: true },
    totalDays: { type: Number, required: true, min: 0.5 },
    isHalfDay: { type: Boolean, default: false },
    halfDaySession: { type: String, enum: ["First Half", "Second Half", null], default: null },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedByName: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    reviewRemarks: { type: String, default: "" },
  },
  { timestamps: true }
);

export const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest || mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
