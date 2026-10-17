"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  BarChart3,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FrappeGantt, GanttItem } from "@/components/timeline/FrappeGantt";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"overview" | "gantt" | "team" | "projects">("overview");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAnalytics = async (projId = selectedProjectId) => {
    setLoading(true);
    try {
      const url =
        projId && projId !== "ALL"
          ? `/api/dashboard/analytics?projectId=${projId}`
          : "/api/dashboard/analytics";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedProjectId);
  }, [selectedProjectId]);

  if (!isMounted) return null;

  const summary = data?.summary || {
    totalProjects: 0,
    activeProjects: 0,
    totalLagDays: 0,
    avgLagDays: 0,
    totalEstimatedHours: 0,
    totalLoggedHours: 0,
    effortVarianceHours: 0,
    effortVariancePercent: 0,
    openDiscrepanciesCount: 0,
    criticalDiscrepanciesCount: 0,
    atRiskTasksCount: 0,
    onTimeRate: 100,
  };

  const healthDist = data?.healthDistribution || [
    { name: "Green (On Time)", count: 0, color: "#10b981" },
    { name: "Amber (At Risk)", count: 0, color: "#f59e0b" },
    { name: "Red (Critical)", count: 0, color: "#ef4444" },
  ];

  const lagTrend = data?.lagTrend || [];
  const teamWorkload = data?.teamWorkload || [];
  const stageFunnel = data?.stageFunnel || [];
  const projectsList = data?.projectsList || [];

  // Filter projects by health
  const filteredProjects = projectsList.filter((p: any) => {
    if (healthFilter === "ALL") return true;
    return p.health === healthFilter;
  });

  // Prepare Gantt items from all active projects
  const portfolioGanttItems: GanttItem[] = projectsList.map((p: any) => ({
    id: p._id,
    name: `[${p.code}] ${p.name}`,
    start: p.plannedStartDate || new Date(),
    end: p.plannedEndDate || new Date(),
    progress: p.progress || 0,
    type: "stage",
    status: p.status,
    lagInDays: p.lagInDays,
    isAtRisk: p.health === "Red" || p.health === "Amber",
  }));

  return (
    <div className="space-y-6">
      {/* Top Executive Header Strip */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00b0ef]/10 text-[#00b0ef] flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Executive Portfolio &amp; Gantt Center
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Live delivery health, schedule lag analytics, team effort variance, and Gantt tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Projects ({projectsList.length})</option>
              {projectsList.map((p: any) => (
                <option key={p._id} value={p._id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Health Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Health:</span>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Green">Green (On Time)</option>
              <option value="Amber">Amber (At Risk)</option>
              <option value="Red">Red (Critical)</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(selectedProjectId)}
            disabled={loading}
            className="rounded-xl flex items-center gap-2 text-sm font-medium h-10 px-4"
          >
            <RefreshCw className={`w-4 h-4 text-[#00b0ef] ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/projects">
            <Button className="rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white text-sm font-semibold h-10 px-4 flex items-center gap-2 shadow-xs">
              <FolderKanban className="w-4 h-4" />
              <span>Manage Projects</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* High-Impact KPI Metrics Strip (5 Cards across Widescreen) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Metric 1: Total & Active Projects */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Projects
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#00b0ef]/10 text-[#00b0ef] flex items-center justify-center">
              <FolderKanban className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {summary.activeProjects}
              <span className="text-sm font-normal text-slate-400 ml-1.5">/ {summary.totalProjects} total</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Full lifecycle tracking active</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Portfolio Lag */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Schedule Lag
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                summary.totalLagDays > 5
                  ? "bg-rose-500/10 text-rose-500"
                  : summary.totalLagDays > 0
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              <Clock className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div
              className={`text-3xl font-black ${
                summary.totalLagDays > 5
                  ? "text-rose-600"
                  : summary.totalLagDays > 0
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              +{summary.totalLagDays} <span className="text-sm font-semibold">days</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Avg: </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                +{summary.avgLagDays} days / project
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Effort Variance */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Effort Variance
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {summary.effortVarianceHours > 0 ? `+${summary.effortVarianceHours}` : summary.effortVarianceHours}{" "}
              <span className="text-sm font-semibold">hrs</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{summary.totalLoggedHours}h logged</span>
              <span className="font-semibold text-purple-600">
                {summary.effortVariancePercent > 0 ? `+${summary.effortVariancePercent}%` : `${summary.effortVariancePercent}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Discrepancies */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Open Discrepancies
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {summary.openDiscrepanciesCount}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{summary.criticalDiscrepanciesCount} critical severity</span>
            </div>
          </div>
        </div>

        {/* Metric 5: On-Time Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              On-Time Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.onTimeRate}%
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="text-amber-500 font-semibold">{summary.atRiskTasksCount} tasks</span>
              <span>at risk of slipping</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "overview"
                ? "bg-[#00b0ef] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Executive Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("gantt")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "gantt"
                ? "bg-[#00b0ef] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Portfolio Gantt Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "team"
                ? "bg-[#00b0ef] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Workload &amp; Hours</span>
          </button>

          <button
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "projects"
                ? "bg-[#00b0ef] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Project Health Roster</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          Auto-synchronized with MongoDB Aggregations
        </div>
      </div>

      {/* TAB 1: EXECUTIVE ANALYTICS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Charts Row: 2-Column Wide Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: 8-Week Schedule Lag & Effort Trend (Takes 2 Columns) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Schedule Lag &amp; Logged Hours Trend (8 Weeks)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Weekly rollup of average delivery lag alongside engineering hours invested.
                  </p>
                </div>
                <Badge variant="cyan" className="text-xs">
                  Weekly Rollup
                </Badge>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lagTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="lagGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00b0ef" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#00b0ef" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="weekLabel" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        color: "#fff",
                        borderRadius: "12px",
                        border: "none",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="avgLagDays"
                      name="Avg Lag (Days)"
                      stroke="#00b0ef"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#lagGradient)"
                      isAnimationActive={false}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="totalHoursLogged"
                      name="Hours Logged (hrs)"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#hoursGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Portfolio Health Distribution (Donut Chart) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Health Index Distribution
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    Thresholds
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mb-2">
                  Projects classified by automated lag thresholds.
                </p>

                <div className="h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        isAnimationActive={false}
                      >
                        {healthDist.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          color: "#fff",
                          borderRadius: "10px",
                          border: "none",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Health Legend Breakdown */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {healthDist.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between text-xs sm:text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {item.count} projects
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: Stage Progression Funnel + Team Quick Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stage Progression Bar Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Lifecycle Stage Distribution
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Active and completed stages across the portfolio.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  8-Stage Framework
                </Badge>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                    <YAxis dataKey="stageName" type="category" fontSize={11} stroke="#94a3b8" width={110} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        color: "#fff",
                        borderRadius: "10px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="completed" name="Completed / Approved" fill="#10b981" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                    <Bar dataKey="inProgress" name="In Progress" fill="#00b0ef" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Drill-down Projects Table */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      Portfolio Projects Roster
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      High-level status and lag tracking per project.
                    </p>
                  </div>
                  <Link href="/projects" className="text-xs font-semibold text-[#00b0ef] hover:underline flex items-center gap-1">
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProjects.slice(0, 4).map((p: any) => (
                    <div key={p._id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {p.name}
                          </span>
                          <span className="text-xs font-medium text-slate-400">[{p.code}]</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          Client: {p.client || "Internal"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Badge
                          variant={
                            p.health === "Green"
                              ? "outline"
                              : p.health === "Amber"
                              ? "destructive"
                              : "destructive"
                          }
                          className={`text-xs font-bold ${
                            p.health === "Green"
                              ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                              : p.health === "Amber"
                              ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                              : "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/30"
                          }`}
                        >
                          {p.health} {p.lagInDays > 0 ? `(+${p.lagInDays}d)` : "(0d)"}
                        </Badge>

                        <div className="w-16 hidden sm:block">
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#00b0ef] h-2 rounded-full"
                              style={{ width: `${p.progress || 0}%` }}
                            />
                          </div>
                        </div>

                        <Link href={`/projects/${p._id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:text-[#00b0ef]">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                <Button
                  onClick={() => setActiveTab("gantt")}
                  variant="outline"
                  className="w-full rounded-xl text-sm font-semibold h-10 border-[#00b0ef]/30 text-[#00b0ef] hover:bg-[#00b0ef]/10 flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Open Full Portfolio Gantt Timeline</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PORTFOLIO GANTT TIMELINE */}
      {activeTab === "gantt" && (
        <div className="space-y-4">
          <FrappeGantt
            items={portfolioGanttItems}
            title="Portfolio Gantt Timeline — Projects Overview"
            defaultViewMode="Week"
          />
        </div>
      )}

      {/* TAB 3: TEAM WORKLOAD & EFFORT VARIANCE */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Team Workload: Estimated vs Logged Hours
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Individual capacity utilization and effort overrun detection.
                </p>
              </div>
              <Badge variant="cyan" className="text-xs">
                Capacity Tracking
              </Badge>
            </div>

            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamWorkload} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="estimatedHours" name="Estimated (hrs)" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="loggedHours" name="Logged (hrs)" fill="#00b0ef" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Member Breakdown Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Resource Allocation &amp; On-Time Delivery Rate
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-5">Team Member</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5">Tasks</th>
                    <th className="py-3 px-5">Estimated</th>
                    <th className="py-3 px-5">Logged</th>
                    <th className="py-3 px-5">Variance</th>
                    <th className="py-3 px-5">On-Time Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {teamWorkload.map((m: any) => (
                    <tr key={m.fullName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-900 dark:text-slate-100">
                        {m.fullName}
                      </td>
                      <td className="py-3 px-5 text-slate-500">{m.department}</td>
                      <td className="py-3 px-5 font-semibold">{m.taskCount}</td>
                      <td className="py-3 px-5 text-slate-500">{m.estimatedHours} hrs</td>
                      <td className="py-3 px-5 font-semibold text-[#00b0ef]">{m.loggedHours} hrs</td>
                      <td className="py-3 px-5 font-semibold">
                        <span className={m.varianceHours > 0 ? "text-rose-500" : "text-emerald-500"}>
                          {m.varianceHours > 0 ? `+${m.varianceHours} hrs` : `${m.varianceHours} hrs`}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <Badge
                          variant="outline"
                          className={m.onTimeRate >= 80 ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}
                        >
                          {m.onTimeRate}% on-time
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROJECT HEALTH ROSTER */}
      {activeTab === "projects" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              All Projects Delivery Health Roster
            </h3>
            <Badge variant="cyan" className="text-xs">
              {filteredProjects.length} Projects Shown
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-5">Code</th>
                  <th className="py-3 px-5">Project Name</th>
                  <th className="py-3 px-5">Client</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Health</th>
                  <th className="py-3 px-5">Schedule Lag</th>
                  <th className="py-3 px-5">Progress</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProjects.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-500">{p.code}</td>
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-slate-100">{p.name}</td>
                    <td className="py-3.5 px-5 text-slate-500">{p.client || "Internal"}</td>
                    <td className="py-3.5 px-5">
                      <Badge variant="secondary" className="text-xs">{p.status}</Badge>
                    </td>
                    <td className="py-3.5 px-5">
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
                    <td className="py-3.5 px-5 font-bold">
                      <span className={p.lagInDays > 5 ? "text-rose-600" : p.lagInDays > 0 ? "text-amber-600" : "text-emerald-600"}>
                        {p.lagInDays > 0 ? `+${p.lagInDays} days` : "On Time"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div className="bg-[#00b0ef] h-2 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link href={`/projects/${p._id}`}>
                        <Button size="sm" variant="outline" className="rounded-lg text-xs font-semibold gap-1.5 h-8">
                          <span>Open Cockpit</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
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
