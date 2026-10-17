import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReportSnapshot extends Document {
  periodType: "weekly" | "monthly" | "yearly";
  periodStart: Date;
  periodEnd: Date;
  projectId?: mongoose.Types.ObjectId | null;
  userId?: mongoose.Types.ObjectId | null;
  metrics: Record<string, any>;
  frozenData: Record<string, any>;
  generatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSnapshotSchema = new Schema<IReportSnapshot>(
  {
    periodType: {
      type: String,
      enum: ["weekly", "monthly", "yearly"],
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    metrics: { type: Schema.Types.Mixed, required: true },
    frozenData: { type: Schema.Types.Mixed, required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

ReportSnapshotSchema.index({ periodType: 1, periodStart: 1, projectId: 1 });

export const ReportSnapshot: Model<IReportSnapshot> =
  mongoose.models.ReportSnapshot ||
  mongoose.model<IReportSnapshot>("ReportSnapshot", ReportSnapshotSchema);

export default ReportSnapshot;
