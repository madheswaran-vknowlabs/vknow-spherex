import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICorporateLeaveQuotas {
  casualLeave: number;
  sickLeave: number;
  earnedLeave: number;
  maternityLeave: number;
  paternityLeave: number;
  medicalLeave: number;
}

export const DEFAULT_CORPORATE_LEAVE_QUOTAS: ICorporateLeaveQuotas = {
  casualLeave: 12,
  sickLeave: 12,
  earnedLeave: 15,
  maternityLeave: 180,
  paternityLeave: 15,
  medicalLeave: 15,
};

export interface ILeavePolicy extends Document {
  year: number;
  quotas: ICorporateLeaveQuotas;
  carryForwardLimit: number;
  notes?: string;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const LeavePolicySchema = new Schema<ILeavePolicy>(
  {
    year: { type: Number, required: true, default: 2026, unique: true },
    quotas: {
      casualLeave: { type: Number, default: DEFAULT_CORPORATE_LEAVE_QUOTAS.casualLeave, min: 0 },
      sickLeave: { type: Number, default: DEFAULT_CORPORATE_LEAVE_QUOTAS.sickLeave, min: 0 },
      earnedLeave: { type: Number, default: DEFAULT_CORPORATE_LEAVE_QUOTAS.earnedLeave, min: 0 },
      maternityLeave: { type: Number, default: DEFAULT_CORPORATE_LEAVE_QUOTAS.maternityLeave, min: 0 },
      paternityLeave: { type: Number, default: DEFAULT_CORPORATE_LEAVE_QUOTAS.paternityLeave, min: 0 },
      medicalLeave: { type: Number, default: DEFAULT_CORPORATE_LEAVE_QUOTAS.medicalLeave, min: 0 },
    },
    carryForwardLimit: { type: Number, default: 5, min: 0 },
    notes: { type: String, default: "Standard Enterprise Leave Policy" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const LeavePolicy: Model<ILeavePolicy> =
  mongoose.models.LeavePolicy || mongoose.model<ILeavePolicy>("LeavePolicy", LeavePolicySchema);

export default LeavePolicy;
