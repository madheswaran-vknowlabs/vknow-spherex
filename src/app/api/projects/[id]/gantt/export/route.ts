import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Project, Stage, Task } from "@/models";
import { requireAuth } from "@/lib/auth";
import { buildGanttExcel, generateGanttPDF } from "@/lib/reports/gantt-export";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const exportFormat = searchParams.get("format") || "excel"; // "excel" | "pdf"

    // Project Access Check
    const project = await Project.findById(id).lean();
    if (!project || project.isArchived) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    if (user.role !== "admin" && !project.members?.some((m: any) => String(m) === String(user.id))) {
      return NextResponse.json({ success: false, error: "Unauthorized project access" }, { status: 403 });
    }

    // Fetch stages and tasks
    const [stages, tasks] = await Promise.all([
      Stage.find({ projectId: id, isArchived: false })
        .populate("ownerId", "name email")
        .sort({ order: 1 })
        .lean(),
      Task.find({ projectId: id, isArchived: false })
        .populate("assigneeId", "name email department")
        .sort({ order: 1, plannedStartDate: 1 })
        .lean(),
    ]);

    const sanitizedCode = (project.code || "PROJECT").replace(/[^a-zA-Z0-9_-]/g, "_");

    if (exportFormat === "pdf") {
      const pdfBuffer = await generateGanttPDF(project, stages, tasks);
      const fileName = `${sanitizedCode}-Gantt-Timeline-${format(new Date(), "yyyyMMdd")}.pdf`;

      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
      });
    } else {
      const excelBuffer = await buildGanttExcel(project, stages, tasks);
      const fileName = `${sanitizedCode}-Gantt-Timeline-${format(new Date(), "yyyyMMdd")}.xlsx`;

      return new Response(new Uint8Array(excelBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (error: any) {
    console.error("GANTT_EXPORT_API_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export Gantt timeline" },
      { status: error.status || 500 }
    );
  }
}
