"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Check,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  GitBranch,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { TypeSelect } from "@/components/ui/type-select";

interface AssignedProject {
  _id: string;
  name: string;
  code: string;
  currentStageId?: any;
  members?: any[];
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects?: AssignedProject[];
  defaultProjectId?: string;
  defaultStageId?: string;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  projects = [],
  defaultProjectId,
  defaultStageId,
}: CreateTaskModalProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const currentUserRole = (session?.user as any)?.role;
  const canAssignOthers = currentUserRole === "admin" || currentUserRole === "manager";

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || (projects.length > 0 ? projects[0]._id : "")
  );
  const [stages, setStages] = useState<any[]>([]);
  const [existingTasks, setExistingTasks] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loadingProjectData, setLoadingProjectData] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStageId, setSelectedStageId] = useState<string>(defaultStageId || "");
  const [assigneeId, setAssigneeId] = useState<string>(currentUserId || "");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [estimatedHours, setEstimatedHours] = useState<number>(8);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 5), "yyyy-MM-dd"));
  const [blockedBy, setBlockedBy] = useState<string[]>([]);

  // Clockify Initial Working Hours
  const [logHoursNow, setLogHoursNow] = useState(true);
  const [initialStartTime, setInitialStartTime] = useState("10:00");
  const [initialEndTime, setInitialEndTime] = useState("12:00");
  const [initialLoggedHours, setInitialLoggedHours] = useState(2);
  const [initialNotes, setInitialNotes] = useState("");

  const calculateHours = (startStr: string, endStr: string) => {
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

  const handleStartTimeChange = (newStart: string) => {
    setInitialStartTime(newStart);
    const calc = calculateHours(newStart, initialEndTime);
    if (calc > 0) setInitialLoggedHours(calc);
  };

  const handleEndTimeChange = (newEnd: string) => {
    setInitialEndTime(newEnd);
    const calc = calculateHours(initialStartTime, newEnd);
    if (calc > 0) setInitialLoggedHours(calc);
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync defaultProjectId
  useEffect(() => {
    if (defaultProjectId) {
      setSelectedProjectId(defaultProjectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [defaultProjectId, projects]);

  // Load project details (stages, members, existing tasks for dependencies)
  useEffect(() => {
    if (!isOpen || !selectedProjectId) return;

    setLoadingProjectData(true);
    fetch(`/api/projects/${selectedProjectId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const prj = data.data.project;
          const stgs = data.data.stages || [];
          const tsks = data.data.tasks || [];
          const mmbrs = prj.members || [];

          setStages(stgs);
          setExistingTasks(tsks);
          setProjectMembers(mmbrs);

          // Default stage
          if (!defaultStageId || !stgs.some((s: any) => s._id === defaultStageId)) {
            const currentStage =
              stgs.find(
                (s: any) =>
                  s._id === (prj.currentStageId?._id || prj.currentStageId) ||
                  s.status === "In Progress"
              ) || stgs[0];
            if (currentStage) {
              setSelectedStageId(currentStage._id);
            }
          } else {
            setSelectedStageId(defaultStageId);
          }

          // Default assignee to current user if member, else first member
          if (currentUserId && mmbrs.some((m: any) => m._id === currentUserId)) {
            setAssigneeId(currentUserId);
          } else if (mmbrs.length > 0) {
            setAssigneeId(mmbrs[0]._id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProjectData(false));
  }, [isOpen, selectedProjectId, defaultStageId, currentUserId]);

  const toggleDependency = (taskId: string) => {
    if (blockedBy.includes(taskId)) {
      setBlockedBy(blockedBy.filter((id) => id !== taskId));
    } else {
      setBlockedBy([...blockedBy, taskId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!selectedProjectId) throw new Error("Please select a project.");
      if (!selectedStageId) throw new Error("Please select a target stage.");
      if (!title.trim()) throw new Error("Please enter a task title.");

      const payload: any = {
        projectId: selectedProjectId,
        stageId: selectedStageId,
        title: title.trim(),
        description: description.trim(),
        assigneeId: canAssignOthers ? (assigneeId || null) : currentUserId,
        priority,
        estimatedHours: Number(estimatedHours) || 0,
        plannedStartDate: new Date(startDate),
        plannedEndDate: new Date(endDate),
        blockedBy,
      };

      if (logHoursNow && initialLoggedHours > 0) {
        payload.loggedHours = Number(initialLoggedHours);
        payload.status = "In Progress";
        payload.initialWorkLog = {
          startTime: formatTime12h(initialStartTime),
          endTime: formatTime12h(initialEndTime),
          hours: Number(initialLoggedHours),
          date: startDate,
          notes: initialNotes.trim() || description.trim() || title.trim(),
        };
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create task");
      }

      // Reset and close
      setTitle("");
      setDescription("");
      setBlockedBy([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef] flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Create Task &amp; Deliverable</span>
                <Badge variant="cyan" className="text-[10px] font-mono">
                  Dependency Aware
                </Badge>
              </h2>
              <p className="text-xs text-slate-500">
                Define deliverables, assign responsibility, and link predecessor dependencies.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project & Stage Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <TypeSelect
              label="Assigned Project"
              required
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              placeholder="Type or select project..."
              options={projects.map((p) => ({
                value: p._id,
                label: `[${p.code}] ${p.name}`,
                badge: p.code,
              }))}
            />

            {loadingProjectData ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Lifecycle Stage *</Label>
                <div className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Loading stages...
                </div>
              </div>
            ) : (
              <TypeSelect
                label="Lifecycle Stage"
                required
                value={selectedStageId}
                onChange={(val) => setSelectedStageId(val)}
                placeholder="Type or select stage..."
                options={stages.map((s) => ({
                  value: s._id,
                  label: `Stage ${s.order}: ${s.name}`,
                  badge: s.status,
                }))}
              />
            )}
          </div>

          {/* Task Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Task Title / Deliverable Name *</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement Serwist Offline Service Worker & PWA Manifest"
              className="h-11 text-sm font-medium rounded-xl"
            />
          </div>

          {/* Task Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Scope &amp; Acceptance Criteria (Optional)</Label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide technical notes, deliverables, or checklist items..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-[#00b0ef]"
            />
          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              {canAssignOthers ? (
                <TypeSelect
                  label="Assignee"
                  value={assigneeId}
                  onChange={(val) => setAssigneeId(val)}
                  placeholder="Type or select assignee..."
                  options={projectMembers.map((m) => ({
                    value: m._id,
                    label: `${m.name} ${m._id === currentUserId ? "(Myself)" : ""}`,
                    badge: m._id === currentUserId ? "Myself" : undefined,
                    sublabel: m.department || m.role,
                  }))}
                />
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Assignee</Label>
                    <span className="text-[10px] text-slate-400 font-medium">Assigned to you</span>
                  </div>
                  <div
                    className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-2xs select-none"
                    title="Assignee locked to your login. Only Admin & Managers can assign to others."
                  >
                    <UserCheck className="w-4 h-4 text-[#00b0ef]" />
                    <span>{session?.user?.name || "Me"} (Yourself)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Priority</Label>
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                {(["Low", "Medium", "High", "Urgent"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all ${
                      priority === p
                        ? p === "Urgent"
                          ? "bg-rose-600 text-white shadow-xs"
                          : p === "High"
                          ? "bg-amber-600 text-white shadow-xs"
                          : p === "Medium"
                          ? "bg-[#00b0ef] text-white shadow-xs"
                          : "bg-slate-700 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dates & Hours (Modern DatePicker) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <DatePicker
              label="Planned Start Date"
              required
              value={startDate}
              onChange={setStartDate}
              placeholder="YYYY-MM-DD"
            />

            <DatePicker
              label="Planned End Date"
              required
              value={endDate}
              onChange={setEndDate}
              placeholder="YYYY-MM-DD"
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Estimated Hours</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="h-11 text-sm rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Predecessor Dependencies (blockedBy) */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-[#00b0ef]" />
                <Label className="text-xs font-bold">
                  Task Dependencies ({blockedBy.length} selected)
                </Label>
              </div>
              <span className="text-[11px] text-slate-400">
                Select tasks that must finish before this task starts
              </span>
            </div>

            {loadingProjectData ? (
              <div className="p-3 text-xs text-slate-400">Loading existing project tasks...</div>
            ) : existingTasks.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-400">
                No existing tasks in this project yet. This will be the first deliverable!
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                {existingTasks.map((t) => {
                  const isBlocked = blockedBy.includes(t._id);
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => toggleDependency(t._id)}
                      className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between gap-2 transition-all ${
                        isBlocked
                          ? "bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef] font-bold border border-[#00b0ef]/30"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isBlocked
                              ? "bg-[#00b0ef] border-[#00b0ef] text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isBlocked && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span className="truncate">{t.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-400 font-normal">
                          {t.stageId?.name || "Stage"}
                        </span>
                        <Badge
                          variant={
                            t.status === "Completed"
                              ? "green"
                              : t.status === "In Progress"
                              ? "cyan"
                              : "secondary"
                          }
                          className="text-[9px] px-1 py-0"
                        >
                          {t.status}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card: Clockify Initial Work Log */}
          <div className="p-4 rounded-2xl bg-[#e0f6fd]/30 dark:bg-[#00b0ef]/5 border border-[#00b0ef]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00b0ef]" />
                <label className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={logHoursNow}
                    onChange={(e) => setLogHoursNow(e.target.checked)}
                    className="rounded accent-[#00b0ef]"
                  />
                  Log Initial Working Hours with Task (Clockify Style)
                </label>
              </div>
              <span className="text-[10px] text-[#00b0ef] font-semibold">
                {logHoursNow ? `${initialLoggedHours}h initial log` : "Disabled"}
              </span>
            </div>

            {logHoursNow && (
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
                        setInitialStartTime(preset.start);
                        setInitialEndTime(preset.end);
                        setInitialLoggedHours(preset.hours);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors border cursor-pointer ${
                        initialStartTime === preset.start && initialEndTime === preset.end
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
                      value={initialStartTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      End Time
                    </Label>
                    <Input
                      type="time"
                      value={initialEndTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
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
                      value={initialLoggedHours}
                      onChange={(e) => setInitialLoggedHours(Number(e.target.value))}
                      className="h-9 text-xs font-bold text-[#00b0ef] rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Session Accomplishment Notes (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. Worked from 10am to 12pm on this deliverable..."
                    value={initialNotes}
                    onChange={(e) => setInitialNotes(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-5 rounded-xl text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 px-6 rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-sm shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Creating Task...</span>
                </>
              ) : (
                <span>Save Deliverable</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
