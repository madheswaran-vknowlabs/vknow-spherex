"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  X,
  Palmtree,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";

interface DailyReminderModalProps {
  userRole?: string;
  userName?: string;
}

export function DailyReminderModal({ userRole, userName }: DailyReminderModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLeaveMode, setIsLeaveMode] = useState(false);
  const [leaveDate, setLeaveDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [leaveType, setLeaveType] = useState<string>("Casual Leave");
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  useEffect(() => {
    // Only show reminder for employees
    if (userRole !== "employee") return;

    // Check if dismissed in this browser session
    const dismissed = sessionStorage.getItem("spherex_daily_reminder_dismissed");
    if (dismissed === todayStr) return;

    // Fetch daily update status
    fetch(`/api/daily-updates?date=${todayStr}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          const { hasSubmittedToday } = res.data;
          // If not submitted today, show the creative popup
          if (!hasSubmittedToday) {
            // Small delay for smooth entry after page hydration
            const timer = setTimeout(() => {
              setIsOpen(true);
            }, 1200);
            return () => clearTimeout(timer);
          }
        }
      })
      .catch((err) => console.error("Error checking daily update status:", err));
  }, [userRole, todayStr]);

  const handleDismiss = () => {
    sessionStorage.setItem("spherex_daily_reminder_dismissed", todayStr);
    setIsOpen(false);
  };

  const handleGoToLog = () => {
    setIsOpen(false);
    sessionStorage.setItem("spherex_daily_reminder_dismissed", todayStr);
    if (pathname !== "/daily-update") {
      router.push("/daily-update");
    }
  };

  const handleQuickSubmitLeave = async () => {
    setLeaveSubmitting(true);
    try {
      const res = await fetch("/api/daily-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateString: leaveDate,
          status: "on_leave",
          leaveType,
          leaveReason: leaveReason || "Personal Leave",
          tasks: [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLeaveSuccess(`Leave recorded successfully for ${leaveDate === todayStr ? "Today" : "Yesterday"}!`);
        sessionStorage.setItem("spherex_daily_reminder_dismissed", todayStr);
        setTimeout(() => {
          setIsOpen(false);
          if (pathname === "/daily-update") {
            window.location.reload();
          }
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLeaveSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00b0ef]/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

        {/* Top Header Banner */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-r from-slate-900 via-[#0c2438] to-slate-900 text-white border-b border-slate-800">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800/80 transition-colors"
            title="Dismiss reminder"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2.5">
            <Badge variant="cyan" className="font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5">
              Daily Work Reminder
            </Badge>
            <span className="text-xs text-slate-300 font-medium">Takes &lt; 60 seconds</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Good Day, {userName || "Team Member"}!</span>
            <span className="inline-block animate-bounce">👋</span>
          </h3>

          <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
            Your daily task update for <strong className="text-[#00b0ef]">Today</strong> is pending. Logging your daily progress or leave ensures sprint schedule transparency and automated project burnup.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {leaveSuccess ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>{leaveSuccess}</span>
            </div>
          ) : isLeaveMode ? (
            /* Quick Leave Filing Form */
            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Palmtree className="w-4 h-4 text-amber-500" />
                  <span>Mark Leave Status</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsLeaveMode(false)}
                  className="text-xs text-[#00b0ef] hover:underline font-semibold"
                >
                  Switch to Log Work
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Date</label>
                  <select
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value={todayStr}>Today ({format(new Date(), "dd MMM")})</option>
                    <option value={yesterdayStr}>Yesterday ({format(subDays(new Date(), 1), "dd MMM")})</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                  >
                    <option value="Casual Leave">Casual Leave (CL)</option>
                    <option value="Sick Leave">Sick Leave (SL)</option>
                    <option value="Paid Time Off">Paid Time Off (PTO)</option>
                    <option value="Holiday">Official Holiday</option>
                    <option value="Other">Other Leave</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Doctor appointment, family emergency"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLeaveMode(false)}
                  className="text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={leaveSubmitting}
                  onClick={handleQuickSubmitLeave}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs"
                >
                  {leaveSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Saving Leave...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Record Leave</span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Normal Mode: Quick Options */
            <div className="space-y-3">
              <div
                onClick={handleGoToLog}
                className="group p-4 rounded-2xl border-2 border-[#00b0ef]/30 hover:border-[#00b0ef] bg-cyan-50/50 dark:bg-[#00b0ef]/10 hover:bg-cyan-50 dark:hover:bg-[#00b0ef]/15 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#00b0ef] text-white flex items-center justify-center shrink-0 shadow-md">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#00b0ef] transition-colors">
                      Log Today&apos;s Work Deliverables
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter module, description, and hours logged (10:00 AM to 12:00 PM style)
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#00b0ef] group-hover:translate-x-1 transition-transform shrink-0" />
              </div>

              <div
                onClick={() => setIsLeaveMode(true)}
                className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Palmtree className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 transition-colors">
                      I Was On Leave Today or Yesterday
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      1-click mark Sick Leave, Casual Leave, or Holiday
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>VKnow SphereX Enterprise Tracker</span>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
}
