import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import DailyWorkUpdate from "@/models/DailyWorkUpdate";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user as any;
    if (currentUser.role !== "manager" && currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only managers and admins can raise doubts on employee tasks." },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { updateId, taskItemId, question } = body;

    if (!updateId || !question?.trim()) {
      return NextResponse.json(
        { success: false, error: "updateId and question are required" },
        { status: 400 }
      );
    }

    const dailyUpdate = await DailyWorkUpdate.findById(updateId);
    if (!dailyUpdate) {
      return NextResponse.json({ success: false, error: "Daily work update not found" }, { status: 404 });
    }

    // Find the target task item
    let targetTask = null;
    if (taskItemId) {
      targetTask = dailyUpdate.tasks.find((t: any) => t._id.toString() === taskItemId);
    }
    if (!targetTask && dailyUpdate.tasks.length > 0) {
      targetTask = dailyUpdate.tasks[0];
    }

    if (!targetTask) {
      return NextResponse.json({ success: false, error: "Task item not found in daily update" }, { status: 404 });
    }

    const newDoubt = {
      _id: new mongoose.Types.ObjectId(),
      raisedBy: currentUser.id,
      raisedByName: currentUser.name,
      raisedByRole: currentUser.role,
      question: question.trim(),
      reply: "",
      repliedAt: null,
      status: "open" as const,
      createdAt: new Date(),
    };

    targetTask.doubts = targetTask.doubts || [];
    targetTask.doubts.push(newDoubt);

    await dailyUpdate.save();

    // Create a targeted Notification for the employee
    await Notification.create({
      userId: dailyUpdate.userId,
      title: `Manager Query: ${targetTask.title}`,
      message: `${currentUser.name} (${currentUser.role}) raised a doubt on your task "${targetTask.title}": "${question.trim()}"`,
      type: "discrepancy_raised",
      link: `/daily-update?date=${dailyUpdate.dateString}`,
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      message: "Doubt successfully raised and employee notified.",
      data: dailyUpdate,
      doubt: newDoubt,
    });
  } catch (error: any) {
    console.error("POST /api/daily-updates/doubt error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
