import connectDB from "@/lib/db";
import { Notification, User } from "@/models";
import { sendNotificationEmail } from "@/lib/email";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type:
    | "task_assigned"
    | "task_overdue"
    | "task_blocked"
    | "dependency_slipped"
    | "stage_approval_needed"
    | "stage_approved"
    | "stage_rejected"
    | "weekly_reminder"
    | "discrepancy_raised"
    | "discrepancy_resolved"
    | "system";
  link?: string;
  emailNotify?: boolean;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    await connectDB();

    const notif = await Notification.create({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || "",
      isRead: false,
    });

    if (params.emailNotify) {
      const user = await User.findById(params.userId).select("email name").lean();
      if (user?.email) {
        await sendNotificationEmail({
          to: user.email,
          subject: `[VKnow SphereX] ${params.title}`,
          title: params.title,
          message: params.message,
          actionText: "View Details in SphereX",
          actionUrl: params.link,
        });
      }
    }

    return notif;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}
