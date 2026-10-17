import mongoose, { Schema, Document, Model } from "mongoose";
import { DEFAULT_STAGES } from "@/types/models";

export interface ISetting extends Document {
  lagWarningThresholdDays: number;
  lagCriticalThresholdDays: number;
  weeklyReminderDay: number; // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  weeklyReminderTime: string; // HH:mm
  defaultStageTemplates: string[];
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    lagWarningThresholdDays: { type: Number, default: 2 },
    lagCriticalThresholdDays: { type: Number, default: 5 },
    weeklyReminderDay: { type: Number, default: 5 },
    weeklyReminderTime: { type: String, default: "17:00" },
    defaultStageTemplates: {
      type: [String],
      default: () => [...DEFAULT_STAGES],
    },
    timezone: { type: String, default: "Asia/Kolkata" },
  },
  { timestamps: true }
);

export const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>("Setting", SettingSchema);

export default Setting;
