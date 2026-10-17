import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Notification } from "@/models";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: user.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Notification.countDocuments({ userId: user.id, isRead: false }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch notifications" },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { id, markAllRead } = body;

    if (markAllRead) {
      await Notification.updateMany({ userId: user.id, isRead: false }, { isRead: true });
    } else if (id) {
      await Notification.updateOne({ _id: id, userId: user.id }, { isRead: true });
    }

    const unreadCount = await Notification.countDocuments({ userId: user.id, isRead: false });

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update notification" },
      { status: error.status || 500 }
    );
  }
}
