"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Copy,
  AlertCircle,
  Loader2,
  Send,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { TypeSelect } from "@/components/ui/type-select";

export default function WeeklyUpdateStandalonePage() {
  const router = useRouter();
  const [loadingPrefill, setLoadingPrefill] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentWeek, setCurrentWeek] = useState<any>(null);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [lastWeekUpdate, setLastWeekUpdate] = useState<any>(null);

  // Form State
  const [workCompleted, setWorkCompleted] = useState("");
  const [hoursSpent, setHoursSpent] = useState<number>(40);
  const [blockers, setBlockers] = useState("");
  const [planNextWeek, setPlanNextWeek] = useState("");
  const [taskUpdates, setTaskUpdates] = useState<
    Array<{ taskId: string; progress: number; hours: number; status: string; notes: string }>
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    setLoadingPrefill(true);
    const url = selectedProjectId
      ? `/api/weekly-updates/prefill?projectId=${selectedProjectId}`
      : `/api/weekly-updates/prefill`;

    fetch(url)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setProjects(res.data.projects || []);
          setCurrentWeek(res.data.currentWeek);
          setActiveTasks(res.data.activeTasks || []);
          setLastWeekUpdate(res.data.lastWeekUpdate);

          if (!selectedProjectId && res.data.projects?.length > 0) {
            setSelectedProjectId(res.data.projects[0]._id);
          }

          const initialTaskUpdates = (res.data.activeTasks || []).map((t: any) => ({
            taskId: t._id,
            progress: t.percentComplete || 0,
            hours: 0,
            status: t.status || "In Progress",
            notes: "",
          }));
          setTaskUpdates(initialTaskUpdates);

          if (res.data.existingSubmission) {
            const sub = res.data.existingSubmission;
            setWorkCompleted(sub.workCompleted || "");
            setHoursSpent(sub.hoursSpent || 40);
            setBlockers(sub.blockers || "");
            setPlanNextWeek(sub.planNextWeek || "");
          } else if (res.data.lastWeekUpdate?.planNextWeek) {
            setWorkCompleted(res.data.lastWeekUpdate.planNextWeek);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPrefill(false));
  }, [selectedProjectId]);

  const handleSameAsLastWeek = () => {
    if (!lastWeekUpdate) return;
    setWorkCompleted(lastWeekUpdate.workCompleted || "");
    setHoursSpent(lastWeekUpdate.hoursSpent || 40);
    setBlockers(lastWeekUpdate.blockers || "");
    setPlanNextWeek(lastWeekUpdate.planNextWeek || "");
  };

  const updateTaskProgress = (taskId: string, progress: number) => {
    setTaskUpdates((prev) =>
      prev.map((item) =>
        item.taskId === taskId
          ? {
              ...item,
              progress,
              status: progress === 100 ? "Completed" : item.status,
            }
          : item
      )
    );
  };

  const updateTaskStatus = (taskId: string, status: string) => {
    setTaskUpdates((prev) =>
      prev.map((item) =>
        item.taskId === taskId
          ? {
              ...item,
              status,
              progress: status === "Completed" ? 100 : item.progress,
            }
          : item
      )
    );
  };

  const updateTaskHours = (taskId: string, hours: number) => {
    setTaskUpdates((prev) =>
      prev.map((item) => (item.taskId === taskId ? { ...item, hours } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workCompleted.trim() || !planNextWeek.trim()) {
      setError("Please fill in both Work Completed and Plan for Next Week.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/weekly-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          weekStartDate: currentWeek?.weekStartDate || new Date(),
          weekEndDate: currentWeek?.weekEndDate || new Date(),
          workCompleted: workCompleted.trim(),
          hoursSpent: Number(hoursSpent) || 0,
          taskUpdates,
          blockers: blockers.trim(),
          planNextWeek: planNextWeek.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmittedSuccess(true);
        setTimeout(() => router.push("/my-work"), 1500);
      } else {
        setError(data.error || "Failed to submit weekly update");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Weekly Update Submitted!
        </h2>
        <p className="text-xs text-slate-500">
          Your deliverables progress and hours have been recorded. Redirecting to My Work...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/my-work"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Fast Weekly Submission</span>
            <Badge variant="cyan" className="font-mono text-xs">
              Week {currentWeek?.weekNumber || "42"}
            </Badge>
          </h1>
          <p className="text-xs text-slate-500">Takes under 2 minutes to complete</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {loadingPrefill ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#00b0ef]" />
            <span className="text-xs">Loading form prefill data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Project Picker & Same As Last Week Quick Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <div className="flex-1">
                <TypeSelect
                  size="sm"
                  label="Select Project"
                  value={selectedProjectId}
                  onChange={(val) => setSelectedProjectId(val)}
                  placeholder="Type or select project..."
                  options={projects.map((p) => ({
                    value: p._id,
                    label: `${p.code} - ${p.name}`,
                    badge: p.code,
                  }))}
                />
              </div>

              {lastWeekUpdate && (
                <button
                  type="button"
                  onClick={handleSameAsLastWeek}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#00b0ef] hover:bg-[#00b0ef] hover:text-white text-xs font-bold transition-all border border-[#00b0ef]/30"
                  title="Copy last week's logged update as baseline"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Same as Last Week</span>
                </button>
              )}
            </div>

            {/* Active Tasks Checklist with Progress Sliders */}
            {activeTasks.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Active Deliverables Progress ({activeTasks.length} tasks)
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    Sliders sync directly to project lifecycle
                  </span>
                </div>

                <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/80">
                  {activeTasks.map((t) => {
                    const taskUpdate = taskUpdates.find((u) => u.taskId === t._id) || {
                      progress: t.percentComplete || 0,
                      hours: 0,
                      status: t.status,
                    };

                    return (
                      <div key={t._id} className="pt-2 first:pt-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {t.title}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-mono font-bold text-[#00b0ef]">
                              {taskUpdate.progress}%
                            </span>
                            <div className="w-32">
                              <TypeSelect
                                size="sm"
                                value={taskUpdate.status}
                                onChange={(val) => updateTaskStatus(t._id, val)}
                                options={[
                                  { value: "In Progress", label: "In Progress" },
                                  { value: "Under Review", label: "Under Review" },
                                  { value: "Completed", label: "Completed" },
                                  { value: "Blocked", label: "Blocked" },
                                ]}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Slider and quick hour button */}
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={taskUpdate.progress}
                            onChange={(e) => updateTaskProgress(t._id, Number(e.target.value))}
                            className="flex-1 accent-[#00b0ef] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                            <span>+Hours:</span>
                            {[2, 4, 8].map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => updateTaskHours(t._id, taskUpdate.hours + h)}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] hover:bg-[#00b0ef] hover:text-white transition-colors"
                              >
                                +{h}h
                              </button>
                            ))}
                            {taskUpdate.hours > 0 && (
                              <span className="font-bold text-[#00b0ef] text-[10px] ml-1">
                                ({taskUpdate.hours}h)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Work Completed */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="work-done-page" className="text-xs font-bold">
                  Work Completed This Week *
                </Label>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px]">Total Hours:</span>
                  <Input
                    type="number"
                    min="1"
                    max="80"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(Number(e.target.value))}
                    className="w-16 h-7 text-xs font-bold text-center"
                    required
                  />
                </div>
              </div>
              <textarea
                id="work-done-page"
                rows={3}
                placeholder="Bullet points of key deliverables shipped, reviews conducted, or integrations completed..."
                value={workCompleted}
                onChange={(e) => setWorkCompleted(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00b0ef]"
                required
              />
            </div>

            {/* Blockers & Impediments */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="blockers-page" className="text-xs font-bold">
                  Blockers &amp; Dependencies (Optional)
                </Label>
                <button
                  type="button"
                  onClick={() => setBlockers("No blockers. Everything proceeding on schedule.")}
                  className="text-[10px] text-[#00b0ef] hover:underline"
                >
                  No blockers
                </button>
              </div>
              <Input
                id="blockers-page"
                placeholder="Any external dependencies, awaiting client sign-off, or technical impediments..."
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Plan for Next Week */}
            <div className="space-y-1">
              <Label htmlFor="next-week-page" className="text-xs font-bold">
                Plan for Next Week *
              </Label>
              <textarea
                id="next-week-page"
                rows={2}
                placeholder="Top 3 priorities and deliverables planned for next week..."
                value={planNextWeek}
                onChange={(e) => setPlanNextWeek(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#00b0ef]"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="w-full h-10 text-xs font-bold bg-[#00b0ef] hover:bg-[#009ad4] text-white shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Submitting Update...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Submit Weekly Report
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
