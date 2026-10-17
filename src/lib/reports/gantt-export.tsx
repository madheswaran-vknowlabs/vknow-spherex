import ExcelJS from "exceljs";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { format, differenceInDays } from "date-fns";

// Color Palette
const BRAND_CYAN = "#00b0ef";
const BRAND_DARK = "#0f172a";
const COLOR_EMERALD = "#10b981";
const COLOR_AMBER = "#f59e0b";
const COLOR_ROSE = "#ef4444";
const BORDER_COLOR = "#e2e8f0";

// ---------------------------------------------------------------------------
// 1. EXCEL GANTT EXPORT
// ---------------------------------------------------------------------------
export async function buildGanttExcel(
  project: any,
  stages: any[],
  tasks: any[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "VKnow SphereX TRACKER";
  wb.created = new Date();

  const ws = wb.addWorksheet("Gantt Schedule", {
    views: [{ state: "frozen", ySplit: 5, showGridLines: true }],
  });

  // Title Banner
  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `[${project.code}] ${project.name} — GANTT TIMELINE SCHEDULE`;
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF00B0EF" },
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 36;

  // Metadata Subheader
  ws.mergeCells("A2:K2");
  const metaCell = ws.getCell("A2");
  metaCell.value = `Client: ${project.client || "Internal"} | Health: ${project.health} | Lag: +${project.lagInDays || 0} days | Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`;
  metaCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF475569" } };
  metaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  metaCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 22;

  // Empty row 3
  ws.getRow(3).height = 8;

  // Column Headers (Row 4)
  const headers = [
    "Type",
    "Stage / Order",
    "Milestone / Deliverable",
    "Status",
    "Progress",
    "Planned Start",
    "Planned End",
    "Duration (Days)",
    "Schedule Lag",
    "Assignee / Owner",
    "Dependencies",
  ];

  const headerRow = ws.getRow(4);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.eachCell((c) => {
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
    c.alignment = { vertical: "middle", horizontal: "center" };
    c.border = {
      top: { style: "thin", color: { argb: "FF94A3B8" } },
      bottom: { style: "medium", color: { argb: "FF00B0EF" } },
    };
  });
  // Align name to left
  ws.getCell("C4").alignment = { vertical: "middle", horizontal: "left" };

  // Combine stages & their tasks in timeline sequence
  let currentRowIdx = 5;

  stages.forEach((stage: any) => {
    // Add Stage Milestone Row
    const stgStart = stage.plannedStartDate ? new Date(stage.plannedStartDate) : null;
    const stgEnd = stage.plannedEndDate ? new Date(stage.plannedEndDate) : null;
    const stgDuration = stgStart && stgEnd ? Math.max(1, differenceInDays(stgEnd, stgStart) + 1) : 0;

    const stageRow = ws.getRow(currentRowIdx++);
    stageRow.values = [
      "STAGE MILESTONE",
      `#${stage.order}`,
      stage.name.toUpperCase(),
      stage.status,
      `${stage.percentComplete || 0}%`,
      stgStart ? format(stgStart, "yyyy-MM-dd") : "-",
      stgEnd ? format(stgEnd, "yyyy-MM-dd") : "-",
      stgDuration,
      stage.lagInDays > 0 ? `+${stage.lagInDays}d` : "On Time",
      stage.ownerId?.name || "Unassigned",
      "",
    ];

    stageRow.height = 24;
    stageRow.eachCell((c) => {
      c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0F6FD" }, // Light cyan accent
      };
      c.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
      c.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getCell(`C${currentRowIdx - 1}`).alignment = { vertical: "middle", horizontal: "left" };

    // Find tasks belonging to this stage
    const stageTasks = tasks.filter((t: any) => {
      const sId = t.stageId?._id || t.stageId;
      return String(sId) === String(stage._id);
    });

    stageTasks.forEach((task: any) => {
      const tStart = task.plannedStartDate ? new Date(task.plannedStartDate) : null;
      const tEnd = task.plannedEndDate ? new Date(task.plannedEndDate) : null;
      const tDuration = tStart && tEnd ? Math.max(1, differenceInDays(tEnd, tStart) + 1) : 0;

      const taskRow = ws.getRow(currentRowIdx++);
      taskRow.values = [
        "Task Deliverable",
        `#${stage.order}`,
        `   ↳ ${task.title}`,
        task.status,
        `${task.percentComplete || 0}%`,
        tStart ? format(tStart, "yyyy-MM-dd") : "-",
        tEnd ? format(tEnd, "yyyy-MM-dd") : "-",
        tDuration,
        task.lagInDays > 0 ? `+${task.lagInDays}d late` : "On Time",
        task.assigneeId?.name || "Unassigned",
        task.blockedBy?.length ? `Blocked by ${task.blockedBy.length}` : "-",
      ];

      taskRow.height = 20;
      taskRow.eachCell((c) => {
        c.font = { name: "Arial", size: 9 };
        c.border = {
          bottom: { style: "thin", color: { argb: "FFF1F5F9" } },
        };
        c.alignment = { vertical: "middle", horizontal: "center" };
      });
      ws.getCell(`C${currentRowIdx - 1}`).alignment = { vertical: "middle", horizontal: "left" };
    });
  });

  // Auto-fit columns
  ws.columns.forEach((col, idx) => {
    let maxLen = 14;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) maxLen = Math.min(val.length + 3, 50);
    });
    col.width = maxLen;
  });
  ws.getColumn(3).width = 40; // Milestone title column wide

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// 2. PDF GANTT EXPORT (Server-side @react-pdf/renderer)
// ---------------------------------------------------------------------------
const pdfStyles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#1e293b",
  },
  headerBanner: {
    backgroundColor: BRAND_CYAN,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    color: "#ffffff",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    opacity: 0.9,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
  },
  kpiLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    color: "#ffffff",
    fontWeight: "bold",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowStage: {
    flexDirection: "row",
    backgroundColor: "#e0f6fd",
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontWeight: "bold",
  },
  tableRowTask: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  colType: { width: "16%" },
  colName: { width: "34%" },
  colDates: { width: "20%", textAlign: "center" },
  colStatus: { width: "12%", textAlign: "center" },
  colProgress: { width: "8%", textAlign: "center" },
  colLag: { width: "10%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderColor: BORDER_COLOR,
    paddingTop: 8,
  },
});

export async function generateGanttPDF(
  project: any,
  stages: any[],
  tasks: any[]
): Promise<Buffer> {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === "Completed").length;
  const totalLag = project.lagInDays || 0;

  const GanttDocument = () => (
    <Document>
      <Page size="A4" orientation="landscape" style={pdfStyles.page}>
        {/* Cover Header */}
        <View style={pdfStyles.headerBanner}>
          <Text style={pdfStyles.title}>
            [{project.code}] {project.name} — GANTT TIMELINE SCHEDULE
          </Text>
          <Text style={pdfStyles.subtitle}>
            Client: {project.client || "Internal"} • Generated: {format(new Date(), "dd MMMM yyyy")} • VKnow SphereX TRACKER
          </Text>
        </View>

        {/* KPI Strip */}
        <View style={pdfStyles.kpiRow}>
          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiLabel}>Project Health</Text>
            <Text
              style={[
                pdfStyles.kpiValue,
                {
                  color:
                    project.health === "Green"
                      ? COLOR_EMERALD
                      : project.health === "Amber"
                      ? COLOR_AMBER
                      : COLOR_ROSE,
                },
              ]}
            >
              {project.health}
            </Text>
          </View>

          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiLabel}>Overall Progress</Text>
            <Text style={pdfStyles.kpiValue}>{project.percentComplete || 0}%</Text>
          </View>

          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiLabel}>Schedule Lag</Text>
            <Text
              style={[
                pdfStyles.kpiValue,
                { color: totalLag > 0 ? COLOR_ROSE : COLOR_EMERALD },
              ]}
            >
              {totalLag > 0 ? `+${totalLag} days` : "On Time"}
            </Text>
          </View>

          <View style={pdfStyles.kpiCard}>
            <Text style={pdfStyles.kpiLabel}>Deliverables</Text>
            <Text style={pdfStyles.kpiValue}>
              {completedTasks} / {totalTasks} Completed
            </Text>
          </View>
        </View>

        {/* Schedule Timeline Table */}
        <Text style={pdfStyles.sectionTitle}>Gantt Schedule &amp; Milestone Breakdown</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colType}>Type</Text>
            <Text style={pdfStyles.colName}>Milestone / Deliverable</Text>
            <Text style={pdfStyles.colDates}>Planned Schedule</Text>
            <Text style={pdfStyles.colStatus}>Status</Text>
            <Text style={pdfStyles.colProgress}>Progress</Text>
            <Text style={pdfStyles.colLag}>Lag</Text>
          </View>

          {stages.map((stage: any) => {
            const stgStart = stage.plannedStartDate ? format(new Date(stage.plannedStartDate), "dd MMM") : "-";
            const stgEnd = stage.plannedEndDate ? format(new Date(stage.plannedEndDate), "dd MMM yyyy") : "-";
            const stageTasks = tasks.filter((t: any) => {
              const sId = t.stageId?._id || t.stageId;
              return String(sId) === String(stage._id);
            });

            return (
              <React.Fragment key={stage._id}>
                {/* Stage Header Row */}
                <View style={pdfStyles.tableRowStage}>
                  <Text style={[pdfStyles.colType, { color: "#007ea8" }]}>
                    Stage #{stage.order}
                  </Text>
                  <Text style={pdfStyles.colName}>{stage.name}</Text>
                  <Text style={pdfStyles.colDates}>
                    {stgStart} — {stgEnd}
                  </Text>
                  <Text style={pdfStyles.colStatus}>{stage.status}</Text>
                  <Text style={pdfStyles.colProgress}>{stage.percentComplete || 0}%</Text>
                  <Text
                    style={[
                      pdfStyles.colLag,
                      { color: (stage.lagInDays || 0) > 0 ? COLOR_ROSE : COLOR_EMERALD },
                    ]}
                  >
                    {(stage.lagInDays || 0) > 0 ? `+${stage.lagInDays}d` : "On Time"}
                  </Text>
                </View>

                {/* Granular Task Rows */}
                {stageTasks.map((t: any) => {
                  const tStart = t.plannedStartDate ? format(new Date(t.plannedStartDate), "dd MMM") : "-";
                  const tEnd = t.plannedEndDate ? format(new Date(t.plannedEndDate), "dd MMM") : "-";

                  return (
                    <View key={t._id} style={pdfStyles.tableRowTask}>
                      <Text style={[pdfStyles.colType, { color: "#64748b", fontSize: 8 }]}>
                        Deliverable
                      </Text>
                      <Text style={pdfStyles.colName}>
                        {"  ↳ " + t.title}
                        {t.assigneeId?.name ? ` (${t.assigneeId.name})` : ""}
                      </Text>
                      <Text style={pdfStyles.colDates}>
                        {tStart} — {tEnd}
                      </Text>
                      <Text style={pdfStyles.colStatus}>{t.status}</Text>
                      <Text style={pdfStyles.colProgress}>{t.percentComplete || 0}%</Text>
                      <Text
                        style={[
                          pdfStyles.colLag,
                          { color: (t.lagInDays || 0) > 0 ? COLOR_ROSE : COLOR_EMERALD },
                        ]}
                      >
                        {(t.lagInDays || 0) > 0 ? `+${t.lagInDays}d` : "On Time"}
                      </Text>
                    </View>
                  );
                })}
              </React.Fragment>
            );
          })}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>VKnow SphereX TRACKER • Confidential Enterprise Timeline</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(<GanttDocument />);
  return Buffer.from(buffer);
}
