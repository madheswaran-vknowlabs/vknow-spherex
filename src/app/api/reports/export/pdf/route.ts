import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Stage, Task, Discrepancy, WeeklyUpdate, User, DailyWorkUpdate } from "@/models";
import { requireAuth } from "@/lib/auth";
import { generateConsolidatedPDF, generateIndividualPDF } from "@/lib/reports/pdf-generator";
import { format, subWeeks, subMonths, subYears } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";
    const selectedProjectId = searchParams.get("projectId");
    const requestedUserId = searchParams.get("userId");
    const isAdmin = user.role === "admin";
    const isManager = user.role === "manager";
    const canManage = isAdmin || isManager;
    const reportType = searchParams.get("type") || (canManage ? "consolidated" : "individual");
    const targetUserId = canManage ? requestedUserId : user.id;

    const now = new Date();
    let dateFilter: any = null;
    let periodLabel = "All Time";
    if (period === "weekly") {
      dateFilter = { $gte: subWeeks(now, 1) };
      periodLabel = "Past 7 Days";
    } else if (period === "monthly") {
      dateFilter = { $gte: subMonths(now, 1) };
      periodLabel = "Past 30 Days";
    } else if (period === "yearly") {
      dateFilter = { $gte: subYears(now, 1) };
      periodLabel = "Past 365 Days";
    }

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

    const taskQuery: any = { projectId: { $in: projectIds }, isArchived: false };
    if (targetUserId && targetUserId !== "ALL") {
      taskQuery.assigneeId = targetUserId;
    }

    const weeklyQuery: any = { projectId: { $in: projectIds } };
    if (targetUserId && targetUserId !== "ALL") {
      weeklyQuery.userId = targetUserId;
    }
    if (dateFilter) {
      weeklyQuery.weekStartDate = dateFilter;
    }

    // Daily Work Updates Query
    const dailyQuery: any = {};
    if (targetUserId && targetUserId !== "ALL") {
      dailyQuery.userId = targetUserId;
    } else if (user.role === "manager") {
      const myEmployees = await User.find({
        $or: [{ createdBy: user.id }, { managerId: user.id }, { _id: user.id }],
      }).select("_id");
      dailyQuery.userId = { $in: myEmployees.map((e) => e._id) };
    }
    if (dateFilter) {
      dailyQuery.date = dateFilter;
    }

    const [tasks, stages, discrepancies, weeklyUpdates, dailyWorkUpdates] = await Promise.all([
      Task.find(taskQuery)
        .populate("projectId", "name code client")
        .populate("stageId", "name order")
        .populate("assigneeId", "name email department")
        .lean(),
      Stage.find({ projectId: { $in: projectIds }, isArchived: false })
        .populate("projectId", "code name")
        .populate("signOff.approvedBy", "name")
        .lean(),
      Discrepancy.find({ projectId: { $in: projectIds } })
        .populate("projectId", "name code")
        .populate("stageId", "name")
        .populate("taskId", "title")
        .populate("raisedById", "name")
        .lean(),
      WeeklyUpdate.find(weeklyQuery)
        .populate("userId", "name department")
        .populate("projectId", "name code")
        .sort({ weekStartDate: -1 })
        .lean(),
      DailyWorkUpdate.find(dailyQuery).sort({ date: -1 }).lean(),
    ]);

    const totalEst = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const totalLogged = tasks.reduce((acc, t) => acc + (t.loggedHours || 0), 0);
    const totalLag = projects.reduce((acc, p) => acc + (p.lagInDays || 0), 0);
    const onTimeTasks = tasks.filter((t) => (t.lagInDays || 0) === 0);
    const onTimeRate = tasks.length > 0 ? Math.round((onTimeTasks.length / tasks.length) * 100) : 100;

    let pdfBuffer: Buffer;
    let fileName = `VKnow-SphereX-Report-${format(new Date(), "yyyyMMdd")}.pdf`;

    if (!isAdmin || reportType === "individual") {
      const targetUserDoc = targetUserId ? await User.findById(targetUserId).lean() : user;
      pdfBuffer = await generateIndividualPDF({
        user: targetUserDoc || user,
        summary: {
          totalEstimatedHours: totalEst,
          totalLoggedHours: totalLogged,
          effortVarianceHours: totalLogged - totalEst,
          onTimeRate,
        },
        tasks,
        weeklyUpdates,
        dailyWorkUpdates,
        periodLabel,
      });
      fileName = `VKnow-${(targetUserDoc?.name || user.name).replace(/\s+/g, "_")}-Report.pdf`;
    } else {
      pdfBuffer = await generateConsolidatedPDF({
        summary: {
          totalProjects: projects.length,
          activeProjects: projects.filter((p) => p.status === "Active").length,
          totalLagDays: totalLag,
          avgLagDays: projects.length > 0 ? Math.round((totalLag / projects.length) * 10) / 10 : 0,
          totalEstimatedHours: totalEst,
          totalLoggedHours: totalLogged,
          effortVarianceHours: totalLogged - totalEst,
          effortVariancePercent: totalEst > 0 ? Math.round(((totalLogged - totalEst) / totalEst) * 100) : 0,
          openDiscrepanciesCount: discrepancies.filter((d) => d.status === "Open" || d.status === "In Review").length,
          criticalDiscrepanciesCount: discrepancies.filter((d) => d.severity === "Critical").length,
          atRiskTasksCount: tasks.filter((t) => t.isAtRisk).length,
          onTimeRate,
        },
        projects,
        stages,
        tasks,
        weeklyUpdates,
        discrepancies,
        dailyWorkUpdates,
        periodLabel,
        generatedBy: user.name,
      });
      fileName = `VKnow-SphereX-Consolidated-Report-${format(new Date(), "yyyyMMdd")}.pdf`;
    }

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("PDF_EXPORT_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export PDF report" },
      { status: error.status || 500 }
    );
  }
}
