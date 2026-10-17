"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  FileQuestion,
  HelpCircle,
  TrendingDown,
  ShieldAlert,
  ChevronRight,
  UserCheck,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RaiseDiscrepancyModal } from "@/components/discrepancies/RaiseDiscrepancyModal";
import { ResolveDiscrepancyModal } from "@/components/discrepancies/ResolveDiscrepancyModal";
import { formatDistanceToNow, format } from "date-fns";

const TYPE_ICONS: Record<string, any> = {
  "Scope Change": Layers,
  "Effort Overrun": TrendingDown,
  Delay: Clock,
  "Quality Issue": Flame,
  "Requirement Gap": FileQuestion,
  Other: HelpCircle,
};

export default function DiscrepanciesPage() {
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [selectedDiscrepancyForResolve, setSelectedDiscrepancyForResolve] = useState<any>(null);

  // Fetch discrepancies
  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "discrepancies",
      projectFilter,
      statusFilter,
      severityFilter,
      typeFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectFilter !== "ALL") params.set("projectId", projectFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (severityFilter !== "ALL") params.set("severity", severityFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);

      const res = await fetch(`/api/discrepancies?${params.toString()}`);
      const json = await res.json();
      return json;
    },
  });

  // Fetch project list for dropdown filter
  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const json = await res.json();
      return json.data || [];
    },
  });

  const discrepancies = data?.data || [];
  const stats = data?.stats || {
    total: 0,
    open: 0,
    inReview: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    scopeChanges: 0,
    effortOverruns: 0,
  };

  const filteredDiscrepancies = discrepancies.filter((d: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.description?.toLowerCase().includes(q) ||
      d.resolution?.toLowerCase().includes(q) ||
      d.projectId?.name?.toLowerCase().includes(q) ||
      d.projectId?.code?.toLowerCase().includes(q) ||
      d.taskId?.title?.toLowerCase().includes(q) ||
      d.raisedById?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Work Lag &amp; Discrepancy Registry
            </h1>
            <Badge variant="cyan" className="text-[10px] font-bold uppercase tracking-wider">
              {stats.total} Total
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log, track, and remediate scope changes, effort overruns, delivery delays, and quality blockers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsRaiseModalOpen(true)}
            className="bg-[#00b0ef] hover:bg-[#007ea8] text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Raise Discrepancy</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Open / Review</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats.open + stats.inReview}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {stats.open} open &bull; {stats.inReview} under review
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Critical Blockers</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-600 dark:text-red-400">
            {stats.critical}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Immediate sign-off block
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Scope Changes</span>
            <Layers className="w-3.5 h-3.5 text-[#00b0ef]" />
          </div>
          <div className="text-2xl font-black text-[#007ea8] dark:text-[#00b0ef]">
            {stats.scopeChanges}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Baseline adjustments
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Effort Overruns</span>
            <TrendingDown className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {stats.effortOverruns}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Hours variance &gt; budget
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resolved</span>
            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.resolved}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Remediated &amp; closed
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {["ALL", "Open", "In Review", "Resolved", "Closed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? "bg-slate-900 text-white dark:bg-[#00b0ef] dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {s === "ALL" ? "All Status" : s}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, root cause..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00b0ef]"
            />
          </div>
        </div>

        {/* Dropdowns Row: Project, Severity, Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00b0ef]"
            >
              <option value="ALL">All Projects</option>
              {projectsData?.map((p: any) => (
                <option key={p._id} value={p._id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00b0ef]"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00b0ef]"
            >
              <option value="ALL">All Discrepancy Types</option>
              <option value="Scope Change">Scope Change</option>
              <option value="Effort Overrun">Effort Overrun</option>
              <option value="Delay">Delay / Work Lag</option>
              <option value="Quality Issue">Quality Issue</option>
              <option value="Requirement Gap">Requirement Gap</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Discrepancies Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading discrepancies registry...
          </div>
        ) : filteredDiscrepancies.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              No discrepancies found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              All active deliverables and lifecycle stages are on track, or no records match your selected filters.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRaiseModalOpen(true)}
              className="mt-4 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Log New Discrepancy
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredDiscrepancies.map((d: any) => {
              const TypeIcon = TYPE_ICONS[d.type] || HelpCircle;
              const isResolved = d.status === "Resolved" || d.status === "Closed";

              // Severity styling
              const severityBadge =
                d.severity === "Critical"
                  ? "bg-red-500 text-white"
                  : d.severity === "High"
                  ? "bg-orange-500 text-white"
                  : d.severity === "Medium"
                  ? "bg-amber-400 text-slate-900"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

              return (
                <div
                  key={d._id}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  {/* Left: Type, Details, Context */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      <TypeIcon className="w-4 h-4 text-[#00b0ef]" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Top tags row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${severityBadge}`}>
                          {d.severity}
                        </span>

                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {d.type}
                        </span>

                        <span className="text-[10px] font-bold text-[#007ea8] dark:text-[#00b0ef]">
                          [{d.projectId?.code}] {d.projectId?.name}
                        </span>

                        {d.stageId && (
                          <span className="text-[10px] text-slate-400">
                            &bull; Stage: {d.stageId.name}
                          </span>
                        )}

                        {d.taskId && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            &bull; Task: {d.taskId.title}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {d.description}
                      </p>

                      {/* Resolution block if present */}
                      {d.resolution && (
                        <div className="mt-1.5 p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                          <span className="font-bold mr-1">Resolution:</span>
                          {d.resolution}
                        </div>
                      )}

                      {/* Raised by & Timestamp */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                        <span>Reported by {d.raisedById?.name || "System"}</span>
                        <span>&bull;</span>
                        <span>
                          {d.createdAt
                            ? formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })
                            : "Recently"}
                        </span>
                        {d.resolutionDate && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Resolved {format(new Date(d.resolutionDate), "dd MMM yyyy")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge & Quick Action */}
                  <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <Badge
                      variant={
                        d.status === "Open"
                          ? "destructive"
                          : d.status === "In Review"
                          ? "amber"
                          : "green"
                      }
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {d.status}
                    </Badge>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDiscrepancyForResolve(d)}
                      className="h-8 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {isResolved ? "Update" : "Resolve"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raise Discrepancy Modal */}
      <RaiseDiscrepancyModal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Resolve Discrepancy Modal */}
      <ResolveDiscrepancyModal
        isOpen={!!selectedDiscrepancyForResolve}
        onClose={() => setSelectedDiscrepancyForResolve(null)}
        discrepancy={selectedDiscrepancyForResolve}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
