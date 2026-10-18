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
  dailyWorkUpdates?: any[];
  teamMembers?: any[];
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
  // Sheet 3: Team Hierarchy & Roster (Which employee comes under which manager)
  // -------------------------------------------------------------
  if (reportData.teamMembers && reportData.teamMembers.length > 0) {
    const teamSheet = wb.addWorksheet("Team Hierarchy & Roster", {
      views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
    });

    const tmHeaders = [
      "Employee Name",
      "Work Email",
      "Department",
      "Role / Designation",
      "Reporting Manager",
      "Manager Email",
      "Direct Reports Count",
      "Direct Reports (Team)",
      "Assigned Tasks",
      "Total Logged Hours",
      "Effort Variance (Hrs)",
      "Account Status",
    ];
    const tmHeaderRow = teamSheet.addRow(tmHeaders);
    formatHeaderRow(tmHeaderRow);

    reportData.teamMembers.forEach((tm: any) => {
      const r = teamSheet.addRow([
        tm.name || "-",
        tm.email || "-",
        tm.department || "Engineering",
        tm.role?.toUpperCase() || "EMPLOYEE",
        tm.reportingManager || "Direct / Leadership",
        tm.managerEmail || "-",
        tm.directReportsCount > 0 ? `${tm.directReportsCount} Members` : "-",
        tm.directReportsList || "-",
        tm.assignedTasksCount || 0,
        tm.loggedHours || 0,
        tm.varianceHours !== undefined ? tm.varianceHours : 0,
        tm.isActive ? "Active" : "Inactive",
      ]);
      r.eachCell((c) => (c.border = BORDER_THIN));
    });

    teamSheet.autoFilter = { from: "A1", to: `L${reportData.teamMembers.length + 1}` };
    autoFitColumns(teamSheet);
  }

  // -------------------------------------------------------------
  // Sheet 4: Stages & Sign-offs
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
  // Sheet 5: Tasks & Deliverables
  // -------------------------------------------------------------
  const taskSheet = wb.addWorksheet("Tasks", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const tHeaders = [
    "Task Title",
    "Project",
    "Stage",
    "Assignee",
    "Reporting Manager",
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
      t.assigneeManagerName || t.reportingManager || "Direct / Leadership",
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

  taskSheet.autoFilter = { from: "A1", to: `M${reportData.tasks.length + 1}` };
  autoFitColumns(taskSheet);

  // -------------------------------------------------------------
  // Sheet 6: Weekly Updates Log
  // -------------------------------------------------------------
  const weeklySheet = wb.addWorksheet("Weekly Updates", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const wHeaders = [
    "Team Member",
    "Reporting Manager",
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
      w.reportingManagerName || w.reportingManager || "Direct / Leadership",
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

  weeklySheet.autoFilter = { from: "A1", to: `J${reportData.weeklyUpdates.length + 1}` };
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

  // -------------------------------------------------------------
  // Sheet 7: Daily Work Updates & Task Logs
  // -------------------------------------------------------------
  if (reportData.dailyWorkUpdates && reportData.dailyWorkUpdates.length > 0) {
    const dailySheet = wb.addWorksheet("Daily Work Updates", {
      views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
    });

    const dailyHeaders = [
      "Date",
      "Employee Name",
      "Email",
      "Department",
      "Role",
      "Reporting Manager",
      "Work Location",
      "Day Type",
      "Status",
      "Leave Type / Reason",
      "Day Total Hours",
      "Project Code",
      "Project Name",
      "Module / Stage",
      "Deliverable / Task",
      "Time Interval",
      "Task Hours",
      "Task Status",
      "Blockers / Notes",
    ];
    const dailyHeaderRow = dailySheet.addRow(dailyHeaders);
    formatHeaderRow(dailyHeaderRow);

    reportData.dailyWorkUpdates.forEach((u) => {
      const mgrName = u.reportingManagerName || u.reportingManager || "Direct / Leadership";
      if (u.tasks && u.tasks.length > 0) {
        u.tasks.forEach((t: any) => {
          const r = dailySheet.addRow([
            u.dateString || (u.date ? format(new Date(u.date), "yyyy-MM-dd") : "-"),
            u.userName || "-",
            u.userEmail || "-",
            u.department || "Engineering",
            u.userRole?.toUpperCase() || "-",
            mgrName,
            u.workLocation || "In Office",
            u.dayType || "Work Day",
            u.status === "on_leave" ? "On Leave" : "Present",
            u.status === "on_leave" ? u.leaveType || u.leaveReason || "On Leave" : "-",
            u.totalHours || 0,
            t.projectId?.code || "-",
            t.projectName || "-",
            t.stageName || "-",
            t.title || "-",
            t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : "-",
            t.hours || 0,
            t.taskStatus || "Completed",
            t.blockers || u.generalNotes || "-",
          ]);
          r.eachCell((c) => (c.border = BORDER_THIN));
        });
      } else {
        const r = dailySheet.addRow([
          u.dateString || (u.date ? format(new Date(u.date), "yyyy-MM-dd") : "-"),
          u.userName || "-",
          u.userEmail || "-",
          u.department || "Engineering",
          u.userRole?.toUpperCase() || "-",
          mgrName,
          u.workLocation || "In Office",
          u.dayType || (u.status === "on_leave" ? "Non Work Day" : "Work Day"),
          u.status === "on_leave" ? "On Leave" : "Present",
          u.status === "on_leave" ? u.leaveType || u.leaveReason || "On Leave" : "-",
          u.totalHours || 0,
          "-",
          "-",
          "-",
          u.status === "on_leave" ? `Leave: ${u.leaveType || "Scheduled"}` : "No deliverables listed",
          "-",
          0,
          u.status === "on_leave" ? "On Leave" : "Completed",
          u.leaveReason || u.generalNotes || "-",
        ]);
        r.eachCell((c) => (c.border = BORDER_THIN));
      }
    });

    autoFitColumns(dailySheet);
  }

  // -------------------------------------------------------------
  // Sheet 8: Consolidated Attendance Summary
  // -------------------------------------------------------------
  if (reportData.dailyWorkUpdates && reportData.dailyWorkUpdates.length > 0) {
    const attSheet = wb.addWorksheet("Consolidated Attendance", {
      views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
    });

    const attHeaders = [
      "Employee Name",
      "Email",
      "Department",
      "Role",
      "Reporting Manager",
      "In Office Days",
      "Work From Home Days",
      "Client Site Days",
      "Work Days Count",
      "Non Work Days Count",
      "Festival Days Count",
      "Leave Days Count",
      "Total Logged Hours",
      "Avg Hours / Work Day",
    ];
    const attHeaderRow = attSheet.addRow(attHeaders);
    formatHeaderRow(attHeaderRow);

    const userMap = new Map<string, any>();
    reportData.dailyWorkUpdates.forEach((u) => {
      const uId = u.userId?.toString() || u.userEmail;
      if (!userMap.has(uId)) {
        userMap.set(uId, {
          name: u.userName || "-",
          email: u.userEmail || "-",
          department: u.department || "Engineering",
          role: u.userRole?.toUpperCase() || "EMPLOYEE",
          reportingManager: u.reportingManagerName || u.reportingManager || "Direct / Leadership",
          inOffice: 0,
          wfh: 0,
          clientSite: 0,
          workDays: 0,
          nonWorkDays: 0,
          festivalDays: 0,
          leaves: 0,
          totalHours: 0,
        });
      }
      const record = userMap.get(uId);
      if (u.status === "on_leave") {
        record.leaves++;
      } else {
        if (u.workLocation === "Work From Home") record.wfh++;
        else if (u.workLocation === "Client Site") record.clientSite++;
        else record.inOffice++;

        if (u.dayType === "Festival Day") record.festivalDays++;
        else if (u.dayType === "Non Work Day") record.nonWorkDays++;
        else record.workDays++;

        record.totalHours += u.totalHours || 0;
      }
    });

    Array.from(userMap.values()).forEach((emp) => {
      const avg = emp.workDays > 0 ? Math.round((emp.totalHours / emp.workDays) * 10) / 10 : 0;
      const r = attSheet.addRow([
        emp.name,
        emp.email,
        emp.department,
        emp.role,
        emp.reportingManager,
        emp.inOffice,
        emp.wfh,
        emp.clientSite,
        emp.workDays,
        emp.nonWorkDays,
        emp.festivalDays,
        emp.leaves,
        emp.totalHours,
        avg,
      ]);
      r.eachCell((c) => (c.border = BORDER_THIN));
    });

    autoFitColumns(attSheet);
  }

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
  dailyWorkUpdates?: any[];
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
    ["Member Name", userData.user.name || "-"],
    ["Department", userData.user.department || "Engineering"],
    ["System Role", userData.user.role?.toUpperCase() || "EMPLOYEE"],
    ["Reporting Manager", userData.user.reportingManager || userData.user.managerId?.name || "Direct / Leadership"],
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

  // -------------------------------------------------------------
  // Sheet 4: My Daily Work Updates
  // -------------------------------------------------------------
  if (userData.dailyWorkUpdates && userData.dailyWorkUpdates.length > 0) {
    const dailySheet = wb.addWorksheet("My Daily Work Updates", {
      views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
    });

    const dailyHeaders = [
      "Date",
      "Work Location",
      "Day Type",
      "Status",
      "Leave Type / Reason",
      "Total Day Hours",
      "Project Code",
      "Project Name",
      "Module / Stage",
      "Deliverable / Task",
      "Time (From - To)",
      "Task Hours",
      "Task Status",
      "Blockers / Notes",
    ];
    const dailyHeaderRow = dailySheet.addRow(dailyHeaders);
    formatHeaderRow(dailyHeaderRow);

    userData.dailyWorkUpdates.forEach((u) => {
      if (u.tasks && u.tasks.length > 0) {
        u.tasks.forEach((t: any) => {
          const r = dailySheet.addRow([
            u.dateString || (u.date ? format(new Date(u.date), "yyyy-MM-dd") : "-"),
            u.workLocation || "In Office",
            u.dayType || "Work Day",
            u.status === "on_leave" ? "On Leave" : "Present",
            u.status === "on_leave" ? u.leaveType || u.leaveReason || "On Leave" : "-",
            u.totalHours || 0,
            t.projectId?.code || "-",
            t.projectName || "-",
            t.stageName || "-",
            t.title || "-",
            t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : "-",
            t.hours || 0,
            t.taskStatus || "Completed",
            t.blockers || u.generalNotes || "-",
          ]);
          r.eachCell((c) => (c.border = BORDER_THIN));
        });
      } else {
        const r = dailySheet.addRow([
          u.dateString || (u.date ? format(new Date(u.date), "yyyy-MM-dd") : "-"),
          u.workLocation || "In Office",
          u.dayType || (u.status === "on_leave" ? "Non Work Day" : "Work Day"),
          u.status === "on_leave" ? "On Leave" : "Present",
          u.status === "on_leave" ? u.leaveType || u.leaveReason || "On Leave" : "-",
          u.totalHours || 0,
          "-",
          "-",
          "-",
          u.status === "on_leave" ? `Leave: ${u.leaveType || "Scheduled"}` : "No task deliverables listed",
          "-",
          0,
          u.status === "on_leave" ? "On Leave" : "Completed",
          u.leaveReason || u.generalNotes || "-",
        ]);
        r.eachCell((c) => (c.border = BORDER_THIN));
      }
    });

    autoFitColumns(dailySheet);
  }

  const rawBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
}

/**
 * Builds a dedicated Attendance & Consolidated Workbook for Admin and Managers
 * Supports Day-wise, Week-wise, and Month-wise attendance reporting
 */
export async function buildAttendanceExcel(attendanceData: {
  period: string; // "day" | "week" | "month"
  periodLabel: string;
  startDateStr: string;
  endDateStr: string;
  daysList: string[];
  teamSummary: any;
  staffConsolidated: any[];
  updates: any[];
  generatedBy?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "VKnow SphereX Attendance Engine";
  wb.created = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Consolidated Attendance Summary
  // -------------------------------------------------------------
  const summarySheet = wb.addWorksheet("Attendance Summary", {
    views: [{ showGridLines: true }],
  });

  summarySheet.mergeCells("A1:G1");
  const tCell = summarySheet.getCell("A1");
  tCell.value = `VKNOW SPHEREX — ${attendanceData.period.toUpperCase()} ATTENDANCE SUMMARY`;
  tCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF" + BRAND_DARK } };
  tCell.alignment = { vertical: "middle" };
  summarySheet.getRow(1).height = 32;

  summarySheet.getCell("A2").value = `Period: ${attendanceData.periodLabel} (${attendanceData.startDateStr} to ${attendanceData.endDateStr}) | Generated by: ${attendanceData.generatedBy || "Manager / Admin"} on ${format(new Date(), "dd MMM yyyy, HH:mm")}`;
  summarySheet.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF64748B" } };

  summarySheet.addRow([]); // Blank row

  // Summary Metrics Table
  const s = attendanceData.teamSummary || {};
  const metrics = [
    ["Total Staff Members", s.totalMembers || attendanceData.staffConsolidated.length],
    ["Total Logged Engineering Hours", `${s.totalLoggedHours || 0} hrs`],
    ["Total In-Office Days", s.inOfficeCount || 0],
    ["Total Work From Home (WFH) Days", s.wfhCount || 0],
    ["Total Work Days Logged", s.workDayCount || 0],
    ["Total Festival / Holiday Days", s.festivalDayCount || 0],
    ["Total Non-Work / Weekend Days", s.nonWorkDayCount || 0],
    ["Total Leave Days", s.leaveCount || 0],
    ["Average Hours / Work Day", `${s.avgHoursPerWorkDay || 0} hrs`],
  ];

  metrics.forEach(([label, val]) => {
    const row = summarySheet.addRow([label, val]);
    row.getCell(1).font = { name: "Calibri", size: 11, bold: true };
    row.getCell(1).border = BORDER_THIN;
    row.getCell(2).font = { name: "Calibri", size: 11, color: { argb: "FF" + BRAND_DARK } };
    row.getCell(2).border = BORDER_THIN;
  });

  summarySheet.addRow([]); // Blank row

  // Employee Breakdown Table
  const headerRow = summarySheet.addRow([
    "Employee Name",
    "Email",
    "Department",
    "Role",
    "Reporting Manager",
    "In Office",
    "Work From Home",
    "Work Days",
    "Festival Days",
    "Non Work Days",
    "Leave Days",
    "Total Hours",
    "Avg Hours / Day",
  ]);
  formatHeaderRow(headerRow);

  attendanceData.staffConsolidated.forEach((staff) => {
    const emp = staff.employee || staff;
    const r = summarySheet.addRow([
      emp.name || "-",
      emp.email || "-",
      emp.department || "Engineering",
      emp.role?.toUpperCase() || "EMPLOYEE",
      staff.reportingManager || emp.reportingManager || emp.managerId?.name || "Direct / Leadership",
      staff.inOfficeDays || 0,
      staff.wfhDays || 0,
      staff.workDays || 0,
      staff.festivalDays || 0,
      staff.nonWorkDays || 0,
      staff.leaveDays || 0,
      staff.totalHours || 0,
      staff.avgHoursPerDay || 0,
    ]);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  autoFitColumns(summarySheet);

  // -------------------------------------------------------------
  // Sheet 2: Attendance Register (Day-by-Day Matrix)
  // -------------------------------------------------------------
  const matrixSheet = wb.addWorksheet("Attendance Register", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 1, showGridLines: true }],
  });

  const matrixHeaders = [
    "Employee Name",
    "Department",
    "Reporting Manager",
    ...attendanceData.daysList.map((d) => {
      try {
        return format(new Date(d), "dd MMM (EEE)");
      } catch {
        return d;
      }
    }),
  ];

  const mHeaderRow = matrixSheet.addRow(matrixHeaders);
  formatHeaderRow(mHeaderRow);

  attendanceData.staffConsolidated.forEach((staff) => {
    const emp = staff.employee || staff;
    const recordsMap = new Map();
    if (staff.dailyRecords) {
      staff.dailyRecords.forEach((dr: any) => recordsMap.set(dr.dateString, dr));
    }

    const rowValues = [
      emp.name || "-",
      emp.department || "Engineering",
      staff.reportingManager || emp.reportingManager || emp.managerId?.name || "Direct / Leadership",
      ...attendanceData.daysList.map((dayStr) => {
        const rec = recordsMap.get(dayStr);
        if (!rec) return "-";
        if (rec.status === "on_leave") return `Leave (${rec.leaveType || "Leave"})`;
        if (rec.dayType === "Festival Day") return `Festival (${rec.totalHours || 0}h)`;
        if (rec.dayType === "Non Work Day") return `Non-Work (${rec.totalHours || 0}h)`;
        const loc = rec.workLocation === "Work From Home" ? "WFH" : "Office";
        return `${loc} (${rec.totalHours || 0}h)`;
      }),
    ];

    const r = matrixSheet.addRow(rowValues);
    r.eachCell((c) => (c.border = BORDER_THIN));
  });

  autoFitColumns(matrixSheet);

  // -------------------------------------------------------------
  // Sheet 3: Detailed Deliverable Task Logs
  // -------------------------------------------------------------
  const logsSheet = wb.addWorksheet("Detailed Task Logs", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  const logHeaders = [
    "Date",
    "Employee",
    "Department",
    "Reporting Manager",
    "Work Location",
    "Day Type",
    "Project",
    "Module / Stage",
    "Deliverable / Task",
    "Time (From - To)",
    "Hours",
    "Status",
    "Notes / Blockers",
  ];
  const logHeaderRow = logsSheet.addRow(logHeaders);
  formatHeaderRow(logHeaderRow);

  attendanceData.updates.forEach((u) => {
    const mgrName = u.reportingManager || u.reportingManagerName || "-";
    if (u.tasks && u.tasks.length > 0) {
      u.tasks.forEach((t: any) => {
        const r = logsSheet.addRow([
          u.dateString || "-",
          u.userName || "-",
          u.department || "Engineering",
          mgrName,
          u.workLocation || "In Office",
          u.dayType || "Work Day",
          t.projectName || "-",
          t.stageName || "-",
          t.title || "-",
          t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : "-",
          t.hours || 0,
          t.taskStatus || "Completed",
          t.blockers || u.generalNotes || "-",
        ]);
        r.eachCell((c) => (c.border = BORDER_THIN));
      });
    } else {
      const r = logsSheet.addRow([
        u.dateString || "-",
        u.userName || "-",
        u.department || "Engineering",
        mgrName,
        u.workLocation || "In Office",
        u.dayType || (u.status === "on_leave" ? "Non Work Day" : "Work Day"),
        "-",
        "-",
        u.status === "on_leave" ? `Leave: ${u.leaveType || "Scheduled"}` : "General Logging",
        "-",
        u.totalHours || 0,
        u.status === "on_leave" ? "On Leave" : "Completed",
        u.leaveReason || u.generalNotes || "-",
      ]);
      r.eachCell((c) => (c.border = BORDER_THIN));
    }
  });

  autoFitColumns(logsSheet);

  const rawBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(rawBuffer);
}
