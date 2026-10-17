"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

export default function CompliancePage() {
  const [offset, setOffset] = useState<number>(0); // 0 = current week, -1 = last week, etc.
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompliance = () => {
    setLoading(true);
    fetch(`/api/admin/compliance?offset=${offset}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompliance();
  }, [offset]);

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#00b0ef]" />
        <span className="text-xs">Loading submission compliance...</span>
      </div>
    );
  }

  const { weekInfo, metrics, roster } = data || {
    weekInfo: {},
    metrics: {},
    roster: [],
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Week Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Weekly Update Compliance</span>
            <Badge variant="cyan" className="font-mono text-xs">
              Week {weekInfo.weekNumber || "42"}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit team submissions, timeliness against Friday deadline, and hours spent
          </p>
        </div>

        {/* Week Stepper Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setOffset((prev) => prev - 1)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-900 dark:text-white px-2">
            {weekInfo.weekStart
              ? `${format(new Date(weekInfo.weekStart), "MMM dd")} - ${format(
                  new Date(weekInfo.weekEnd),
                  "MMM dd, yyyy"
                )}`
              : "Current Week"}
          </span>
          <button
            onClick={() => setOffset((prev) => prev + 1)}
            disabled={offset >= 0}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="text-[10px] font-bold text-[#00b0ef] underline px-1"
            >
              Current
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Team
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {metrics.totalUsers || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#00b0ef]">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Submitted
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {metrics.submittedCount || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Late Submissions
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {metrics.lateCount || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Missing Updates
            </div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {metrics.missingCount || 0}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Compliance Rate
            </div>
            <div className="text-xl font-black text-[#00b0ef] mt-0.5">
              {metrics.complianceRate || 100}%
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef]">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Roster Compliance Table */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">Team Member</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4">Hours Logged</th>
              <th className="py-3 px-4">Submitted At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {roster.map((item: any) => {
              const isSubmitted = item.status === "Submitted";
              const isLate = item.status === "Late";
              const isMissing = item.status === "Missing";

              return (
                <tr
                  key={item.user._id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#00b0ef] text-white flex items-center justify-center font-bold text-xs">
                        {item.user.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.user.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    {item.user.department || "Engineering"}
                  </td>
                  <td className="py-3 px-4">
                    {isSubmitted ? (
                      <Badge variant="green" className="text-[10px] font-bold uppercase">
                        Submitted On Time
                      </Badge>
                    ) : isLate ? (
                      <Badge variant="amber" className="text-[10px] font-bold uppercase">
                        Late Submission
                      </Badge>
                    ) : (
                      <Badge variant="red" className="text-[10px] font-bold uppercase">
                        Missing
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {item.update ? (
                      <span className="font-mono font-bold text-[#00b0ef]">
                        {item.update.projectCode || "PRJ"}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">--</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {item.update ? `${item.update.hoursSpent}h` : "--"}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {item.update?.submittedAt
                      ? format(new Date(item.update.submittedAt), "MMM dd, HH:mm")
                      : "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
