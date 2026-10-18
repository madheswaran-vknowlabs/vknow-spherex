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
  UserCheck,
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
import { LogWorkModal } from "@/components/tasks/LogWorkModal";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";
  const canAssignOthers = isAdmin || isManager;

  // Role enforcement handled in fetchProject: non-admin non-members redirected to /my-work

  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"stepper" | "gantt">("stepper");
  const [selectedTaskForLogWork, setSelectedTaskForLogWork] = useState<any>(null);

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

  // Clockify Quick Time Tracker Bar state
  const [quickTitle, setQuickTitle] = useState("");
  const [quickStartTime, setQuickStartTime] = useState("10:00");
  const [quickEndTime, setQuickEndTime] = useState("12:00");
  const [quickHours, setQuickHours] = useState(2);
  const [quickAssignee, setQuickAssignee] = useState("");
  const [quickDate, setQuickDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Modal initial log hours (Clockify mode)
  const [modalLogHoursNow, setModalLogHoursNow] = useState(true);
  const [modalStartTime, setModalStartTime] = useState("10:00");
  const [modalEndTime, setModalEndTime] = useState("12:00");
  const [modalLoggedHours, setModalLoggedHours] = useState(2);
  const [modalWorkNotes, setModalWorkNotes] = useState("");

  const calculateDurationHours = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);
    const diffMins = endH * 60 + endM - (startH * 60 + startM);
    if (diffMins > 0) {
      return Math.round((diffMins / 60) * 10) / 10;
    }
    return 0;
  };

  const formatTime12h = (time24: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };

  const handleQuickStartTimeChange = (newStart: string) => {
    setQuickStartTime(newStart);
    const calculated = calculateDurationHours(newStart, quickEndTime);
    if (calculated > 0) setQuickHours(calculated);
  };

  const handleQuickEndTimeChange = (newEnd: string) => {
    setQuickEndTime(newEnd);
    const calculated = calculateDurationHours(quickStartTime, newEnd);
    if (calculated > 0) setQuickHours(calculated);
  };

  const handleModalStartTimeChange = (newStart: string) => {
    setModalStartTime(newStart);
    const calculated = calculateDurationHours(newStart, modalEndTime);
    if (calculated > 0) setModalLoggedHours(calculated);
  };

  const handleModalEndTimeChange = (newEnd: string) => {
    setModalEndTime(newEnd);
    const calculated = calculateDurationHours(modalStartTime, newEnd);
    if (calculated > 0) setModalLoggedHours(calculated);
  };

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
  const stageTasks = tasks
    .filter((t: any) => {
      const sId = t.stageId?._id ? String(t.stageId._id) : String(t.stageId);
      return sId === String(currentSelectedStage?._id);
    })
    .sort((a: any, b: any) => {
      const getLatestTime = (task: any) => {
        let maxTime = new Date(task.updatedAt || task.createdAt || 0).getTime();
        if (task.workLogs && task.workLogs.length > 0) {
          task.workLogs.forEach((log: any) => {
            const logTime = new Date(log.createdAt || log.date || 0).getTime();
            if (logTime > maxTime) maxTime = logTime;
          });
        }
        return maxTime;
      };
      return getLatestTime(b) - getLatestTime(a);
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

  // Handle Quick Add and Log Task (Clockify Style)
  const handleQuickAddAndLogTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) {
      alert("Please enter what you worked on or a task title.");
      return;
    }
    setQuickSubmitting(true);
    try {
      const sessionUserId = (session?.user as any)?.id;
      const targetAssigneeId = canAssignOthers ? (quickAssignee || sessionUserId || null) : sessionUserId;

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project._id,
          stageId: currentSelectedStage._id,
          title: quickTitle.trim(),
          description: quickTitle.trim(),
          assigneeId: targetAssigneeId,
          priority: "Medium",
          estimatedHours: quickHours > 0 ? quickHours : 4,
          loggedHours: quickHours,
          status: quickHours > 0 ? "In Progress" : "To Do",
          initialWorkLog:
            quickHours > 0
              ? {
                  startTime: formatTime12h(quickStartTime),
                  endTime: formatTime12h(quickEndTime),
                  hours: quickHours,
                  date: quickDate,
                  notes: quickTitle.trim(),
                }
              : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQuickTitle("");
        fetchProject();
      } else {
        alert(data.error || "Failed to add task");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add task");
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Handle Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTask(true);
    try {
      const sessionUserId = (session?.user as any)?.id;
      const targetAssigneeId = canAssignOthers ? (taskAssignee || null) : sessionUserId;

      const payload: any = {
        projectId: project._id,
        stageId: currentSelectedStage._id,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        assigneeId: targetAssigneeId,
        priority: taskPriority,
        estimatedHours: Number(taskEstHours) || 0,
        plannedStartDate: new Date(taskStartDate),
        plannedEndDate: new Date(taskEndDate),
        blockedBy: taskBlockedBy,
      };

      if (modalLogHoursNow && modalLoggedHours > 0) {
        payload.loggedHours = Number(modalLoggedHours);
        payload.status = "In Progress";
        payload.initialWorkLog = {
          startTime: formatTime12h(modalStartTime),
          endTime: formatTime12h(modalEndTime),
          hours: Number(modalLoggedHours),
          date: taskStartDate,
          notes: modalWorkNotes.trim() || taskDesc.trim() || taskTitle.trim(),
        };
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsTaskModalOpen(false);
        setTaskTitle("");
        setTaskDesc("");
        setTaskAssignee("");
        setTaskBlockedBy([]);
        setModalWorkNotes("");
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
      {/* Unified Single-Row Project Title & KPI Metrics Banner */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: Back Arrow + Project Code & Title + Status + Completion */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/projects"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Back to Portfolio"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2 py-0.5 rounded-md shrink-0">
                {project.code}
              </span>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                {project.name}
              </h1>
              <Badge variant={healthBadge as any} className="text-[10px] font-bold uppercase shrink-0">
                {project.health} &bull; {project.lagInDays > 0 ? `+${project.lagInDays}d Lag` : "On Track"}
              </Badge>
              <span className="text-xs font-mono font-extrabold text-[#00b0ef] bg-[#e0f6fd]/70 dark:bg-[#00b0ef]/15 px-2 py-0.5 rounded-md shrink-0">
                {project.progress || 0}% Complete
              </span>
            </div>
          </div>
        </div>

        {/* Right: The 3 KPI Metrics + Quick Actions in the SAME SINGLE ROW */}
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap shrink-0">
          {/* KPI 1: Schedule & Lag Health */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              project.health === "Red"
                ? "bg-red-100 text-red-600 dark:bg-red-950/60"
                : project.health === "Amber"
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60"
            }`}>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Schedule &amp; Lag</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {project.lagInDays > 0 ? `+${project.lagInDays}d Lag` : "On Schedule"}
              </span>
            </div>
          </div>

          {/* KPI 2: Effort Variance (Est. vs Logged) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Effort Variance</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {totalLoggedHours}h / {totalEstHours}h{" "}
                <span className={`text-[11px] font-semibold ${isOverBudget ? "text-rose-600" : "text-emerald-600"}`}>
                  ({effortVariancePercent > 0 ? `+${effortVariancePercent}%` : `${effortVariancePercent}%`})
                </span>
              </span>
            </div>
          </div>

          {/* KPI 3: Blockers & Risk Cascade */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Blockers &amp; Risk</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {openDiscrepancies.length} Open Issues
              </span>
            </div>
          </div>

          {/* Action Buttons: Sync, Discrepancy, Edit */}
          <div className="flex items-center gap-1.5 pl-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="h-8 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl"
              title="Sync Tracking"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? "animate-spin text-[#00b0ef]" : "text-slate-400"}`} />
              <span className="hidden sm:inline ml-1">{isRecalculating ? "Syncing..." : "Sync"}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setRaiseDiscrepancyDefaultTaskId("");
                setRaiseDiscrepancyDefaultStageId(currentSelectedStage._id);
                setIsRaiseDiscrepancyOpen(true);
              }}
              className="h-8 px-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
              title="Log Discrepancy"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">Discrepancy</span>
            </Button>

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={openEditProject}
                className="h-8 px-2 text-xs font-semibold rounded-xl"
                title="Edit Details"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline ml-1">Edit</span>
              </Button>
            )}
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

      {/* Stage Deliverables & Tasks (Full Width with Integrated Stage Controls & Admin Sign-Off) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Integrated Stage Header & Controls */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          {/* Top Row: Title, Stage Badge, Approval Pill, and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <span className="font-mono text-xs font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2.5 py-1 rounded-lg shrink-0">
                Stage #{currentSelectedStage.order}
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {currentSelectedStage.name}
              </h3>
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
                className="text-xs font-bold uppercase px-2 py-0.5 shrink-0"
              >
                {currentSelectedStage.status}
              </Badge>
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 shrink-0">
                {stageTasks.length} {stageTasks.length === 1 ? "Deliverable" : "Deliverables"}
              </Badge>
            </div>

            {/* Right: Sign-off approval status or review button + Detailed task button */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {currentSelectedStage.signOff?.approvedAt ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block leading-tight text-xs">
                      Sign-Off Approved
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block truncate max-w-[220px]" title={currentSelectedStage.signOff.remarks}>
                      &quot;{currentSelectedStage.signOff.remarks}&quot;
                    </span>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsSignOffModalOpen(true)}
                      className="h-7 px-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    >
                      Update
                    </Button>
                  )}
                </div>
              ) : isAdmin ? (
                <Button
                  size="sm"
                  onClick={() => setIsSignOffModalOpen(true)}
                  className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 mr-1.5" />
                  <span>Stage Sign-Off Review</span>
                </Button>
              ) : (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  Sign-Off Pending
                </span>
              )}

              {/* Detailed Task Button */}
              <Button
                size="sm"
                onClick={() => setIsTaskModalOpen(true)}
                className="bg-[#00b0ef] hover:bg-[#009ad4] text-white h-9 px-3.5 text-xs font-bold rounded-xl shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span>+ Detailed Task</span>
              </Button>
            </div>
          </div>

          {/* Bottom Row: Metadata & Quick Controls Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 text-xs">
            {/* Planned Dates */}
            <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Planned: <strong className="text-slate-800 dark:text-slate-200">{format(new Date(currentSelectedStage.plannedStartDate), "dd MMM yyyy")}</strong> &ndash; <strong className="text-slate-800 dark:text-slate-200">{format(new Date(currentSelectedStage.plannedEndDate), "dd MMM yyyy")}</strong>
              </span>
            </div>

            {/* Stage Owner Dropdown + Stage Status Selector + Progress Slider */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Stage Owner */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-semibold">Owner:</span>
                {canAssignOthers ? (
                  <div className="w-44">
                    <CoolDropdown
                      fullWidth
                      size="sm"
                      searchable
                      value={currentSelectedStage.ownerId?._id || ""}
                      onChange={(val) => handleUpdateStage({ ownerId: val || null })}
                      placeholder="Stage Owner"
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
                ) : (
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl">
                    {currentSelectedStage.ownerId?.name || "Unassigned"}
                  </span>
                )}
              </div>

              {/* Stage Status Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-semibold">Status:</span>
                <div className="w-40">
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
                      { value: "Completed", label: "Completed (Review)", badge: "Sign-Off", badgeVariant: "emerald" },
                      ...(currentSelectedStage.status === "Approved"
                        ? [{ value: "Approved", label: "Approved", badge: "Locked", badgeVariant: "emerald" as const }]
                        : []),
                    ]}
                  />
                </div>
              </div>

              {/* Progress Slider (Interactive) */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-semibold text-slate-500">Progress</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentSelectedStage.percentComplete}
                  onChange={(e) => handleUpdateStage({ percentComplete: Number(e.target.value) })}
                  className="w-20 accent-[#00b0ef] cursor-pointer"
                  title={`Stage progress: ${currentSelectedStage.percentComplete}%`}
                />
                <span className="text-xs font-bold font-mono text-[#00b0ef] min-w-[32px]">
                  {currentSelectedStage.percentComplete}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clean & Spacious Quick Time Tracker (Clockify Style) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
          {/* Tracker Subheader */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/70 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00b0ef]" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Quick Time Tracker (Clockify Style)
              </span>
              <span className="text-xs text-slate-400 font-normal hidden md:inline">
                &bull; Log your deliverable and hours instantly to #{currentSelectedStage.order} {currentSelectedStage.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Target Stage:</span>
              <span className="font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2.5 py-0.5 rounded-lg text-xs">
                #{currentSelectedStage.order} {currentSelectedStage.name}
              </span>
            </div>
          </div>

          <form onSubmit={handleQuickAddAndLogTask} className="space-y-3">
            {/* Row 1: Clockify Primary Input Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
              {/* Task Title Input */}
              <div className="relative flex-1">
                <Input
                  placeholder="What did you work on? (e.g. Design UI components in Figma, build authentication, write test specs...)"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  className="h-11 text-sm font-medium rounded-xl pl-3.5 pr-24 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs placeholder:text-slate-400 focus:ring-2 focus:ring-[#00b0ef]"
                  required
                />
                <div className="absolute right-2.5 top-2.5 flex items-center">
                  <span className="text-xs font-mono font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2.5 py-1 rounded-lg">
                    {quickHours}h Log
                  </span>
                </div>
              </div>

              {/* Time Interval Selector (From - To) */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 h-11 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                <span className="text-xs font-semibold text-slate-400">From</span>
                <input
                  type="time"
                  value={quickStartTime}
                  onChange={(e) => handleQuickStartTimeChange(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden w-[80px] cursor-pointer"
                />
                <span className="text-slate-300 dark:text-slate-600">&ndash;</span>
                <span className="text-xs font-semibold text-slate-400">To</span>
                <input
                  type="time"
                  value={quickEndTime}
                  onChange={(e) => handleQuickEndTimeChange(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden w-[80px] cursor-pointer"
                />
              </div>

              {/* Assignee Selector: Only Admin & Manager can choose; Employees are locked to themselves */}
              {canAssignOthers ? (
                <div className="shrink-0">
                  <select
                    value={quickAssignee}
                    onChange={(e) => setQuickAssignee(e.target.value)}
                    className="h-11 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs min-w-[150px] cursor-pointer"
                  >
                    <option value={(session?.user as any)?.id || ""}>Me ({session?.user?.name || "Assignee"})</option>
                    <option value="">-- Unassigned --</option>
                    {activeUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div
                  className="h-11 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 select-none shadow-2xs"
                  title="Assignee locked to your login. Only Admin & Managers can assign to others."
                >
                  <UserCheck className="w-4 h-4 text-[#00b0ef]" />
                  <span>Me ({session?.user?.name || "Assignee"})</span>
                </div>
              )}

              {/* Add & Log CTA Button */}
              <Button
                type="submit"
                disabled={quickSubmitting}
                className="h-11 px-5 text-sm font-bold bg-[#00b0ef] hover:bg-[#009ad4] text-white shadow-xs rounded-xl shrink-0 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {quickSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>+ Add &amp; Log Work</span>
              </Button>
            </div>

            {/* Row 2: Clockify Quick Interval Presets */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium">Quick Presets:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "10:00 AM – 12:00 PM (2h)", start: "10:00", end: "12:00", hours: 2 },
                    { label: "02:00 PM – 05:00 PM (3h)", start: "14:00", end: "17:00", hours: 3 },
                    { label: "09:30 AM – 01:30 PM (4h)", start: "09:30", end: "13:30", hours: 4 },
                    { label: "09:00 AM – 05:00 PM (8h Full Day)", start: "09:00", end: "17:00", hours: 8 },
                  ].map((p) => {
                    const isActive = quickStartTime === p.start && quickEndTime === p.end;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setQuickStartTime(p.start);
                          setQuickEndTime(p.end);
                          setQuickHours(p.hours);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          isActive
                            ? "bg-[#00b0ef] text-white border-[#00b0ef] shadow-xs"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#00b0ef] hover:text-[#00b0ef]"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <span className="text-xs text-slate-400 hidden lg:inline">
                Creates deliverable task &amp; logs duration simultaneously with zero extra clicks
              </span>
            </div>
          </form>
        </div>

        {/* Stage Deliverables Tasks List (Clockify-Style Single-Row Records) */}
        <div>
          {stageTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No deliverables added to this stage yet
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Use the Quick Time Tracker above to instantly add tasks and log hours, or click &quot;+ Detailed Task&quot; for complete custom configurations.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Clockify Records Header Bar */}
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 select-none">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="w-5 text-center">#</span>
                  <span className="w-24 shrink-0">Module</span>
                  <span className="w-48 xl:w-56 shrink-0">Deliverable</span>
                  <span className="flex-1 min-w-[120px] hidden sm:inline">Description</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-48 text-center">Log Time (From – To)</span>
                  <span className="w-24 hidden xl:inline text-left">Assignee</span>
                  <span className="w-16 text-center">Log</span>
                  <span className="w-24 text-right pr-2">Status</span>
                </div>
              </div>

              {/* Records List (Single Row Per Task, Latest First) */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {stageTasks.map((t: any) => {
                  const isDone = t.status === "Completed";
                  const latestLog =
                    t.workLogs && t.workLogs.length > 0 ? t.workLogs[t.workLogs.length - 1] : null;
                  const timeRangeText =
                    latestLog?.startTime && latestLog?.endTime
                      ? `${latestLog.startTime} – ${latestLog.endTime} (${latestLog.hours}h)`
                      : t.loggedHours > 0
                      ? `${t.loggedHours}h / ${t.estimatedHours || t.loggedHours}h`
                      : "0h logged";

                  return (
                    <div
                      key={t._id}
                      className="py-2.5 px-3 flex items-center justify-between gap-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-all border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60 group"
                    >
                      {/* Left: Checkbox + Module Tag + Deliverable Title + Description (Single Row) */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Status cycle checkbox */}
                        <button
                          onClick={() => handleCycleTaskStatus(t)}
                          title="Click to cycle status"
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center text-xs shrink-0 transition-colors cursor-pointer ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : t.status === "In Progress"
                              ? "border-[#00b0ef] text-[#00b0ef] bg-[#e0f6fd]/40 dark:bg-[#00b0ef]/10"
                              : "border-slate-300 dark:border-slate-600 hover:border-[#00b0ef]"
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        {/* Module Tag */}
                        <span className="text-[11px] font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2 py-0.5 rounded-md shrink-0 w-24 truncate text-center">
                          #{currentSelectedStage.order} {currentSelectedStage.name}
                        </span>

                        {/* Deliverable Title */}
                        <span
                          className={`text-sm font-bold truncate shrink-0 w-48 xl:w-56 ${
                            isDone ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"
                          }`}
                          title={t.title}
                        >
                          {t.title}
                        </span>

                        {/* Lag / Risk badge */}
                        {t.isAtRisk && (
                          <Badge variant="amber" className="text-[10px] px-1.5 py-0 font-bold shrink-0">
                            At Risk
                          </Badge>
                        )}
                        {t.lagInDays > 0 && (
                          <Badge
                            variant={t.health === "Red" ? "destructive" : "amber"}
                            className="text-[10px] px-1.5 py-0 font-bold shrink-0"
                          >
                            +{t.lagInDays}d Lag
                          </Badge>
                        )}

                        {/* Description (Single-line truncated) */}
                        <span
                          className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1 min-w-[100px] hidden sm:inline"
                          title={t.description || t.title}
                        >
                          {t.description ? t.description : <span className="italic text-slate-400">No description</span>}
                        </span>
                      </div>

                      {/* Right: Log From & To Time + Assignee + Log Work + Discrepancy + Status */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Log From and To Time */}
                        <div
                          className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 w-48"
                          title={
                            latestLog?.startTime && latestLog?.endTime
                              ? `Latest Log: ${latestLog.startTime} – ${latestLog.endTime} (${latestLog.hours}h) notes: "${latestLog.notes}"`
                              : `Effort: ${t.loggedHours}h / ${t.estimatedHours || t.loggedHours}h`
                          }
                        >
                          <Clock className="w-3.5 h-3.5 text-[#00b0ef] shrink-0" />
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {timeRangeText}
                          </span>
                        </div>

                        {/* Assignee */}
                        <div className="hidden xl:flex items-center gap-1 text-xs text-slate-500 shrink-0 w-24">
                          <strong className="text-slate-700 dark:text-slate-300 truncate" title={t.assigneeId?.name || "Unassigned"}>
                            {t.assigneeId?.name || "Unassigned"}
                          </strong>
                        </div>

                        {/* Log Work Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTaskForLogWork(t)}
                          className="h-8 px-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:text-[#00b0ef] hover:border-[#00b0ef] transition-colors shrink-0"
                          title="Log working hours (e.g. 10am to 12pm) and update progress"
                        >
                          <Clock className="w-3.5 h-3.5 mr-1 text-[#00b0ef]" />
                          <span>Log</span>
                        </Button>

                        {/* Blocker button */}
                        <button
                          type="button"
                          onClick={() => {
                            setRaiseDiscrepancyDefaultTaskId(t._id);
                            setRaiseDiscrepancyDefaultStageId(currentSelectedStage._id);
                            setIsRaiseDiscrepancyOpen(true);
                          }}
                          title="Log blocker or discrepancy against this deliverable"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer shrink-0"
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>

                        {/* Status Toggle Button */}
                        <button
                          onClick={() => handleCycleTaskStatus(t)}
                          className={`w-24 text-center py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                            t.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100"
                              : t.status === "In Progress"
                              ? "bg-sky-50 text-[#00b0ef] dark:bg-sky-950/60 hover:bg-sky-100"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                          title="Click to cycle status"
                        >
                          {t.status}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Assignee</Label>
                      {!canAssignOthers && (
                        <span className="text-[10px] text-slate-400 font-medium">Assigned to you</span>
                      )}
                    </div>
                    {canAssignOthers ? (
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
                    ) : (
                      <div
                        className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs select-none"
                        title="Assignee locked to your login. Only Admin & Managers can assign to others."
                      >
                        <UserCheck className="w-4 h-4 text-[#00b0ef]" />
                        <span>{session?.user?.name || "Me"} (Yourself)</span>
                      </div>
                    )}
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

              {/* Card 5: Log Initial Working Hours (Clockify Mode) */}
              <div className="p-4 rounded-2xl bg-[#e0f6fd]/30 dark:bg-[#00b0ef]/5 border border-[#00b0ef]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00b0ef]" />
                    <Label className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={modalLogHoursNow}
                        onChange={(e) => setModalLogHoursNow(e.target.checked)}
                        className="rounded accent-[#00b0ef]"
                      />
                      Log Initial Work Session with this Task (Clockify Mode)
                    </Label>
                  </div>
                  <span className="text-[10px] text-[#00b0ef] font-semibold">
                    {modalLogHoursNow ? `${modalLoggedHours}h initial log` : "Disabled"}
                  </span>
                </div>

                {modalLogHoursNow && (
                  <div className="space-y-3 pt-1 border-t border-[#00b0ef]/10">
                    {/* Preset Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {[
                        { label: "10:00 AM – 12:00 PM (2h)", start: "10:00", end: "12:00", hours: 2 },
                        { label: "09:30 AM – 01:30 PM (4h)", start: "09:30", end: "13:30", hours: 4 },
                        { label: "02:00 PM – 05:00 PM (3h)", start: "14:00", end: "17:00", hours: 3 },
                        { label: "05:30 PM – 07:30 PM (2h)", start: "17:30", end: "19:30", hours: 2 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setModalStartTime(preset.start);
                            setModalEndTime(preset.end);
                            setModalLoggedHours(preset.hours);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors border cursor-pointer ${
                            modalStartTime === preset.start && modalEndTime === preset.end
                              ? "bg-[#00b0ef] text-white border-[#00b0ef]"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#00b0ef]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Start Time
                        </Label>
                        <Input
                          type="time"
                          value={modalStartTime}
                          onChange={(e) => handleModalStartTimeChange(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          End Time
                        </Label>
                        <Input
                          type="time"
                          value={modalEndTime}
                          onChange={(e) => handleModalEndTimeChange(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Logged Hours
                        </Label>
                        <Input
                          type="number"
                          step="0.25"
                          min="0.25"
                          value={modalLoggedHours}
                          onChange={(e) => setModalLoggedHours(Number(e.target.value))}
                          className="h-9 text-xs font-bold text-[#00b0ef] rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Work Accomplishment Notes (Optional)
                      </Label>
                      <Input
                        placeholder="e.g. Worked from 10am to 12pm on this deliverable..."
                        value={modalWorkNotes}
                        onChange={(e) => setModalWorkNotes(e.target.value)}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

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

      {/* Log Work Session & Time Interval Modal */}
      <LogWorkModal
        isOpen={!!selectedTaskForLogWork}
        onClose={() => setSelectedTaskForLogWork(null)}
        onSuccess={() => fetchProject()}
        task={selectedTaskForLogWork}
        stageName={currentSelectedStage?.name}
        stageOrder={currentSelectedStage?.order}
      />
    </div>
  );
}
