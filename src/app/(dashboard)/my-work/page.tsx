"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WeeklyUpdateModal } from "@/components/weekly-update/WeeklyUpdateModal";
import { RaiseDiscrepancyModal } from "@/components/discrepancies/RaiseDiscrepancyModal";
import { CreateTaskModal } from "@/components/tasks/CreateTaskModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  Calendar,
  Check,
  Send,
  Zap,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
  FolderKanban,
  Loader2,
  TrendingUp,
  Plus,
  Layers,
  ArrowRight,
  Users,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function MyWorkPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedProjectIdForTask, setSelectedProjectIdForTask] = useState<string | undefined>(
    undefined
  );
  const [selectedTaskForDiscrepancy, setSelectedTaskForDiscrepancy] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"all" | "dueThisWeek" | "overdue">("all");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  const fetchMyWork = () => {
    fetch("/api/my-work")
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
    fetchMyWork();
  }, []);

  const handleQuickUpdate = async (taskId: string, updates: Record<string, any>) => {
    try {
      const res = await fetch("/api/my-work/quick-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, ...updates }),
      });
      const result = await res.json();
      if (result.success) {
        fetchMyWork();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateTask = (projectId?: string) => {
    setSelectedProjectIdForTask(projectId);
    setIsCreateTaskOpen(true);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#00b0ef]" />
        <span className="text-sm font-medium">Loading My Work cockpit...</span>
      </div>
    );
  }

  const { summary, overdueTasks, dueThisWeekTasks, allTasks, assignedProjects = [] } =
    data || {
      summary: {},
      overdueTasks: [],
      dueThisWeekTasks: [],
      allTasks: [],
      assignedProjects: [],
    };

  let displayedTasks =
    activeTab === "overdue"
      ? overdueTasks
      : activeTab === "dueThisWeek"
      ? dueThisWeekTasks
      : allTasks;

  if (filterPriority !== "ALL") {
    displayedTasks = displayedTasks.filter((t: any) => t.priority === filterPriority);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>My Work Cockpit</span>
            <Badge variant="cyan" className="font-mono text-xs px-2.5 py-0.5">
              {summary.totalAssigned || 0} Deliverables
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create tasks, manage dependencies, log hours, and file weekly updates in under 2 minutes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Create Task Button */}
          <Button
            onClick={() => handleOpenCreateTask()}
            className="h-11 px-5 text-sm font-bold bg-[#00b0ef] hover:bg-[#009ad4] text-white shadow-sm flex items-center gap-2 rounded-xl"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Create Task / Deliverable</span>
          </Button>

          {/* Weekly submission reminder button */}
          {summary.hasSubmittedWeeklyUpdate ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Week {summary.currentWeekNumber} Filed</span>
            </div>
          ) : (
            <Button
              onClick={() => setIsUpdateModalOpen(true)}
              className="h-11 px-5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 rounded-xl"
            >
              <Send className="w-4 h-4" />
              <span>Submit Week {summary.currentWeekNumber} Update</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metrics Strip (Visibly Larger Cards & Numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab("overdue")}
          className={`p-5 sm:p-6 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            activeTab === "overdue"
              ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/40 ring-2 ring-rose-400"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Overdue
            </span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {summary.overdueCount || 0}
          </div>
          <p className="text-xs text-rose-500/80 mt-1 font-medium">Requires immediate action</p>
        </div>

        <div
          onClick={() => setActiveTab("dueThisWeek")}
          className={`p-5 sm:p-6 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            activeTab === "dueThisWeek"
              ? "border-[#00b0ef] bg-[#e0f6fd]/50 dark:bg-[#0f2e42]/50 ring-2 ring-[#00b0ef]"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#00b0ef]">
              Due This Week
            </span>
            <Clock className="w-5 h-5 text-[#00b0ef]" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#00b0ef] mt-2">
            {summary.dueThisWeekCount || 0}
          </div>
          <p className="text-xs text-[#00b0ef]/80 mt-1 font-medium">Sprint deliverables</p>
        </div>

        <div
          onClick={() => setActiveTab("all")}
          className={`p-5 sm:p-6 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            activeTab === "all"
              ? "border-slate-400 bg-slate-50 dark:bg-slate-800/60 ring-2 ring-slate-400"
              : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">
              In Progress
            </span>
            <CheckSquare className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
            {summary.inProgressCount || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">Active work items</p>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Week Hours
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {summary.hoursLoggedThisWeek || 0}h
          </div>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">
            Logged across projects
          </p>
        </div>
      </div>

      {/* Assigned Projects Section (Crucial: Shows projects admin assigned to user) */}
      {assignedProjects.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-[#00b0ef]" />
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Assigned Projects &amp; Lifecycle Gating
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Admin assigned projects where you can create tasks and track progress
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedProjects.map((p: any) => (
              <div
                key={p._id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2.5 py-0.5 rounded-lg border border-[#00b0ef]/30">
                      {p.code}
                    </span>
                    <Badge
                      variant={
                        p.health === "Green"
                          ? "green"
                          : p.health === "Amber"
                          ? "amber"
                          : "destructive"
                      }
                      className="text-xs font-bold"
                    >
                      {p.health} Health
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                    {p.name}
                  </h3>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Layers className="w-3.5 h-3.5 text-[#00b0ef]" />
                      <span>{p.currentStageId?.name || "Active Stage"}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {p.progress || 0}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-[#00b0ef] h-full transition-all duration-500 rounded-full"
                      style={{ width: `${p.progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleOpenCreateTask(p._id)}
                    className="h-9 px-3 text-xs font-bold bg-[#00b0ef] hover:bg-[#009ad4] text-white rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </Button>

                  <Link
                    href={`/projects/${p._id}`}
                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <span>View Stages</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Tab Controller */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Tab switch */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "all"
                ? "bg-[#00b0ef] text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            All Assigned ({allTasks.length})
          </button>
          <button
            onClick={() => setActiveTab("dueThisWeek")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "dueThisWeek"
                ? "bg-[#00b0ef] text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Due This Week ({dueThisWeekTasks.length})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "overdue"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            }`}
          >
            Overdue ({overdueTasks.length})
          </button>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs sm:text-sm">
          <span className="text-slate-400 font-semibold">Priority:</span>
          {["ALL", "Urgent", "High", "Medium", "Low"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                filterPriority === p
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List (Interactive Fast Updating Cards) */}
      {displayedTasks.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            All caught up!
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            You have no deliverables matching this filter. Click &quot;Create Task / Deliverable&quot; above to add new work items with dependencies.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTasks.map((task: any) => {
            const isDone = task.status === "Completed";
            const isTaskOverdue =
              !isDone && differenceInDays(new Date(), new Date(task.plannedEndDate)) > 0;

            return (
              <div
                key={task._id}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isTaskOverdue
                    ? "border-rose-200 dark:border-rose-900/60 hover:border-rose-400"
                    : isDone
                    ? "border-slate-100 dark:border-slate-800/80 opacity-80"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-[#00b0ef]"
                }`}
              >
                {/* Left: Checkbox + Title + Project Badge */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() =>
                      handleQuickUpdate(task._id, {
                        status: isDone ? "In Progress" : "Completed",
                      })
                    }
                    title={isDone ? "Mark In Progress" : "1-Tap Complete"}
                    className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                      isDone
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-300 dark:border-slate-600 hover:border-[#00b0ef]"
                    }`}
                  >
                    {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2 py-0.5 rounded-md border border-[#00b0ef]/30">
                        {task.projectId?.code || "PRJ"}
                      </span>
                      <span
                        className={`text-sm sm:text-base font-bold truncate ${
                          isDone ? "line-through text-slate-400" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.isAtRisk && (
                        <Badge variant="amber" className="text-xs px-2 py-0.5 font-bold">
                          At Risk
                        </Badge>
                      )}
                      {task.lagInDays > 0 && (
                        <Badge
                          variant={task.health === "Red" ? "destructive" : "amber"}
                          className="text-xs px-2 py-0.5 font-bold"
                        >
                          +{task.lagInDays}d Lag
                        </Badge>
                      )}
                      <Badge
                        variant={
                          task.priority === "Urgent"
                            ? "destructive"
                            : task.priority === "High"
                            ? "amber"
                            : "secondary"
                        }
                        className="text-xs px-2 py-0.5 font-bold"
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {task.projectId?.name}
                      </span>
                      <span>&bull;</span>
                      <span>Stage: {task.stageId?.name}</span>
                      <span>&bull;</span>
                      <span className={isTaskOverdue ? "text-rose-600 font-bold" : ""}>
                        Due: {format(new Date(task.plannedEndDate), "MMM dd, yyyy")}
                      </span>
                      <span>&bull;</span>
                      <span>
                        Logged: <strong>{task.loggedHours || 0}h</strong> / {task.estimatedHours}h
                        {task.loggedHours > task.estimatedHours && (
                          <span className="text-rose-600 font-bold ml-1">
                            (+{Math.round((task.loggedHours - task.estimatedHours) * 10) / 10}h over)
                          </span>
                        )}
                      </span>

                      {/* Dependencies Badge */}
                      {task.blockedBy && task.blockedBy.length > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <span>Blocked by {task.blockedBy.length} task(s)</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Progress Slider & +Hours Buttons */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 flex-1 sm:w-40">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={task.percentComplete || 0}
                      onChange={(e) =>
                        handleQuickUpdate(task._id, { progress: Number(e.target.value) })
                      }
                      className="w-full accent-[#00b0ef] h-2 cursor-pointer"
                    />
                    <span className="text-xs font-mono font-bold text-[#00b0ef] w-9 text-right">
                      {task.percentComplete || 0}%
                    </span>
                  </div>

                  {/* Quick Hour Logging Chips */}
                  <div className="flex items-center gap-1.5">
                    {[1, 2].map((h) => (
                      <button
                        key={h}
                        onClick={() => handleQuickUpdate(task._id, { addHours: h })}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#00b0ef] hover:text-white text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                        title={`Log ${h} hour to this task`}
                      >
                        +{h}h
                      </button>
                    ))}
                  </div>

                  {/* Report Blocker / Discrepancy */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTaskForDiscrepancy(task);
                      setIsRaiseModalOpen(true);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                    title="Raise Blocker / Discrepancy on this deliverable"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>

                  <Link
                    href={`/projects/${task.projectId?._id}`}
                    className="p-2 rounded-xl text-slate-400 hover:text-[#00b0ef] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="View in Project Stepper & Gantt"
                  >
                    <ChevronRight className="w-4.5 h-4.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={fetchMyWork}
        projects={assignedProjects}
        defaultProjectId={selectedProjectIdForTask}
      />

      {/* Weekly Update Modal */}
      <WeeklyUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onSuccess={fetchMyWork}
      />

      {/* Raise Discrepancy Modal */}
      <RaiseDiscrepancyModal
        isOpen={isRaiseModalOpen}
        onClose={() => {
          setIsRaiseModalOpen(false);
          setSelectedTaskForDiscrepancy(null);
        }}
        defaultProjectId={selectedTaskForDiscrepancy?.projectId?._id}
        defaultStageId={
          selectedTaskForDiscrepancy?.stageId?._id || selectedTaskForDiscrepancy?.stageId
        }
        defaultTaskId={selectedTaskForDiscrepancy?._id}
        onSuccess={fetchMyWork}
      />
    </div>
  );
}
