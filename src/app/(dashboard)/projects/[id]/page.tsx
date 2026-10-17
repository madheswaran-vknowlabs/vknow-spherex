"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

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
            setSelectedStageId(currentStage._id);
          }
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
    stages.find((s: any) => s._id === selectedStageId) || stages[0];
  const stageTasks = tasks.filter((t: any) => t.stageId === currentSelectedStage?._id);

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

      {/* 8-Stage Interactive Lifecycle Stepper (High Density, Sleek) */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00b0ef]" />
            <span>8-Stage Lifecycle Stepper &bull; Click any stage to inspect &amp; manage</span>
          </span>
          <span className="text-[11px] text-slate-500 font-normal">
            Stage {currentSelectedStage.order} of {stages.length}
          </span>
        </div>

        {/* Stepper Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stages.map((stage: any) => {
            const isSelected = stage._id === selectedStageId;
            const isApproved = stage.status === "Approved";
            const isCompleted = stage.status === "Completed";
            const isInProgress = stage.status === "In Progress";
            const isBlocked = stage.status === "Blocked";

            return (
              <button
                key={stage._id}
                onClick={() => setSelectedStageId(stage._id)}
                className={`p-2 rounded-xl text-left transition-all relative border flex flex-col justify-between h-20 ${
                  isSelected
                    ? "border-[#00b0ef] bg-[#e0f6fd]/40 dark:bg-[#0f2e42]/50 shadow-xs ring-1 ring-[#00b0ef]"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    #{stage.order}
                  </span>
                  {isApproved ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : isCompleted ? (
                    <span className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : isBlocked ? (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                      !
                    </span>
                  ) : isInProgress ? (
                    <span className="w-2 h-2 rounded-full bg-[#00b0ef] animate-pulse" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                  )}
                </div>

                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">
                  {stage.name}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>{stage.status}</span>
                  <span className="font-bold text-[#00b0ef]">{stage.percentComplete}%</span>
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
            <select
              value={currentSelectedStage.status}
              onChange={(e) => handleUpdateStage({ status: e.target.value })}
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Blocked">Blocked</option>
              <option value="Completed">Completed (Ready for Sign-Off)</option>
              {currentSelectedStage.status === "Approved" && (
                <option value="Approved">Approved (Signed Off)</option>
              )}
            </select>
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
            <select
              value={currentSelectedStage.ownerId?._id || ""}
              onChange={(e) => handleUpdateStage({ ownerId: e.target.value || null })}
              className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="">-- Unassigned --</option>
              {activeUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.department || u.role})
                </option>
              ))}
            </select>
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

      {/* Add Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Deliverable Task to {currentSelectedStage.name}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Task Title *</Label>
                <Input
                  placeholder="e.g. Build PWA Service Worker Cache"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Assignee</Label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                  >
                    <option value="">-- Select Member --</option>
                    {activeUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Priority</Label>
                  <select
                    value={taskPriority}
                    onChange={(e: any) => setTaskPriority(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Est. Hours</Label>
                  <Input
                    type="number"
                    min="1"
                    value={taskEstHours}
                    onChange={(e) => setTaskEstHours(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    type="date"
                    value={taskEndDate}
                    onChange={(e) => setTaskEndDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Task Dependency Picker */}
              {tasks.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Blocked By (Dependencies)</Label>
                  <div className="max-h-24 overflow-y-auto p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                    {tasks.map((t: any) => {
                      const isChecked = taskBlockedBy.includes(t._id);
                      return (
                        <label
                          key={t._id}
                          className="flex items-center gap-2 text-[11px] cursor-pointer hover:text-[#00b0ef]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setTaskBlockedBy([...taskBlockedBy, t._id]);
                              else setTaskBlockedBy(taskBlockedBy.filter((tid) => tid !== t._id));
                            }}
                            className="rounded accent-[#00b0ef]"
                          />
                          <span className="truncate">{t.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creatingTask}
                  className="bg-[#00b0ef] hover:bg-[#009ad4] text-white h-8 text-xs font-bold"
                >
                  {creatingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Task"}
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
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
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
