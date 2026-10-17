import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ReportSnapshot, Project, Task, WeeklyUpdate, Discrepancy } from "@/models";
import { requireAuth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can generate frozen historical report snapshots" },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await req.json();
    const { periodType = "weekly", projectId = null } = body;

    const now = new Date();
    const periodStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const periodEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    const [projects, tasks, weeklyUpdates, discrepancies] = await Promise.all([
      Project.find({ isArchived: false }).lean(),
      Task.find({ isArchived: false }).lean(),
      WeeklyUpdate.find().lean(),
      Discrepancy.find().lean(),
    ]);

    const totalEst = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
    const totalLag = projects.reduce((acc, p) => acc + (p.lagInDays || 0), 0);

    const metrics = {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === "Active").length,
      totalLagDays: totalLag,
      totalEstimatedHours: totalEst,
      totalLoggedHours: totalLogged,
      effortVarianceHours: totalLogged - totalEst,
      openDiscrepancies: discrepancies.filter((d) => d.status === "Open").length,
    };

    const snapshot = await ReportSnapshot.create({
      periodType,
      periodStart,
      periodEnd,
      projectId: projectId || null,
      metrics,
      frozenData: {
        projectsCount: projects.length,
        tasksCount: tasks.length,
        weeklyUpdatesCount: weeklyUpdates.length,
        discrepanciesCount: discrepancies.length,
      },
      generatedBy: user.id,
    });

    await logAuditEvent({
      actor: { userId: user.id, name: user.name, role: user.role, email: user.email },
      action: "CREATE",
      entityType: "ReportSnapshot",
      entityId: snapshot._id.toString(),
      after: { periodType, periodStart, periodEnd, metrics },
    });

    return NextResponse.json({ success: true, data: snapshot });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create snapshot" },
      { status: error.status || 500 }
    );
  }
}
