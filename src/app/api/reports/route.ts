import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Stage, Task, Discrepancy, WeeklyUpdate, User, ReportSnapshot } from "@/models";
import { requireAuth } from "@/lib/auth";
import { subWeeks, subMonths, subYears, startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all"; // "weekly" | "monthly" | "yearly" | "all"
    const selectedProjectId = searchParams.get("projectId");
    const requestedUserId = searchParams.get("userId");

    // ROLE ENFORCEMENT:
    const isAdmin = user.role === "admin";
    const isManager = user.role === "manager";
    const canManage = isAdmin || isManager;
    const targetUserId = canManage ? requestedUserId : user.id;

    // Date range filter
    const now = new Date();
    let dateFilter: any = null;
    if (period === "weekly") {
      dateFilter = { $gte: subWeeks(now, 1) };
    } else if (period === "monthly") {
      dateFilter = { $gte: subMonths(now, 1) };
    } else if (period === "yearly") {
      dateFilter = { $gte: subYears(now, 1) };
    }

    // 1. Projects Query
    const projectQuery: any = { isArchived: false };
    if (!isAdmin && !isManager) {
      projectQuery.members = user.id;
    } else if (isManager && !selectedProjectId) {
      projectQuery.$or = [{ members: user.id }, { createdBy: user.id }];
    }
    if (selectedProjectId && selectedProjectId !== "ALL") {
      projectQuery._id = selectedProjectId;
    }

    const projects = await Project.find(projectQuery).lean();
    const projectIds = projects.map((p) => p._id);

    // 2. Tasks Query
    const taskQuery: any = { projectId: { $in: projectIds }, isArchived: false };
    if (targetUserId && targetUserId !== "ALL") {
      taskQuery.assigneeId = targetUserId;
    }

    // 3. Weekly Updates Query
    const weeklyQuery: any = { projectId: { $in: projectIds } };
    if (targetUserId && targetUserId !== "ALL") {
      weeklyQuery.userId = targetUserId;
    }
    if (dateFilter) {
      weeklyQuery.weekStartDate = dateFilter;
    }

    // 4. Discrepancies Query
    const discrepancyQuery: any = { projectId: { $in: projectIds } };
    if (!isAdmin) {
      discrepancyQuery.$or = [{ raisedById: user.id }, { projectId: { $in: projectIds } }];
    }

    const [tasks, stages, discrepancies, weeklyUpdates, allUsers] = await Promise.all([
      Task.find(taskQuery)
        .populate("projectId", "name code client")
        .populate("stageId", "name order")
        .populate("assigneeId", "name email department avatar")
        .lean(),
      Stage.find({ projectId: { $in: projectIds }, isArchived: false })
        .populate("projectId", "code name")
        .populate("signOff.approvedBy", "name email")
        .sort({ order: 1 })
        .lean(),
      Discrepancy.find(discrepancyQuery)
        .populate("projectId", "name code")
        .populate("stageId", "name")
        .populate("taskId", "title")
        .populate("raisedById", "name email")
        .lean(),
      WeeklyUpdate.find(weeklyQuery)
        .populate("userId", "name department email avatar")
        .populate("projectId", "name code")
        .sort({ weekStartDate: -1 })
        .lean(),
      canManage ? User.find({ isActive: true }).select("name email department role avatar").lean() : [],
    ]);

    // Metrics calculations
    const totalEst = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
    const totalLag = projects.reduce((acc, p) => acc + (p.lagInDays || 0), 0);
    const openDiscrepancies = discrepancies.filter((d) => d.status === "Open" || d.status === "In Review");
    const criticalDiscrepancies = discrepancies.filter(
      (d) => d.severity === "Critical" && d.status !== "Resolved" && d.status !== "Closed"
    );
    const atRiskTasks = tasks.filter((t) => t.isAtRisk);
    const onTimeTasks = tasks.filter((t) => (t.lagInDays || 0) === 0);
    const onTimeRate = tasks.length > 0 ? Math.round((onTimeTasks.length / tasks.length) * 100) : 100;

    return NextResponse.json({
      success: true,
      data: {
        isAdmin,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
        summary: {
          totalProjects: projects.length,
          activeProjects: projects.filter((p) => p.status === "Active").length,
          totalLagDays: totalLag,
          avgLagDays: projects.length > 0 ? Math.round((totalLag / projects.length) * 10) / 10 : 0,
          totalEstimatedHours: totalEst,
          totalLoggedHours: totalLogged,
          effortVarianceHours: Math.round((totalLogged - totalEst) * 10) / 10,
          effortVariancePercent: totalEst > 0 ? Math.round(((totalLogged - totalEst) / totalEst) * 100) : 0,
          openDiscrepanciesCount: openDiscrepancies.length,
          criticalDiscrepanciesCount: criticalDiscrepancies.length,
          atRiskTasksCount: atRiskTasks.length,
          onTimeRate,
        },
        projects,
        stages,
        tasks,
        weeklyUpdates,
        discrepancies,
        users: allUsers,
      },
    });
  } catch (error: any) {
    console.error("REPORTS_API_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate report dataset" },
      { status: error.status || 500 }
    );
  }
}
