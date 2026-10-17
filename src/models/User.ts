import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "admin" | "manager" | "employee" | "user";
  managerId?: mongoose.Types.ObjectId | null;
  createdBy?: mongoose.Types.ObjectId | null;
  department?: string;
  avatar?: string;
  isActive: boolean;
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: ["admin", "manager", "employee", "user"],
      default: "employee",
      index: true,
    },
    managerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    department: { type: String, default: "Engineering" },
    avatar: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    emailVerified: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent recompilation in development / serverless
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
