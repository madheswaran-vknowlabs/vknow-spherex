"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  ArrowLeft,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Globe,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypeSelect } from "@/components/ui/type-select";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday (Default)" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Strict role enforcement
  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "admin") {
        router.replace("/my-work");
      }
    }
  }, [session, status, router]);

  const queryClient = useQueryClient();

  const [warningDays, setWarningDays] = useState(2);
  const [criticalDays, setCriticalDays] = useState(5);
  const [reminderDay, setReminderDay] = useState(5);
  const [reminderTime, setReminderTime] = useState("17:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (settingsData) {
      setWarningDays(settingsData.lagWarningThresholdDays ?? 2);
      setCriticalDays(settingsData.lagCriticalThresholdDays ?? 5);
      setReminderDay(settingsData.weeklyReminderDay ?? 5);
      setReminderTime(settingsData.weeklyReminderTime || "17:00");
      setTimezone(settingsData.timezone || "Asia/Kolkata");
    }
  }, [settingsData]);

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      setSuccessMsg("");

      if (warningDays < 1) throw new Error("Warning threshold must be at least 1 day");
      if (criticalDays <= warningDays) {
        throw new Error("Critical threshold must be strictly greater than warning threshold");
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lagWarningThresholdDays: Number(warningDays),
          lagCriticalThresholdDays: Number(criticalDays),
          weeklyReminderDay: Number(reminderDay),
          weeklyReminderTime: reminderTime,
          timezone,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update settings");
      return json;
    },
    onSuccess: (data) => {
      setSuccessMsg("Settings saved & project health thresholds recalculated across all active projects!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to save settings");
    },
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Admin Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Tracking &amp; Threshold Configuration
              </h1>
              <Badge variant="cyan" className="text-[10px] font-bold uppercase tracking-wider">
                Admin Exclusive
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure delivery lag warning and critical thresholds, reminder schedules, and operational timezone.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading system settings...</div>
      ) : (
        <div className="space-y-4">
          {/* Card 1: Lag Thresholds */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Sliders className="w-4 h-4 text-[#00b0ef]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Work Lag &amp; Health Status Thresholds (Section 5.2)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Warning Threshold */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Warning Threshold (Amber)
                  </label>
                  <Badge variant="amber" className="text-[10px] font-bold">
                    &ge; {warningDays} Days Late
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-tight">
                  Tasks or stages slipping beyond this number of days will transition from Green to Amber status.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={warningDays}
                    onChange={(e) => setWarningDays(Number(e.target.value))}
                    className="w-24 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold">Calendar Days</span>
                </div>
              </div>

              {/* Critical Threshold */}
              <div className="space-y-1.5 p-3.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-red-900 dark:text-red-300">
                    Critical Threshold (Red)
                  </label>
                  <Badge variant="destructive" className="text-[10px] font-bold">
                    &gt; {criticalDays} Days Late
                  </Badge>
                </div>
                <p className="text-[11px] text-red-700 dark:text-red-400 leading-tight">
                  Tasks or stages slipping past this threshold are marked Red and require immediate admin remediation.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={criticalDays}
                    onChange={(e) => setCriticalDays(Number(e.target.value))}
                    className="w-24 text-xs font-bold rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-slate-100"
                  />
                  <span className="text-xs text-red-800 dark:text-red-300 font-semibold">Calendar Days</span>
                </div>
              </div>
            </div>

            {/* Health Mapping Legend */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#00b0ef]" />
                <span>Computed Dynamic Health Classification:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span><strong>Green:</strong> Lag &lt; {warningDays} days (On Time)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span><strong>Amber:</strong> {warningDays} &le; Lag &le; {criticalDays} days</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span><strong>Red:</strong> Lag &gt; {criticalDays} days (Critical Slip)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Weekly Reminders & Timezone */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Clock className="w-4 h-4 text-[#00b0ef]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Weekly Submission Compliance Schedule (Section 5.3)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TypeSelect
                label="Submission Deadline Day"
                value={String(reminderDay)}
                onChange={(val) => setReminderDay(Number(val))}
                options={DAYS_OF_WEEK.map((d) => ({
                  value: String(d.value),
                  label: d.label,
                }))}
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Submission Cutoff Time
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 h-11 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#00b0ef]"
                />
              </div>

              <TypeSelect
                label="System Operating Timezone"
                value={timezone}
                onChange={(val) => setTimezone(val)}
                options={[
                  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST, UTC+05:30)" },
                  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
                  { value: "America/New_York", label: "America/New_York (EST, UTC-05:00)" },
                  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
                  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+08:00)" },
                ]}
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                Cancel
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-[#00b0ef] hover:bg-[#007ea8] text-white font-bold text-xs shadow-xs px-4"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Recomputing Project Tracking...</span>
                </>
              ) : (
                <span>Save &amp; Recalculate Active Projects</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
