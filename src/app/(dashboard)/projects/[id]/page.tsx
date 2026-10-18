"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FolderKanban,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  User,
  Users,
  Check,
  Plus,
  Edit,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  ChevronRight,
  Sparkles,
  Sliders,
  Trash2,
  X,
  RefreshCw,
  TrendingDown,
  Layers,
  Flame,
  FileQuestion,
  HelpCircle,
} from "lucide-react";
import { format } from "date-fns";
import { RaiseDiscrepancyModal } from "@/components/discrepancies/RaiseDiscrepancyModal";
import { ResolveDiscrepancyModal } from "@/components/discrepancies/ResolveDiscrepancyModal";
import { FrappeGantt, GanttItem } from "@/components/timeline/FrappeGantt";
import { CoolDropdown } from "@/components/ui/cool-select";
import { DatePicker } from "@/components/ui/date-picker";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === "admin";

  // Role enforcement handled in fetchProject: non-admin non-members redirected to /my-work

  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"stepper" | "gantt">("stepper");

  // Users for assignees
  const [activeUsers, setActiveUsers] = useState<any[]>([]);

  // Task creation modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [taskEstHours, setTaskEstHours] = useState(16);
  const [taskStartDate, setTaskStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [taskEndDate, setTaskEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [taskBlockedBy, setTaskBlockedBy] = useState<string[]>([]);
  const [creatingTask, setCreatingTask] = useState(false);

  // Sign-off modal state
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [signOffRemarks, setSignOffRemarks] = useState("");
  const [signingOff, setSigningOff] = useState(false);

  // Edit Project Modal state
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  // Discrepancy & Recalculate State
  const [isRaiseDiscrepancyOpen, setIsRaiseDiscrepancyOpen] = useState(false);
  const [raiseDiscrepancyDefaultTaskId, setRaiseDiscrepancyDefaultTaskId] = useState("");
  const [raiseDiscrepancyDefaultStageId, setRaiseDiscrepancyDefaultStageId] = useState("");
  const [selectedDiscrepancyForResolve, setSelectedDiscrepancyForResolve] = useState<any>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch(`/api/projects/${id}/recalculate`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        fetchProject();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const fetchProject = () => {
    fetch(`/api/projects/${id}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setProjectData(res.data);
          // Set active stage to current stage if not selected
          if (!selectedStageId && res.data.stages?.length > 0) {
            const currentStage =
              res.data.stages.find((s: any) => s.status === "In Progress") || res.data.stages[0];
            setSelectedStageId(String(currentStage._id));
          }
        } else {
          router.replace("/my-work");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProject();
    fetch("/api/users")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setActiveUsers(res.data);
      })
      .catch(console.error);
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#00b0ef]" />
        <span className="text-xs">Loading lifecycle project...</span>
      </div>
    );
  }

  if (!projectData?.project) {
    return (
      <div className="py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Project not found</h2>
        <Link href="/projects" className="text-xs text-[#00b0ef] underline mt-2 inline-block">
          Return to Portfolio
        </Link>
      </div>
    );
  }

  const { project, stages, tasks, discrepancies } = projectData;
  const currentSelectedStage =
    stages.find((s: any) => String(s._id) === String(selectedStageId)) || stages[0];
  const stageTasks = tasks.filter((t: any) => {
    const sId = t.stageId?._id ? String(t.stageId._id) : String(t.stageId);
    return sId === String(currentSelectedStage?._id);
  });

  // Check if previous stage was approved
  const currentStageOrder = currentSelectedStage?.order || 1;
  const prevStage =
    currentStageOrder > 1 ? stages.find((s: any) => s.order === currentStageOrder - 1) : null;
  const isPreviousStageUnapproved =
    prevStage && prevStage.status !== "Approved" && currentSelectedStage.status !== "Not Started";

  // Handle stage status or progress update
  const handleUpdateStage = async (updates: Record<string, any>) => {
    try {
      const res = await fetch(`/api/stages/${currentSelectedStage._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        fetchProject();
      } else {
        alert(data.error || "Failed to update stage");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Admin Sign-off
  const handleSignOff = async (approved: boolean) => {
    if (!signOffRemarks.trim()) {
      alert("Please provide sign-off remarks.");
      return;
    }
    setSigningOff(true);
    try {
      const res = await fetch(`/api/stages/${currentSelectedStage._id}/sign-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, remarks: signOffRemarks.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSignOffModalOpen(false);
        setSignOffRemarks("");
        fetchProject();
      } else {
        alert(data.error || "Failed to sign-off stage");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSigningOff(false);
    }
  };

  // Handle Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project._id,
          stageId: currentSelectedStage._id,
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          assigneeId: taskAssignee || null,
          priority: taskPriority,
          estimatedHours: Number(taskEstHours) || 0,
          plannedStartDate: new Date(taskStartDate),
          plannedEndDate: new Date(taskEndDate),
          blockedBy: taskBlockedBy,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsTaskModalOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        setTaskAssignee("");
        setTaskBlockedBy([]);
        fetchProject();
      } else {
        alert(data.error || "Failed to create task");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingTask(false);
    }
  };

  // Handle Quick Task Status Toggle
  const handleCycleTaskStatus = async (task: any) => {
    const statuses = ["To Do", "In Progress", "Under Review", "Completed"];
    const nextIndex = (statuses.indexOf(task.status) + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];

    try {
      await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchProject();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Handle Edit Project
  const openEditProject = () => {
    setEditName(project.name);
    setEditClient(project.client || "");
    setEditDesc(project.description || "");
    setEditStatus(project.status || "Active");
    setIsEditProjectOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProject(true);
    try {
      const res = await fetch(`/api/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          client: editClient.trim(),
          description: editDesc.trim(),
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditProjectOpen(false);
        fetchProject();
      } else {
        alert(data.error || "Failed to update project");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingProject(false);
    }
  };

  const healthBadge =
    project.health === "Green" ? "green" : project.health === "Amber" ? "amber" : "red";

  // Discrepancy & Effort metrics
  const openDiscrepancies = (discrepancies || []).filter(
    (d: any) => d.status === "Open" || d.status === "In Review"
  );
  const criticalDiscrepancies = discrepancies.filter(
    (d: any) => d.severity === "Critical" && d.status !== "Resolved" && d.status !== "Closed"
  );

  const totalEstHours = tasks.reduce((acc: number, t: any) => acc + (t.estimatedHours || 0), 0);
  const totalLoggedHours = tasks.reduce((acc: number, t: any) => acc + (t.loggedHours || 0), 0);
  const effortVarianceHours = Math.round((totalLoggedHours - totalEstHours) * 10) / 10;
  const effortVariancePercent =
    totalEstHours > 0
      ? Math.round(((totalLoggedHours - totalEstHours) / totalEstHours) * 100)
      : totalLoggedHours > 0
      ? 100
      : 0;
  const isOverBudget = effortVarianceHours > 0;
  const atRiskTasksCount = tasks.filter((t: any) => t.isAtRisk).length;

  // Prepare items for interactive Frappe Gantt
  const projectGanttItems: GanttItem[] = [
    ...stages.map((s: any) => ({
      id: `stage-${s._id}`,
      name: `Stage ${s.order}: ${s.name}`,
      start: s.plannedStartDate || project.plannedStartDate || new Date(),
      end: s.plannedEndDate || project.plannedEndDate || new Date(),
      progress: s.progress || 0,
      type: "stage" as const,
      status: s.status,
      lagInDays: s.lagInDays || 0,
      isAtRisk: s.status === "Blocked",
    })),
    ...tasks.map((t: any) => ({
      id: String(t._id),
      name: t.title,
      start: t.plannedStartDate || new Date(),
      end: t.plannedEndDate || new Date(),
      progress: t.progress || 0,
      type: "task" as const,
      status: t.status,
      assignee: t.assigneeId?.name,
      lagInDays: t.lagInDays || 0,
      isAtRisk: t.isAtRisk,
      dependencies: t.blockedBy?.map(String) || [],
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Project Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-start gap-3">
          <Link
            href="/projects"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-0.5"
            title="Back to Portfolio"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2 py-0.5 rounded-md">
                {project.code}
              </span>
              <span className="text-xs font-semibold text-slate-500">{project.client}</span>
              <Badge variant={healthBadge as any} className="text-[10px] font-bold uppercase">
                {project.health} &bull; {project.lagInDays > 0 ? `+${project.lagInDays}d Lag` : "On Track"}
              </Badge>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {project.name}
            </h1>
            <p className="text-xs text-slate-500 max-w-xl">{project.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="h-8 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
            title="Sync all task lags, check dependency cascades, and recompute stage & project health"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRecalculating ? "animate-spin text-[#00b0ef]" : "text-slate-400"}`} />
            <span>{isRecalculating ? "Syncing..." : "Sync Tracking"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setRaiseDiscrepancyDefaultTaskId("");
              setRaiseDiscrepancyDefaultStageId(currentSelectedStage._id);
              setIsRaiseDiscrepancyOpen(true);
            }}
            className="h-8 px-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            <span>Log Discrepancy</span>
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={openEditProject}
              className="h-8 px-3 text-xs font-semibold"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              <span>Edit Details</span>
            </Button>
          )}

          <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Completion</div>
            <div className="text-lg font-black text-[#00b0ef]">{project.progress || 0}%</div>
          </div>
        </div>
      </div>

      {/* Tracking & Effort Variance Strip (Section 5.2 & 5.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Health & Lag */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Schedule &amp; Lag Health
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-base font-black ${project.health === "Red" ? "text-red-600" : project.health === "Amber" ? "text-amber-600" : "text-emerald-600"}`}>
                {project.health} Health
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {project.lagInDays > 0 ? `+${project.lagInDays} Days Lag` : "0 Days (On Time)"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Due: {format(new Date(project.plannedEndDate), "dd MMM yyyy")}
            </span>
          </div>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${project.health === "Red" ? "bg-red-50 text-red-600 dark:bg-red-950/40" : project.health === "Amber" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"}`}>
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Effort Variance */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Effort Variance (Est. vs Logged)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-slate-100">
                {totalLoggedHours}h / {totalEstHours}h
              </span>
              <span className={`text-xs font-bold ${isOverBudget ? "text-rose-600" : "text-emerald-600"}`}>
                {effortVarianceHours > 0 ? `+${effortVarianceHours}h` : `${effortVarianceHours}h`} ({effortVariancePercent > 0 ? `+${effortVariancePercent}%` : `${effortVariancePercent}%`})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              Status: <strong className={isOverBudget ? "text-rose-600" : "text-emerald-600"}>{isOverBudget ? "Over Baseline Budget" : "Within Baseline Budget"}</strong>
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        {/* Discrepancies & Risks */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Blockers &amp; Risk Cascade
            </span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-slate-100">
                {openDiscrepancies.length} Open Issues
              </span>
              {criticalDiscrepancies.length > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold uppercase">
                  {criticalDiscrepancies.length} Critical
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block">
              {atRiskTasksCount > 0 ? (
                <span className="text-amber-600 font-semibold">{atRiskTasksCount} task(s) At Risk from predecessor slips</span>
              ) : (
                "0 tasks at risk from predecessor slips"
              )}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Warning banner if previous stage is unapproved */}
      {isPreviousStageUnapproved && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Gate Warning:</strong> Stage &quot;{currentSelectedStage.name}&quot; is active, but predecessor stage &quot;{prevStage?.name}&quot; has not received formal Admin Sign-Off yet.
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setSelectedStageId(prevStage._id)}
              className="underline font-bold text-[11px] shrink-0 hover:text-amber-900"
            >
              Review Predecessor
            </button>
          )}
        </div>
      )}

      {/* View Mode Switcher: Stepper vs Gantt */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("stepper")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === "stepper"
                ? "bg-[#00b0ef] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>8-Stage Lifecycle &amp; Tasks</span>
          </button>
          <button
            onClick={() => setActiveView("gantt")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeView === "gantt"
                ? "bg-[#00b0ef] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Interactive Frappe Gantt Timeline</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline">
          {activeView === "stepper" ? "Stage-by-stage gating & approvals" : "Visual dependencies & schedule slips"}
        </span>
      </div>

      {activeView === "gantt" ? (
        <FrappeGantt
          items={projectGanttItems}
          title={`[${project.code}] ${project.name} — Gantt Timeline`}
          projectId={project._id}
          defaultViewMode="Week"
        />
      ) : (
        <>
          {/* Compact Lifecycle Stepper (Minimalist, Single Row) */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  Lifecycle Stepper
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal hidden sm:inline">
                  &bull; Click any stage to inspect &amp; manage
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 text-[10px]">Active Stage:</span>
                <span className="font-semibold text-[#00b0ef] bg-[#e0f6fd]/80 dark:bg-[#00b0ef]/15 px-2 py-0.5 rounded text-[10px]">
                  #{currentSelectedStage.order} {currentSelectedStage.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({currentSelectedStage.order}/{stages.length})
                </span>
              </div>
            </div>

            {/* Stepper Compact Track */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {stages.map((stage: any) => {
                const isSelected = String(stage._id) === String(selectedStageId);
                const isApproved = stage.status === "Approved";
                const isCompleted = stage.status === "Completed";
                const isInProgress = stage.status === "In Progress";
                const isBlocked = stage.status === "Blocked";

                return (
                  <button
                    key={String(stage._id)}
                    onClick={() => setSelectedStageId(String(stage._id))}
                    type="button"
                    className={`flex-1 min-w-[110px] sm:min-w-[120px] max-w-[170px] flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all border cursor-pointer select-none ${
                      isSelected
                        ? "border-[#00b0ef] bg-[#e0f6fd]/50 dark:bg-[#00b0ef]/20 shadow-xs ring-1 ring-[#00b0ef]"
                        : "border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                    }`}
                    title={`${stage.order}. ${stage.name} (${stage.status} - ${stage.percentComplete}%)`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                        isApproved
                          ? "bg-emerald-500 text-white"
                          : isCompleted
                          ? "bg-sky-500 text-white"
                          : isBlocked
                          ? "bg-rose-500 text-white"
                          : isSelected
                          ? "bg-[#00b0ef] text-white"
                          : isInProgress
                          ? "border border-[#00b0ef] text-[#00b0ef] bg-white dark:bg-slate-800"
                          : "border border-slate-300 dark:border-slate-700 text-slate-400 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {isApproved || isCompleted ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : isBlocked ? (
                        "!"
                      ) : (
                        stage.order
                      )}
                    </span>

                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-[11px] font-semibold truncate text-slate-800 dark:text-slate-200">
                        {stage.name}
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
                        <span className="truncate">{stage.status}</span>
                        <span className="font-mono font-bold text-[#00b0ef] ml-1">{stage.percentComplete}%</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

      {/* Selected Stage Control Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Stage Detail & Sign-Off Actions */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#00b0ef]">
                Stage {currentSelectedStage.order} Config
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {currentSelectedStage.name}
              </h3>
            </div>

            <Badge
              variant={
                currentSelectedStage.status === "Approved"
                  ? "green"
                  : currentSelectedStage.status === "Completed"
                  ? "cyan"
                  : currentSelectedStage.status === "Blocked"
                  ? "red"
                  : "secondary"
              }
              className="text-[10px] font-bold uppercase"
            >
              {currentSelectedStage.status}
            </Badge>
          </div>

          {/* Sign-off banner if approved */}
          {currentSelectedStage.signOff?.approvedAt && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Admin Sign-Off Approved</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                &quot;{currentSelectedStage.signOff.remarks}&quot;
              </p>
              <div className="text-[10px] text-emerald-600 mt-1">
                Approved by {currentSelectedStage.signOff.approvedBy?.name || "Admin"} on{" "}
                {format(new Date(currentSelectedStage.signOff.approvedAt), "MMM dd, yyyy")}
              </div>
            </div>
          )}

          {/* Quick status selector */}
          <div className="space-y-1">
            <Label className="text-xs">Stage Status</Label>
            <CoolDropdown
              fullWidth
              size="sm"
              value={currentSelectedStage.status}
              onChange={(val) => handleUpdateStage({ status: val })}
              options={[
                { value: "Not Started", label: "Not Started", badge: "0%" },
                { value: "In Progress", label: "In Progress", badge: "Active", badgeVariant: "cyan" },
                { value: "On Hold", label: "On Hold", badge: "Paused", badgeVariant: "amber" },
                { value: "Blocked", label: "Blocked", badge: "Critical", badgeVariant: "rose" },
                { value: "Completed", label: "Completed (Ready for Sign-Off)", badge: "Review", badgeVariant: "emerald" },
                ...(currentSelectedStage.status === "Approved"
                  ? [{ value: "Approved", label: "Approved (Signed Off)", badge: "Locked", badgeVariant: "emerald" as const }]
                  : []),
              ]}
            />
          </div>

          {/* Progress Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <Label className="text-xs">Progress</Label>
              <span className="text-[#00b0ef]">{currentSelectedStage.percentComplete}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentSelectedStage.percentComplete}
              onChange={(e) => handleUpdateStage({ percentComplete: Number(e.target.value) })}
              className="w-full accent-[#00b0ef]"
            />
          </div>

          {/* Stage Owner */}
          <div className="space-y-1">
            <Label className="text-xs">Stage Owner</Label>
            <CoolDropdown
              fullWidth
              size="sm"
              searchable
              value={currentSelectedStage.ownerId?._id || ""}
              onChange={(val) => handleUpdateStage({ ownerId: val || null })}
              placeholder="-- Unassigned --"
              options={[
                { value: "", label: "-- Unassigned --" },
                ...activeUsers.map((u) => ({
                  value: u._id,
                  label: u.name,
                  sublabel: u.department || u.role,
                  badge: u.role?.toUpperCase(),
                })),
              ]}
            />
          </div>

          {/* Planned Dates */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Planned Start
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {format(new Date(currentSelectedStage.plannedStartDate), "MMM dd, yyyy")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Planned End
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {format(new Date(currentSelectedStage.plannedEndDate), "MMM dd, yyyy")}
              </span>
            </div>
          </div>

          {/* Admin Sign-Off Gate Button */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                onClick={() => setIsSignOffModalOpen(true)}
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                <span>
                  {currentSelectedStage.status === "Approved"
                    ? "Update Sign-Off Remarks"
                    : "Stage Sign-Off Review"}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Right 2 Columns: Tasks under this Stage */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Stage Deliverables &amp; Tasks</span>
                  <Badge variant="cyan" className="text-[10px] px-1.5 py-0 font-mono">
                    {stageTasks.length} Tasks
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tasks with dependency tracking and automatic at-risk flags
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-[#00b0ef] hover:bg-[#009ad4] text-white h-8 px-3 text-xs font-bold rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add Task</span>
              </Button>
            </div>

            {/* Tasks List */}
            {stageTasks.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No tasks assigned to this stage yet
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click &quot;Add Task&quot; above to create granular deliverables for this stage.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
                {stageTasks.map((t: any) => {
                  const isDone = t.status === "Completed";
                  return (
                    <div
                      key={t._id}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Status cycle button */}
                        <button
                          onClick={() => handleCycleTaskStatus(t)}
                          title="Click to advance status"
                          className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center text-[9px] shrink-0 transition-colors ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : t.status === "In Progress"
                              ? "border-[#00b0ef] text-[#00b0ef]"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold truncate ${
                                isDone ? "line-through text-slate-400" : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {t.title}
                            </span>

                            {t.isAtRisk && (
                              <Badge variant="amber" className="text-[9px] px-1 py-0 font-bold shrink-0">
                                At Risk
                              </Badge>
                            )}

                            {t.lagInDays > 0 && (
                              <Badge
                                variant={t.health === "Red" ? "destructive" : "amber"}
                                className="text-[9px] px-1 py-0 font-bold shrink-0"
                              >
                                +{t.lagInDays}d Lag
                              </Badge>
                            )}

                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">
                              {t.priority}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            <span>
                              Assignee: <strong>{t.assigneeId?.name || "Unassigned"}</strong>
                            </span>
                            <span>&bull;</span>
                            <span>
                              Est: <strong>{t.estimatedHours}h</strong> (Logged: {t.loggedHours}h
                              {t.loggedHours > t.estimatedHours && (
                                <span className="text-rose-600 font-bold ml-1">
                                  +{Math.round((t.loggedHours - t.estimatedHours) * 10) / 10}h over
                                </span>
                              )}
                              )
                            </span>
                            {t.blockedBy?.length > 0 && (
                              <>
                                <span>&bull;</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                  Blocked by {t.blockedBy.length} task(s)
                                </span>
                              </>
                            )}
                          </div>

                          {t.description && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                              {t.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Task Progress & Status Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRaiseDiscrepancyDefaultTaskId(t._id);
                            setRaiseDiscrepancyDefaultStageId(currentSelectedStage._id);
                            setIsRaiseDiscrepancyOpen(true);
                          }}
                          title="Log blocker or discrepancy against this deliverable"
                          className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleCycleTaskStatus(t)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            t.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : t.status === "In Progress"
                              ? "bg-sky-50 text-[#00b0ef] dark:bg-sky-950/60"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                          }`}
                        >
                          {t.status}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {/* Project Discrepancies & Work Lag Registry */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Project Discrepancies &amp; Blockers ({discrepancies.length})
            </h3>
            {criticalDiscrepancies.length > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold uppercase">
                {criticalDiscrepancies.length} Critical
              </Badge>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => {
              setRaiseDiscrepancyDefaultTaskId("");
              setRaiseDiscrepancyDefaultStageId(currentSelectedStage._id);
              setIsRaiseDiscrepancyOpen(true);
            }}
            className="bg-[#00b0ef] hover:bg-[#007ea8] text-white h-7 px-2.5 text-xs font-bold rounded-lg"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Raise Discrepancy</span>
          </Button>
        </div>

        {discrepancies.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No discrepancies logged for this project. All deliverables are on baseline.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {discrepancies.map((d: any) => {
              const isResolved = d.status === "Resolved" || d.status === "Closed";
              return (
                <div
                  key={d._id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          d.severity === "Critical"
                            ? "destructive"
                            : d.severity === "High"
                            ? "amber"
                            : "secondary"
                        }
                        className="text-[9px] px-1.5 py-0 font-bold uppercase"
                      >
                        {d.severity}
                      </Badge>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {d.type}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        &bull; Raised by {d.raisedById?.name || "Member"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {d.description}
                    </p>

                    {d.resolution && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg mt-1 border border-emerald-200 dark:border-emerald-900/40">
                        <strong>Resolution:</strong> {d.resolution}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <Badge
                      variant={isResolved ? "green" : d.status === "In Review" ? "amber" : "cyan"}
                      className="text-[10px] uppercase font-bold"
                    >
                      {d.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDiscrepancyForResolve(d)}
                      className="h-7 px-2 text-[11px] font-semibold"
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

      {/* Admin Sign-Off Modal */}
      {isSignOffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stage Gate Sign-Off Review
                </h3>
              </div>
              <button onClick={() => setIsSignOffModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                You are reviewing <strong>Stage {currentSelectedStage.order}: {currentSelectedStage.name}</strong>.
              </p>
              <p>
                Approving this stage signifies that all stage exit criteria have been validated. The next sequential stage will be automatically unlocked and activated.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Formal Review Remarks *</Label>
              <textarea
                rows={3}
                placeholder="e.g. Architectural review complete. All acceptance criteria met."
                value={signOffRemarks}
                onChange={(e) => setSignOffRemarks(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSignOff(false)}
                disabled={signingOff}
                className="text-rose-600 hover:bg-rose-50 border-rose-200 h-8 text-xs font-semibold"
              >
                Reject Stage
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSignOff(true)}
                disabled={signingOff}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold shadow-xs"
              >
                {signingOff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Approve & Sign Off"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deliverable Task Modal (Spacious Visual Box with Description, CoolDropdown, DatePicker) */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl p-6 sm:p-7 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-extrabold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2.5 py-0.5 rounded-full">
                    Stage {currentSelectedStage.order} &bull; {currentSelectedStage.name}
                  </span>
                  <Badge variant="cyan" className="text-[9px] uppercase font-bold">
                    Deliverable Item
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add Deliverable Task to {currentSelectedStage.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure task specifications, assign member ownership, define start &amp; due dates, and map predecessor dependencies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Card 1: Task Title & Description */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Task Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder={`e.g. ${currentSelectedStage.name === "Design" ? "Design High-Fidelity UI System & Component Library" : "Build Core Architecture & Test Suite"}`}
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    required
                    className="h-10 text-xs sm:text-sm font-medium rounded-xl"
                  />
                </div>

                {/* Deliverable Task Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Deliverable Description &amp; Technical Scope
                    </Label>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Acceptance criteria &amp; specifications
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Provide a clear description of the expected output, acceptance criteria, design links, technical constraints, or deliverables required to mark this task complete..."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00b0ef]/30 focus:border-[#00b0ef] transition-all resize-y min-h-[80px]"
                  />
                </div>
              </div>

              {/* Card 2: Ownership & Prioritization */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Assignee</Label>
                    <CoolDropdown
                      fullWidth
                      searchable
                      value={taskAssignee}
                      onChange={setTaskAssignee}
                      placeholder="-- Select Assignee --"
                      options={[
                        { value: "", label: "-- Unassigned --" },
                        ...activeUsers.map((u) => ({
                          value: u._id,
                          label: u.name,
                          sublabel: u.department || u.role,
                          badge: u.role?.toUpperCase(),
                        })),
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Priority Level</Label>
                    <CoolDropdown
                      fullWidth
                      value={taskPriority}
                      onChange={(val: any) => setTaskPriority(val)}
                      options={[
                        { value: "Low", label: "Low Priority", badge: "Low", badgeVariant: "default" },
                        { value: "Medium", label: "Medium Priority", badge: "Normal", badgeVariant: "cyan" },
                        { value: "High", label: "High Priority", badge: "High", badgeVariant: "amber" },
                        { value: "Urgent", label: "Urgent Priority", badge: "Critical", badgeVariant: "rose" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Timeline & Effort (With DatePicker) */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Planned Start Date</Label>
                    <DatePicker
                      value={taskStartDate}
                      onChange={setTaskStartDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Due Date</Label>
                    <DatePicker
                      value={taskEndDate}
                      onChange={setTaskEndDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Est. Hours</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1"
                        value={taskEstHours}
                        onChange={(e) => setTaskEstHours(Number(e.target.value))}
                        className="h-9 text-xs rounded-xl pr-8 font-semibold"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">
                        hrs
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Task Dependencies (Blocked By) */}
              {tasks.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Predecessor Dependencies (Blocked By)
                    </Label>
                    <span className="text-[10px] text-slate-400">
                      {taskBlockedBy.length} selected
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {tasks.map((t: any) => {
                      const isChecked = taskBlockedBy.includes(t._id);
                      return (
                        <label
                          key={t._id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors border ${
                            isChecked
                              ? "bg-[#e0f6fd]/50 dark:bg-[#00b0ef]/10 border-[#00b0ef]/50 font-semibold text-[#007ea8] dark:text-[#00b0ef]"
                              : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setTaskBlockedBy([...taskBlockedBy, t._id]);
                              else setTaskBlockedBy(taskBlockedBy.filter((tid) => tid !== t._id));
                            }}
                            className="rounded accent-[#00b0ef] shrink-0"
                          />
                          <span className="truncate">{t.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="h-9 px-4 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creatingTask}
                  className="bg-[#00b0ef] hover:bg-[#009ad4] text-white h-9 px-5 text-xs font-bold rounded-xl shadow-xs"
                >
                  {creatingTask ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      <span>Saving Deliverable...</span>
                    </>
                  ) : (
                    "Save Deliverable Task"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Project Settings
              </h3>
              <button onClick={() => setIsEditProjectOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Project Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Client</Label>
                  <Input
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <CoolDropdown
                    fullWidth
                    size="sm"
                    value={editStatus}
                    onChange={setEditStatus}
                    options={[
                      { value: "Planning", label: "Planning", badge: "Draft" },
                      { value: "Active", label: "Active", badge: "Running", badgeVariant: "cyan" },
                      { value: "On Hold", label: "On Hold", badge: "Paused", badgeVariant: "amber" },
                      { value: "Completed", label: "Completed", badge: "Done", badgeVariant: "emerald" },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditProjectOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingProject}
                  className="bg-[#00b0ef] hover:bg-[#009ad4] text-white h-8 text-xs font-bold"
                >
                  {savingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Discrepancy Modal */}
      <RaiseDiscrepancyModal
        isOpen={isRaiseDiscrepancyOpen}
        onClose={() => setIsRaiseDiscrepancyOpen(false)}
        defaultProjectId={project._id}
        defaultStageId={raiseDiscrepancyDefaultStageId}
        defaultTaskId={raiseDiscrepancyDefaultTaskId}
        onSuccess={() => fetchProject()}
      />

      {/* Resolve Discrepancy Modal */}
      <ResolveDiscrepancyModal
        isOpen={!!selectedDiscrepancyForResolve}
        onClose={() => setSelectedDiscrepancyForResolve(null)}
        discrepancy={selectedDiscrepancyForResolve}
        onSuccess={() => fetchProject()}
      />
    </div>
  );
}
