"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FileBarChart2,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Loader2,
  FolderKanban,
  CheckSquare,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function MyReportsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<"all" | "weekly" | "monthly" | "yearly">("all");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"tasks" | "weekly">("tasks");

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== "all") params.append("period", period);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load individual report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [period]);

  const tasks = data?.tasks || [];
  const weeklyUpdates = data?.weeklyUpdates || [];
  const summary = data?.summary || {
    totalEstimatedHours: 0,
    totalLoggedHours: 0,
    effortVarianceHours: 0,
    onTimeRate: 100,
  };

  const completedTasks = tasks.filter((t: any) => t.status === "Completed");
  const inProgressTasks = tasks.filter((t: any) => t.status === "In Progress");
  const atRiskTasks = tasks.filter((t: any) => t.isAtRisk || (t.lagInDays || 0) > 0);
  const completionPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter((t: any) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "Completed") return t.status === "Completed";
    if (statusFilter === "In Progress") return t.status === "In Progress";
    if (statusFilter === "At Risk") return t.isAtRisk || (t.lagInDays || 0) > 0;
    return true;
  });

  const getExcelDownloadUrl = () => {
    const params = new URLSearchParams({ type: "individual" });
    if (period !== "all") params.append("period", period);
    return `/api/reports/export/excel?${params.toString()}`;
  };

  const getPdfDownloadUrl = () => {
    const params = new URLSearchParams({ type: "individual" });
    if (period !== "all") params.append("period", period);
    return `/api/reports/export/pdf?${params.toString()}`;
  };

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#00b0ef]" />
        <span className="text-sm font-medium">Generating your personal performance summary...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & 1-Click Exports */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="cyan" className="font-semibold text-xs tracking-wide">
              Individual Performance View
            </Badge>
            <span className="text-xs text-slate-400">
              Role: {(session?.user as any)?.role || "Team Member"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>My Work &amp; Performance Report</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1.5 max-w-2xl">
            Track your completed deliverables, logged hours variance, on-time delivery rate, and download official work reports.
          </p>
        </div>

        {/* 1-Click Export Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <a
            href={getExcelDownloadUrl()}
            download
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </a>

          <a
            href={getPdfDownloadUrl()}
            download
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-sm shadow-xs transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Download PDF (.pdf)</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar: Time Period */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#00b0ef]" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Reporting Timeframe:</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          {(["all", "weekly", "monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                period === p
                  ? "bg-white dark:bg-slate-900 text-[#00b0ef] shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {p === "all" ? "All Time" : p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards: Ultra Simple & Readable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deliverables */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">My Deliverables</span>
            <CheckSquare className="w-5 h-5 text-[#00b0ef]" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {tasks.length}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">{completedTasks.length} Completed</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">{inProgressTasks.length} Active</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Task Completion</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {completionPercent}%
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        {/* Hours Logged */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Hours Logged</span>
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {summary.totalLoggedHours || 0}h
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2">
            Estimated: {summary.totalEstimatedHours || 0}h (
            <span
              className={
                (summary.effortVarianceHours || 0) > 0
                  ? "text-rose-600 font-bold"
                  : "text-emerald-600 font-bold"
              }
            >
              {(summary.effortVarianceHours || 0) > 0 ? "+" : ""}
              {summary.effortVarianceHours || 0}h variance
            </span>
            )
          </div>
        </div>

        {/* On-Time Delivery */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">On-Time Rate</span>
            <TrendingUp className="w-5 h-5 text-[#00b0ef]" />
          </div>
          <div className="text-3xl font-extrabold text-[#00b0ef]">
            {summary.onTimeRate ?? 100}%
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2">
            {atRiskTasks.length === 0 ? (
              <span className="text-emerald-600 font-bold">100% on schedule</span>
            ) : (
              <span className="text-rose-600 font-bold">{atRiskTasks.length} slipped / at risk</span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs for My Reports */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "tasks"
              ? "bg-[#00b0ef] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>My Assigned Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("weekly")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "weekly"
              ? "bg-[#00b0ef] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Weekly Submissions ({weeklyUpdates.length})</span>
        </button>
      </div>

      {/* Tab 1: Tasks Table */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Quick Sub-Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
            {(["ALL", "In Progress", "Completed", "At Risk"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === st
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No deliverables found</h3>
              <p className="text-xs text-slate-500 mt-1">
                There are no tasks matching the selected filter in this timeframe.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Task / Deliverable</th>
                      <th className="py-3.5 px-4">Project &amp; Stage</th>
                      <th className="py-3.5 px-4 text-center">Priority</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Progress</th>
                      <th className="py-3.5 px-4 text-center">Hours</th>
                      <th className="py-3.5 px-4 text-center">Planned Due</th>
                      <th className="py-3.5 px-4 text-right">Schedule Lag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTasks.map((task: any) => {
                      const lag = task.lagInDays || 0;
                      return (
                        <tr
                          key={task._id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            <div>{task.title}</div>
                            {task.description && (
                              <div className="text-xs text-slate-400 truncate max-w-sm font-normal">
                                {task.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              {task.projectId?.name || "Project"}
                            </div>
                            <div className="text-[11px] text-[#00b0ef] font-medium">
                              {task.stageId?.name || "Stage"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant={
                                task.priority === "Urgent"
                                  ? "destructive"
                                  : task.priority === "High"
                                  ? "amber"
                                  : "secondary"
                              }
                              className="text-[11px] px-2 py-0.5"
                            >
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant={
                                task.status === "Completed"
                                  ? "green"
                                  : task.status === "In Progress"
                                  ? "cyan"
                                  : task.status === "Blocked"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[11px] px-2 py-0.5"
                            >
                              {task.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {task.percentComplete || 0}%
                              </span>
                              <div className="w-14 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#00b0ef] h-full rounded-full"
                                  style={{ width: `${task.percentComplete || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs font-mono">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {task.loggedHours || 0}h
                            </span>
                            <span className="text-slate-400"> / {task.estimatedHours || 0}h</span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-xs text-slate-600 dark:text-slate-400">
                            {task.plannedEndDate
                              ? format(new Date(task.plannedEndDate), "dd MMM yyyy")
                              : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {lag === 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                On Time
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                +{lag}d Late
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Weekly Updates Table */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          {weeklyUpdates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No weekly updates found</h3>
              <p className="text-xs text-slate-500 mt-1">
                You have not filed any weekly progress reports in this timeframe.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyUpdates.map((update: any) => (
                <div
                  key={update._id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#00b0ef]">
                        {update.projectId?.name || "Project"}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        Week of {format(new Date(update.weekStartDate), "dd MMM yyyy")}
                      </h4>
                    </div>
                    <Badge variant="cyan" className="font-mono text-xs">
                      {update.hoursSpent || 0} hrs
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Work Completed:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-wrap">
                        {update.workCompleted || "None noted"}
                      </p>
                    </div>

                    {update.blockers && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                        <span className="font-bold text-rose-700 dark:text-rose-300">Blockers:</span>
                        <p className="text-rose-600 dark:text-rose-400 mt-0.5">
                          {update.blockers}
                        </p>
                      </div>
                    )}

                    {update.planForNextWeek && (
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Next Week Plan:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                          {update.planForNextWeek}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Submitted {format(new Date(update.createdAt), "dd MMM yyyy, hh:mm a")}</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Filed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
