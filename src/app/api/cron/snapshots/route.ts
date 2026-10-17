import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Stage, Task, Discrepancy, ReportSnapshot } from "@/models";
import { startOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const urlSecret = req.nextUrl.searchParams.get("key");
  if (urlSecret === cronSecret) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized cron access" }, { status: 401 });
  }

  try {
    await connectDB();

    const periodType = req.nextUrl.searchParams.get("period") || "weekly";
    const now = new Date();
    const periodStart = startOfWeek(now, { weekStartsOn: 1 });

    const [projects, tasks, discrepancies] = await Promise.all([
      Project.find({ isArchived: false }).lean(),
      Task.find({ isArchived: false }).lean(),
      Discrepancy.find().lean(),
    ]);

    const totalEst = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
    const totalLag = projects.reduce((acc, p) => acc + (p.lagInDays || 0), 0);

    const snapshot = await ReportSnapshot.create({
      projectId: null, // Portfolio-wide
      periodType,
      periodStart,
      periodEnd: now,
      metrics: {
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.status === "Active").length,
        totalLagDays: totalLag,
        totalEstimatedHours: totalEst,
        totalLoggedHours: totalLogged,
        effortVarianceHours: totalLogged - totalEst,
        openDiscrepanciesCount: discrepancies.filter((d) => d.status === "Open" || d.status === "In Review").length,
      },
      frozenData: {
        projectsCount: projects.length,
        tasksCount: tasks.length,
        discrepanciesCount: discrepancies.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Frozen ${periodType} report snapshot generated successfully`,
      data: { snapshotId: snapshot._id },
    });
  } catch (error: any) {
    console.error("CRON_SNAPSHOT_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create cron snapshot" },
      { status: 500 }
    );
  }
}
