import ExcelJS from "exceljs";
import { format } from "date-fns";

// Color palettes for VKnow Brand
const BRAND_CYAN = "00B0EF";
const BRAND_DARK = "007EA8";
const BG_HEADER = "F1F5F9";
const HEADER_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FF" + BRAND_CYAN },
};
const HEADER_FONT = {
  name: "Calibri",
  size: 11,
  bold: true,
  color: { argb: "FFFFFFFF" },
};
const BORDER_THIN = {
  top: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  left: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  right: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
};

function formatHeaderRow(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = BORDER_THIN;
  });
}

function autoFitColumns(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) {
        maxLen = Math.min(val.length + 3, 50);
      }
    });
    col.width = maxLen;
  });
}

/**
 * Builds the Consolidated & Detailed Engineering Workbook for Admins
 */
export async function buildConsolidatedExcel(reportData: {
  summary: any;
  projects: any[];
  stages: any[];
  tasks: any[];
  weeklyUpdates: any[];
  discrepancies: any[];
  auditLogs?: any[];
  periodLabel?: string;
  generatedBy?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "VKnow SphereX Lifecycle Engine";
  wb.created = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Executive Portfolio Summary
  // -------------------------------------------------------------
  const summarySheet = wb.addWorksheet("Portfolio Summary", {
    views: [{ showGridLines: true }],
  });

  summarySheet.mergeCells("A1:E1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "VKNOW SPHEREX — EXECUTIVE PORTFOLIO SUMMARY";
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF" + BRAND_DARK } };
  titleCell.alignment = { vertical: "middle" };
  summarySheet.getRow(1).height = 32;

  summarySheet.getCell("A2").value = `Generated on: ${format(new Date(), "dd MMM yyyy, HH:mm")} | Report Period: ${reportData.periodLabel || "All Time"}`;
  summarySheet.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF64748B" } };

  summarySheet.addRow([]); // Blank row

  // Summary Metrics Table
  const s = reportData.summary || {};
  const metricsData = [
    ["Total Tracked Projects", s.totalProjects || 0],
    ["Active Lifecycle Projects", s.activeProjects || 0],
    ["Total Schedule Lag (Cumulative Days)", `${s.totalLagDays || 0} days`],
    ["Average Lag per Project", `${s.avgLagDays || 0} days`],
    ["Total Planned / Estimated Hours", `${s.totalEstimatedHours || 0} hrs`],
    ["Total Logged Engineering Hours", `${s.totalLoggedHours || 0} hrs`],
    ["Effort Variance", `${s.effortVarianceHours || 0} hrs (${s.effortVariancePercent || 0}%)`],
    ["Open Blockers & Discrepancies", s.openDiscrepanciesCount || 0],
    ["Critical Discrepancies", s.criticalDiscrepanciesCount || 0],
    ["Tasks at Risk from Predecessor Slips", s.atRiskTasksCount || 0],
    ["Portfolio On-Time Delivery Rate", `${s.onTimeRate || 100}%`],
  ];

  const mHeader = summarySheet.addRow(["Metric", "Portfolio Value"]);
  formatHeaderRow(mHeader);

  metricsData.forEach(([metric, val]) => {
    const r = summarySheet.addRow([metric, val]);
    r.getCell(1).font = { bold: true };
    r.getCell(1).border = BORDER_THIN;
    r.getCell(2).border = BORDER_THIN;
  });

  autoFitColumns(summarySheet);

  // -------------------------------------------------------------
  // Sheet 2: Projects Roster
  // -------------------------------------------------------------
  const projSheet = wb.addWorksheet("Projects", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const pHeaders = [
    "Project Code",
    "Project Name",
    "Client",
    "Status",
    "Health",
    "Progress (%)",
    "Schedule Lag (Days)",
    "Planned Start",
    "Planned End",
    "Team Members Count",
  ];
  const pHeaderRow = projSheet.addRow(pHeaders);
  formatHeaderRow(pHeaderRow);

  reportData.projects.forEach((p) => {
    const r = projSheet.addRow([
      p.code,
      p.name,
      p.client || "Internal",
      p.status,
      p.health,
      p.progress || 0,
      p.lagInDays || 0,
      p.plannedStartDate ? format(new Date(p.plannedStartDate), "yyyy-MM-dd") : "-",
      p.plannedEndDate ? format(new Date(p.plannedEndDate), "yyyy-MM-dd") : "-",
      p.members?.length || 0,
    ]);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  projSheet.autoFilter = { from: "A1", to: `J${reportData.projects.length + 1}` };
  autoFitColumns(projSheet);

  // -------------------------------------------------------------
  // Sheet 3: Stages & Sign-offs
  // -------------------------------------------------------------
  const stageSheet = wb.addWorksheet("Stages", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const stHeaders = [
    "Project Code",
    "Stage #",
    "Stage Name",
    "Status",
    "% Complete",
    "Lag (Days)",
    "Planned Start",
    "Planned End",
    "Approved By",
    "Approved Date",
  ];
  const stHeaderRow = stageSheet.addRow(stHeaders);
  formatHeaderRow(stHeaderRow);

  reportData.stages.forEach((stg) => {
    const r = stageSheet.addRow([
      stg.projectId?.code || stg.projectCode || "-",
      stg.order,
      stg.name,
      stg.status,
      stg.progress || 0,
      stg.lagInDays || 0,
      stg.plannedStartDate ? format(new Date(stg.plannedStartDate), "yyyy-MM-dd") : "-",
      stg.signOff?.approvedBy?.name || stg.approvedBy?.name || "-",
      stg.signOff?.approvedAt
        ? format(new Date(stg.signOff.approvedAt), "yyyy-MM-dd")
        : stg.approvedAt
        ? format(new Date(stg.approvedAt), "yyyy-MM-dd")
        : "-",
    ]);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  stageSheet.autoFilter = { from: "A1", to: `J${reportData.stages.length + 1}` };
  autoFitColumns(stageSheet);

  // -------------------------------------------------------------
  // Sheet 4: Tasks & Deliverables
  // -------------------------------------------------------------
  const taskSheet = wb.addWorksheet("Tasks", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const tHeaders = [
    "Task Title",
    "Project",
    "Stage",
    "Assignee",
    "Priority",
    "Status",
    "Est. Hours",
    "Logged Hours",
    "Variance (Hrs)",
    "Lag (Days)",
    "Planned Due Date",
    "At Risk?",
  ];
  const tHeaderRow = taskSheet.addRow(tHeaders);
  formatHeaderRow(tHeaderRow);

  reportData.tasks.forEach((t) => {
    const est = t.estimatedHours || 0;
    const log = t.loggedHours || 0;
    const r = taskSheet.addRow([
      t.title,
      t.projectId?.name || t.projectId?.code || "-",
      t.stageId?.name || "-",
      t.assigneeId?.name || "Unassigned",
      t.priority || "Medium",
      t.status,
      est,
      log,
      log - est,
      t.lagInDays || 0,
      t.plannedEndDate ? format(new Date(t.plannedEndDate), "yyyy-MM-dd") : "-",
      t.isAtRisk ? "YES" : "No",
    ]);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  taskSheet.autoFilter = { from: "A1", to: `L${reportData.tasks.length + 1}` };
  autoFitColumns(taskSheet);

  // -------------------------------------------------------------
  // Sheet 5: Weekly Updates Log
  // -------------------------------------------------------------
  const weeklySheet = wb.addWorksheet("Weekly Updates", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const wHeaders = [
    "Team Member",
    "Project",
    "Week Start Date",
    "Week #",
    "Hours Spent",
    "Work Completed",
    "Blockers Encountered",
    "Plan for Next Week",
    "Submitted Date",
  ];
  const wHeaderRow = weeklySheet.addRow(wHeaders);
  formatHeaderRow(wHeaderRow);

  reportData.weeklyUpdates.forEach((w) => {
    const r = weeklySheet.addRow([
      w.userId?.name || "-",
      w.projectId?.name || "-",
      w.weekStartDate ? format(new Date(w.weekStartDate), "yyyy-MM-dd") : "-",
      w.weekNumber || "-",
      w.hoursSpent || 0,
      w.summary || "-",
      w.blockers || "None",
      w.nextWeekPlan || "-",
      w.submittedAt ? format(new Date(w.submittedAt), "yyyy-MM-dd HH:mm") : "-",
    ]);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  weeklySheet.autoFilter = { from: "A1", to: `I${reportData.weeklyUpdates.length + 1}` };
  autoFitColumns(weeklySheet);

  // -------------------------------------------------------------
  // Sheet 6: Discrepancies & Blockers
  // -------------------------------------------------------------
  const discSheet = wb.addWorksheet("Discrepancies", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const dHeaders = [
    "Type",
    "Severity",
    "Project",
    "Stage",
    "Deliverable",
    "Description",
    "Raised By",
    "Status",
    "Date Raised",
    "Resolution Notes",
  ];
  const dHeaderRow = discSheet.addRow(dHeaders);
  formatHeaderRow(dHeaderRow);

  reportData.discrepancies.forEach((d) => {
    const r = discSheet.addRow([
      d.type,
      d.severity,
      d.projectId?.name || "-",
      d.stageId?.name || "-",
      d.taskId?.title || "-",
      d.description,
      d.raisedById?.name || "-",
      d.status,
      d.createdAt ? format(new Date(d.createdAt), "yyyy-MM-dd") : "-",
      d.resolution || "Pending Resolution",
    ]);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  discSheet.autoFilter = { from: "A1", to: `J${reportData.discrepancies.length + 1}` };
  autoFitColumns(discSheet);

  // Write and return buffer
  const rawBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
}

/**
 * Builds the Individual Report Workbook for a Team Member
 */
export async function buildIndividualExcel(userData: {
  user: any;
  summary: any;
  tasks: any[];
  weeklyUpdates: any[];
  periodLabel?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "VKnow SphereX Lifecycle Engine";
  wb.created = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Member Summary
  // -------------------------------------------------------------
  const summarySheet = wb.addWorksheet("My Summary", {
    views: [{ showGridLines: true }],
  });

  summarySheet.mergeCells("A1:D1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `VKNOW SPHEREX — INDIVIDUAL REPORT: ${userData.user.name.toUpperCase()}`;
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FF" + BRAND_DARK } };
  titleCell.alignment = { vertical: "middle" };
  summarySheet.getRow(1).height = 30;

  summarySheet.getCell("A2").value = `Department: ${userData.user.department || "Engineering"} | Period: ${userData.periodLabel || "All Time"} | Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`;
  summarySheet.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF64748B" } };

  summarySheet.addRow([]); // Blank

  const s = userData.summary || {};
  const metrics = [
    ["Assigned Tasks Count", userData.tasks.length],
    ["Completed Deliverables", userData.tasks.filter((t) => t.status === "Completed").length],
    ["In Progress Tasks", userData.tasks.filter((t) => t.status === "In Progress").length],
    ["Total Logged Engineering Hours", `${s.totalLoggedHours || 0} hrs`],
    ["Total Estimated Baseline Hours", `${s.totalEstimatedHours || 0} hrs`],
    ["Effort Variance", `${s.effortVarianceHours || 0} hrs`],
    ["Weekly Updates Submitted", userData.weeklyUpdates.length],
    ["On-Time Task Delivery Rate", `${s.onTimeRate || 100}%`],
  ];

  const mHeader = summarySheet.addRow(["Individual Metric", "My Value"]);
  formatHeaderRow(mHeader);

  metrics.forEach(([label, val]) => {
    const r = summarySheet.addRow([label, val]);
    r.getCell(1).font = { bold: true };
    r.getCell(1).border = BORDER_THIN;
    r.getCell(2).border = BORDER_THIN;
  });

  autoFitColumns(summarySheet);

  // -------------------------------------------------------------
  // Sheet 2: My Assigned Deliverables
  // -------------------------------------------------------------
  const tasksSheet = wb.addWorksheet("My Assigned Deliverables", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const tHeaders = [
    "Task Title",
    "Project",
    "Stage",
    "Priority",
    "Status",
    "Est. Hours",
    "Logged Hours",
    "Variance (Hrs)",
    "Schedule Lag",
    "Due Date",
  ];
  const tHeaderRow = tasksSheet.addRow(tHeaders);
  formatHeaderRow(tHeaderRow);

  userData.tasks.forEach((t) => {
    const est = t.estimatedHours || 0;
    const log = t.loggedHours || 0;
    const r = tasksSheet.addRow([
      t.title,
      t.projectId?.name || t.projectId?.code || "-",
      t.stageId?.name || "-",
      t.priority || "Medium",
      t.status,
      est,
      log,
      log - est,
      t.lagInDays > 0 ? `+${t.lagInDays} days` : "On Time",
      t.plannedEndDate ? format(new Date(t.plannedEndDate), "yyyy-MM-dd") : "-",
    ]);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  tasksSheet.autoFilter = { from: "A1", to: `J${userData.tasks.length + 1}` };
  autoFitColumns(tasksSheet);

  // -------------------------------------------------------------
  // Sheet 3: My Weekly Updates
  // -------------------------------------------------------------
  const weeklySheet = wb.addWorksheet("My Weekly Submissions", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const wHeaders = [
    "Week #",
    "Week Start Date",
    "Project",
    "Hours Spent",
    "Work Completed",
    "Blockers Encountered",
    "Next Week Plan",
    "Submitted At",
  ];
  const wHeaderRow = weeklySheet.addRow(wHeaders);
  formatHeaderRow(wHeaderRow);

  userData.weeklyUpdates.forEach((w) => {
    const r = weeklySheet.addRow([
      w.weekNumber || "-",
      w.weekStartDate ? format(new Date(w.weekStartDate), "yyyy-MM-dd") : "-",
      w.projectId?.name || "-",
      w.hoursSpent || 0,
      w.summary || "-",
      w.blockers || "None",
      w.nextWeekPlan || "-",
      w.submittedAt ? format(new Date(w.submittedAt), "yyyy-MM-dd HH:mm") : "-",
    ]);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  weeklySheet.autoFilter = { from: "A1", to: `H${userData.weeklyUpdates.length + 1}` };
  autoFitColumns(weeklySheet);

  const rawBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
}
