import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { WeeklyUpdate, Task, Stage, Project, Setting, Notification, User } from "@/models";
import { requireAuth } from "@/lib/auth";
import { createWeeklyUpdateSchema } from "@/types/schemas";
import { logAuditEvent } from "@/lib/audit";
import { startOfWeek, endOfWeek, isAfter, setHours, setMinutes } from "date-fns";
import { syncProjectTracking } from "@/lib/lag-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");
    const year = searchParams.get("year");
    const weekNumber = searchParams.get("weekNumber");

    const query: any = {};

    if (user.role === "admin") {
      if (userId) query.userId = userId;
    } else if (user.role === "manager") {
      const myEmployees = await User.find({
        $or: [{ createdBy: user.id }, { managerId: user.id }],
      }).select("_id");
      const teamIds = [user.id, ...myEmployees.map((e) => e._id.toString())];
      if (userId && teamIds.includes(userId)) {
        query.userId = userId;
      } else {
        query.userId = { $in: teamIds };
      }
    } else {
      query.userId = user.id;
    }

    if (projectId) query.projectId = projectId;
    if (year) query.year = Number(year);
    if (weekNumber) query.weekNumber = Number(weekNumber);

    const updates = await WeeklyUpdate.find(query)
      .populate("userId", "name email avatar department")
      .populate("projectId", "name code client")
      .populate("taskUpdates.taskId", "title status priority")
      .sort({ weekStartDate: -1, submittedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: updates });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch weekly updates" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const body = await req.json();
    const validated = createWeeklyUpdateSchema.parse(body);

    const project = await Project.findById(validated.projectId);
    if (!project || project.isArchived) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const weekStartDate = new Date(validated.weekStartDate);
    const weekEndDate = new Date(validated.weekEndDate);
    const weekNumber = parseInt(
      new Intl.DateTimeFormat("en", { week: "numeric" } as any).format(weekStartDate) || "42"
    );
    const year = weekStartDate.getFullYear();

    // Check submission timeliness based on settings (e.g. Friday 17:00)
    const settings = await Setting.findOne().lean();
    const reminderDay = settings?.weeklyReminderDay ?? 5; // Friday
    const reminderTime = settings?.weeklyReminderTime || "17:00";
    const [remHour, remMin] = reminderTime.split(":").map(Number);

    const deadline = setMinutes(
      setHours(
        new Date(weekStartDate.getTime() + (reminderDay - 1) * 24 * 60 * 60 * 1000),
        remHour || 17
      ),
      remMin || 0
    );

    const isLate = isAfter(new Date(), deadline);

    // Upsert weekly update
    const filter = {
      userId: user.id,
      projectId: validated.projectId,
      weekStartDate: {
        $gte: startOfWeek(weekStartDate, { weekStartsOn: 1 }),
        $lte: endOfWeek(weekStartDate, { weekStartsOn: 1 }),
      },
    };

    const updateDoc = {
      userId: user.id,
      projectId: validated.projectId,
      weekStartDate,
      weekEndDate,
      weekNumber,
      year,
      workCompleted: validated.workCompleted.trim(),
      hoursSpent: validated.hoursSpent,
      taskUpdates: validated.taskUpdates,
      blockers: validated.blockers?.trim() || "",
      planNextWeek: validated.planNextWeek.trim(),
      submittedAt: new Date(),
      isLate,
    };

    const saved = await WeeklyUpdate.findOneAndUpdate(filter, updateDoc, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    // Automatically sync task progress and logged hours
    if (validated.taskUpdates && validated.taskUpdates.length > 0) {
      for (const item of validated.taskUpdates) {
        const isTaskDone = item.status === "Completed" || item.progress === 100;
        await Task.findByIdAndUpdate(item.taskId, {
          percentComplete: item.progress,
          status: item.status,
          $inc: { loggedHours: item.hours || 0 },
          ...(isTaskDone ? { actualEndDate: new Date() } : {}),
        });
      }

      // Sync all tracking, lag, risk cascades and project progress
      await syncProjectTracking(project._id);
    }

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "CREATE",
      entityType: "WeeklyUpdate",
      entityId: saved._id.toString(),
      projectId: project._id,
      after: {
        weekNumber,
        year,
        hoursSpent: validated.hoursSpent,
        isLate,
        tasksUpdated: validated.taskUpdates.length,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Weekly update for Week ${weekNumber} submitted successfully!`,
      data: saved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit weekly update" },
      { status: error.status || 400 }
    );
  }
}
