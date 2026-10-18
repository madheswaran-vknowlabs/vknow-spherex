import mongoose, { Schema, Document, Model } from "mongoose";
import { DEFAULT_CORPORATE_LEAVE_QUOTAS } from "./LeavePolicy";

export interface ILeaveTypeBalance {
  allocated: number;
  used: number;
  pending: number;
}

export interface ILeaveBalance extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  department: string;
  year: number;
  casualLeave: ILeaveTypeBalance;
  sickLeave: ILeaveTypeBalance;
  earnedLeave: ILeaveTypeBalance;
  maternityLeave: ILeaveTypeBalance;
  paternityLeave: ILeaveTypeBalance;
  medicalLeave: ILeaveTypeBalance;
  customAdjusted: boolean;
  adjustmentNote?: string;
  lastAdjustedBy?: mongoose.Types.ObjectId | null;
  lastAdjustedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveTypeBalanceSchema = new Schema<ILeaveTypeBalance>(
  {
    allocated: { type: Number, required: true, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    pending: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    department: { type: String, default: "Engineering" },
    year: { type: Number, required: true, default: 2026, index: true },
    casualLeave: {
      type: LeaveTypeBalanceSchema,
      default: () => ({ allocated: DEFAULT_CORPORATE_LEAVE_QUOTAS.casualLeave, used: 0, pending: 0 }),
    },
    sickLeave: {
      type: LeaveTypeBalanceSchema,
      default: () => ({ allocated: DEFAULT_CORPORATE_LEAVE_QUOTAS.sickLeave, used: 0, pending: 0 }),
    },
    earnedLeave: {
      type: LeaveTypeBalanceSchema,
      default: () => ({ allocated: DEFAULT_CORPORATE_LEAVE_QUOTAS.earnedLeave, used: 0, pending: 0 }),
    },
    maternityLeave: {
      type: LeaveTypeBalanceSchema,
      default: () => ({ allocated: DEFAULT_CORPORATE_LEAVE_QUOTAS.maternityLeave, used: 0, pending: 0 }),
    },
    paternityLeave: {
      type: LeaveTypeBalanceSchema,
      default: () => ({ DEFAULT_CORPORATE_LEAVE_QUOTAS, allocated: DEFAULT_CORPORATE_LEAVE_QUOTAS.paternityLeave, used: 0, pending: 0 }),
    },
    medicalLeave: {
      type: LeaveTypeBalanceSchema,
      default: () => ({ allocated: DEFAULT_CORPORATE_LEAVE_QUOTAS.medicalLeave, used: 0, pending: 0 }),
    },
    customAdjusted: { type: Boolean, default: false },
    adjustmentNote: { type: String, default: "" },
    lastAdjustedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastAdjustedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index so one record per user per year
LeaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

export const LeaveBalance: Model<ILeaveBalance> =
  mongoose.models.LeaveBalance || mongoose.model<ILeaveBalance>("LeaveBalance", LeaveBalanceSchema);

export default LeaveBalance;
