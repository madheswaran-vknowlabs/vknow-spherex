import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import DailyWorkUpdate from "@/models/DailyWorkUpdate";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user as any;
    await connectDB();

    const body = await req.json();
    const { updateId, taskItemId, doubtId, reply, resolve = false } = body;

    if (!updateId || !doubtId) {
      return NextResponse.json(
        { success: false, error: "updateId and doubtId are required" },
        { status: 400 }
      );
    }

    const dailyUpdate = await DailyWorkUpdate.findById(updateId);
    if (!dailyUpdate) {
      return NextResponse.json({ success: false, error: "Daily work update not found" }, { status: 404 });
    }

    // Locate the doubt in the tasks
    let foundDoubt: any = null;
    let foundTask: any = null;

    for (const task of dailyUpdate.tasks) {
      if (task.doubts && task.doubts.length > 0) {
        const d = task.doubts.find((item: any) => item._id.toString() === doubtId);
        if (d) {
          foundDoubt = d;
          foundTask = task;
          break;
        }
      }
    }

    if (!foundDoubt) {
      return NextResponse.json({ success: false, error: "Doubt item not found" }, { status: 404 });
    }

    if (reply) {
      foundDoubt.reply = reply.trim();
      foundDoubt.repliedAt = new Date();
    }
    if (resolve) {
      foundDoubt.status = "resolved";
    }

    await dailyUpdate.save();

    // If employee replied, notify the manager who raised the doubt
    if (currentUser.id === dailyUpdate.userId.toString() && foundDoubt.raisedBy) {
      await Notification.create({
        userId: foundDoubt.raisedBy,
        title: `Clarification Received: ${foundTask?.title || "Task"}`,
        message: `${currentUser.name} replied to your query: "${reply || "Marked as resolved"}"`,
        type: "system",
        link: `/daily-update?date=${dailyUpdate.dateString}`,
        isRead: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Doubt updated successfully.",
      data: dailyUpdate,
    });
  } catch (error: any) {
    console.error("POST /api/daily-updates/doubt/reply error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
