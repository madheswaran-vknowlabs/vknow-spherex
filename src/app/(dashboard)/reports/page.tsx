"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FileBarChart2,
  Download,
  Calendar,
  Filter,
  Users,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingDown,
  Layers,
  Archive,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoolDropdown, CoolDropdownOption } from "@/components/ui/cool-select";
import { format } from "date-fns";

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<"all" | "weekly" | "monthly" | "yearly">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"projects" | "team" | "compliance" | "tasks">("projects");
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  // Redirect non-admins to /my-reports
  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "admin") {
        router.replace("/my-reports");
      }
    }
  }, [session, status, router]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== "all") params.append("period", period);
      if (selectedProjectId !== "ALL") params.append("projectId", selectedProjectId);
      if (selectedUserId !== "ALL") params.append("userId", selectedUserId);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "admin") {
      fetchReports();
    }
  }, [period, selectedProjectId, selectedUserId, session, status]);

  const handleDownloadExcel = () => {
    const params = new URLSearchParams();
    if (period !== "all") params.append("period", period);
    if (selectedProjectId !== "ALL") params.append("projectId", selectedProjectId);
    if (selectedUserId !== "ALL") {
      params.append("userId", selectedUserId);
      params.append("type", "individual");
    } else {
      params.append("type", "consolidated");
    }
    window.open(`/api/reports/export/excel?${params.toString()}`, "_blank");
  };

  const handleDownloadPDF = () => {
    const params = new URLSearchParams();
    if (period !== "all") params.append("period", period);
    if (selectedProjectId !== "ALL") params.append("projectId", selectedProjectId);
    if (selectedUserId !== "ALL") {
      params.append("userId", selectedUserId);
      params.append("type", "individual");
    } else {
      params.append("type", "consolidated");
    }
    window.open(`/api/reports/export/pdf?${params.toString()}`, "_blank");
  };

  const handleCreateSnapshot = async () => {
    if (!confirm("Freeze and archive current period data snapshot? Historical reports will preserve these values.")) return;
    setSnapshotLoading(true);
    try {
      const res = await fetch("/api/reports/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodType: period === "all" ? "monthly" : period,
          projectId: selectedProjectId !== "ALL" ? selectedProjectId : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert("Snapshot successfully archived!");
      } else {
        alert(json.error || "Failed to create snapshot");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSnapshotLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#00b0ef]" />
        <span className="text-sm">Preparing Team Reports &amp; Aggregations...</span>
      </div>
    );
  }

  const summary = data?.summary || {};
  const projects = data?.projects || [];
  const tasks = data?.tasks || [];
  const weeklyUpdates = data?.weeklyUpdates || [];
  const users = data?.users || [];
  const discrepancies = data?.discrepancies || [];

  return (
    <div className="space-y-6">
      {/* Top Header Strip with 1-Click Fast Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00b0ef]/10 text-[#00b0ef] flex items-center justify-center">
              <FileBarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Team Reports &amp; Delivery Exports
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Consolidated portfolio rollups, multi-sheet Excel workbooks, and executive PDF reports.
              </p>
            </div>
          </div>
        </div>

        {/* 1-Click Download Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleDownloadExcel}
            className="rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-semibold text-sm h-10 px-4 flex items-center gap-2 shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </Button>

          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="rounded-xl border-[#00b0ef]/40 text-[#007ea8] dark:text-[#00b0ef] hover:bg-[#00b0ef]/10 font-semibold text-sm h-10 px-4 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Download PDF (.pdf)</span>
          </Button>

          <Button
            onClick={handleCreateSnapshot}
            disabled={snapshotLoading}
            variant="ghost"
            className="rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold h-10 px-3.5 flex items-center gap-2"
            title="Freeze and archive historical snapshot"
          >
            <Archive className="w-4 h-4 text-slate-400" />
            <span>{snapshotLoading ? "Archiving..." : "Freeze Snapshot"}</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar (Cool, Modern Dropdowns) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Dropdown */}
          <CoolDropdown
            label="Period"
            icon={Calendar}
            value={period}
            onChange={(val) => setPeriod(val as any)}
            options={[
              { value: "all", label: "All Time", sublabel: "Historical aggregation" },
              { value: "weekly", label: "Past 7 Days", sublabel: "Weekly sprint view" },
              { value: "monthly", label: "Past 30 Days", sublabel: "Monthly cycle view" },
              { value: "yearly", label: "Past 365 Days", sublabel: "Yearly executive view" },
            ]}
          />

          {/* Project Dropdown */}
          <CoolDropdown
            label="Project"
            icon={FolderKanban}
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            minWidth="min-w-[280px]"
            options={[
              { value: "ALL", label: `All Projects (${projects.length})`, sublabel: "Full enterprise portfolio" },
              ...projects.map((p: any) => ({
                value: p._id,
                label: p.name,
                sublabel: `Code: [${p.code}] • Client: ${p.client || "Internal"}`,
                badge: p.health,
              })),
            ]}
          />

          {/* Team Member Dropdown */}
          <CoolDropdown
            label="Member"
            icon={Users}
            value={selectedUserId}
            onChange={setSelectedUserId}
            minWidth="min-w-[260px]"
            options={[
              { value: "ALL", label: `All Team Members (${users.length})`, sublabel: "Consolidated team capacity" },
              ...users.map((u: any) => ({
                value: u._id,
                label: u.name,
                sublabel: `${u.department || "Engineering"} • ${u.role}`,
              })),
            ]}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchReports}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#00b0ef]" />
          <span>Reset Filters</span>
        </Button>
      </div>

      {/* High-Level Rollup Metrics (4 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Projects Included
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {summary.totalProjects || 0}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {summary.activeProjects || 0} active in lifecycle
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Total Engineering Hours
          </span>
          <div className="text-3xl font-black text-[#00b0ef]">
            {summary.totalLoggedHours || 0}h
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Est: {summary.totalEstimatedHours || 0}h ({summary.effortVarianceHours || 0}h variance)
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Cumulative Schedule Lag
          </span>
          <div
            className={`text-3xl font-black ${
              summary.totalLagDays > 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            +{summary.totalLagDays || 0} days
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Avg +{summary.avgLagDays || 0} days / project
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            On-Time Delivery Rate
          </span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.onTimeRate || 100}%
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {summary.openDiscrepanciesCount || 0} open discrepancies
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "projects"
              ? "bg-[#00b0ef] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Portfolio Summary ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "team"
              ? "bg-[#00b0ef] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Capacity &amp; Hours</span>
        </button>

        <button
          onClick={() => setActiveTab("compliance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "compliance"
              ? "bg-[#00b0ef] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Weekly Updates Log ({weeklyUpdates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "tasks"
              ? "bg-[#00b0ef] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Deliverables &amp; Tasks ({tasks.length})</span>
        </button>
      </div>

      {/* TAB 1: PROJECTS PORTFOLIO SUMMARY */}
      {activeTab === "projects" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Project Delivery &amp; Lag Status
            </h3>
            <span className="text-xs text-slate-500">Export includes complete stage breakdowns</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-5">Code</th>
                  <th className="py-3 px-5">Project Name</th>
                  <th className="py-3 px-5">Client</th>
                  <th className="py-3 px-5">Health</th>
                  <th className="py-3 px-5">Schedule Lag</th>
                  <th className="py-3 px-5">Progress</th>
                  <th className="py-3 px-5">Planned End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {projects.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-5 font-mono text-xs font-bold text-slate-500">{p.code}</td>
                    <td className="py-3 px-5 font-bold text-slate-900 dark:text-slate-100">{p.name}</td>
                    <td className="py-3 px-5 text-slate-500">{p.client || "Internal"}</td>
                    <td className="py-3 px-5">
                      <Badge
                        variant={p.health === "Green" ? "outline" : "destructive"}
                        className={`text-xs font-bold ${
                          p.health === "Green"
                            ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                            : p.health === "Amber"
                            ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                            : "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/30"
                        }`}
                      >
                        {p.health}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 font-bold">
                      <span className={p.lagInDays > 5 ? "text-rose-600" : p.lagInDays > 0 ? "text-amber-600" : "text-emerald-600"}>
                        {p.lagInDays > 0 ? `+${p.lagInDays} days` : "On Time"}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-[#00b0ef] h-2 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-slate-500">
                      {p.plannedEndDate ? format(new Date(p.plannedEndDate), "dd MMM yyyy") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM CAPACITY & HOURS */}
      {activeTab === "team" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Team Member Hours &amp; Capacity Allocation
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-5">Team Member</th>
                  <th className="py-3 px-5">Department</th>
                  <th className="py-3 px-5">Assigned Deliverables</th>
                  <th className="py-3 px-5">Estimated Hours</th>
                  <th className="py-3 px-5">Logged Hours</th>
                  <th className="py-3 px-5">Effort Variance</th>
                  <th className="py-3 px-5 text-right">Individual Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u: any) => {
                  const userTasks = tasks.filter(
                    (t: any) =>
                      t.assigneeId?._id?.toString() === u._id.toString() ||
                      t.assigneeId?.toString() === u._id.toString()
                  );
                  const est = userTasks.reduce((acc: number, t: any) => acc + (t.estimatedHours || 0), 0);
                  const log = userTasks.reduce((acc: number, t: any) => acc + (t.loggedHours || 0), 0);
                  const variance = log - est;

                  return (
                    <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-900 dark:text-slate-100">{u.name}</td>
                      <td className="py-3 px-5 text-slate-500">{u.department || "Engineering"}</td>
                      <td className="py-3 px-5 font-semibold">{userTasks.length} tasks</td>
                      <td className="py-3 px-5 text-slate-500">{est} hrs</td>
                      <td className="py-3 px-5 font-semibold text-[#00b0ef]">{log} hrs</td>
                      <td className="py-3 px-5 font-semibold">
                        <span className={variance > 0 ? "text-rose-500" : "text-emerald-500"}>
                          {variance > 0 ? `+${variance} hrs` : `${variance} hrs`}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.open(`/api/reports/export/excel?userId=${u._id}&type=individual`, "_blank");
                          }}
                          className="rounded-lg text-xs font-semibold h-8 px-2.5 gap-1"
                        >
                          <Download className="w-3.5 h-3.5 text-[#00b0ef]" />
                          <span>Export Member Excel</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY UPDATE LOGS */}
      {activeTab === "compliance" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Weekly Update Submissions History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-5">Member</th>
                  <th className="py-3 px-5">Project</th>
                  <th className="py-3 px-5">Week #</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Hours</th>
                  <th className="py-3 px-5">Deliverables Summary</th>
                  <th className="py-3 px-5">Blockers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {weeklyUpdates.map((w: any) => (
                  <tr key={w._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-5 font-bold text-slate-900 dark:text-slate-100">
                      {w.userId?.name || "-"}
                    </td>
                    <td className="py-3 px-5 text-slate-500">{w.projectId?.name || "-"}</td>
                    <td className="py-3 px-5 font-semibold text-[#00b0ef]">Wk {w.weekNumber || "-"}</td>
                    <td className="py-3 px-5 text-slate-500">
                      {w.weekStartDate ? format(new Date(w.weekStartDate), "dd MMM yyyy") : "-"}
                    </td>
                    <td className="py-3 px-5 font-semibold">{w.hoursSpent || 0} hrs</td>
                    <td className="py-3 px-5 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {w.summary || "-"}
                    </td>
                    <td className="py-3 px-5 text-slate-500 max-w-xs truncate">{w.blockers || "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DELIVERABLES & TASKS */}
      {activeTab === "tasks" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              All Deliverables &amp; Tasks Registry
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-5">Title</th>
                  <th className="py-3 px-5">Project</th>
                  <th className="py-3 px-5">Assignee</th>
                  <th className="py-3 px-5">Priority</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Est / Logged</th>
                  <th className="py-3 px-5">Lag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.map((t: any) => (
                  <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-5 font-bold text-slate-900 dark:text-slate-100">{t.title}</td>
                    <td className="py-3 px-5 text-slate-500">[{t.projectId?.code}] {t.projectId?.name}</td>
                    <td className="py-3 px-5 font-medium">{t.assigneeId?.name || "Unassigned"}</td>
                    <td className="py-3 px-5">
                      <Badge variant="outline" className="text-xs">{t.priority || "Medium"}</Badge>
                    </td>
                    <td className="py-3 px-5">
                      <Badge variant="secondary" className="text-xs">{t.status}</Badge>
                    </td>
                    <td className="py-3 px-5 font-medium">
                      {t.estimatedHours || 0}h / {t.loggedHours || 0}h
                    </td>
                    <td className="py-3 px-5 font-bold">
                      <span className={t.lagInDays > 0 ? "text-rose-600" : "text-emerald-600"}>
                        {t.lagInDays > 0 ? `+${t.lagInDays}d` : "On Time"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
