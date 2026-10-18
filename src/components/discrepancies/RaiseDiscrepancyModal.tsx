"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  X,
  FileQuestion,
  Clock,
  Flame,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypeSelect } from "@/components/ui/type-select";
import { DiscrepancyType, DiscrepancySeverity } from "@/types/models";

interface RaiseDiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultStageId?: string;
  defaultTaskId?: string;
  onSuccess?: () => void;
}

const DISCREPANCY_TYPES: { type: DiscrepancyType; label: string; icon: any; desc: string }[] = [
  {
    type: "Scope Change",
    label: "Scope Change",
    icon: Layers,
    desc: "Requirements altered or new deliverables added beyond baseline",
  },
  {
    type: "Effort Overrun",
    label: "Effort Overrun",
    icon: TrendingDown,
    desc: "Actual hours significantly exceed estimated hours",
  },
  {
    type: "Delay",
    label: "Work Delay / Lag",
    icon: Clock,
    desc: "Stage or task slipping past planned completion milestone",
  },
  {
    type: "Quality Issue",
    label: "Quality Issue",
    icon: Flame,
    desc: "Defects, regressions, or acceptance criteria failure",
  },
  {
    type: "Requirement Gap",
    label: "Requirement Gap",
    icon: FileQuestion,
    desc: "Ambiguous specs, missing technical designs, or open blockers",
  },
  {
    type: "Other",
    label: "General Discrepancy",
    icon: HelpCircle,
    desc: "External dependencies, vendor delays, or infrastructure issues",
  },
];

const SEVERITIES: { severity: DiscrepancySeverity; label: string; color: string; badge: string }[] = [
  { severity: "Low", label: "Low", color: "border-slate-300 text-slate-700 dark:text-slate-300", badge: "bg-slate-100 dark:bg-slate-800" },
  { severity: "Medium", label: "Medium", color: "border-amber-400 text-amber-700 dark:text-amber-400", badge: "bg-amber-50 dark:bg-amber-950/50" },
  { severity: "High", label: "High", color: "border-orange-500 text-orange-700 dark:text-orange-400", badge: "bg-orange-50 dark:bg-orange-950/50" },
  { severity: "Critical", label: "Critical Blocker", color: "border-red-500 text-red-700 dark:text-red-400", badge: "bg-red-50 dark:bg-red-950/50" },
];

export function RaiseDiscrepancyModal({
  isOpen,
  onClose,
  defaultProjectId = "",
  defaultStageId = "",
  defaultTaskId = "",
  onSuccess,
}: RaiseDiscrepancyModalProps) {
  const queryClient = useQueryClient();

  const [projectId, setProjectId] = useState(defaultProjectId);
  const [stageId, setStageId] = useState(defaultStageId);
  const [taskId, setTaskId] = useState(defaultTaskId);
  const [type, setType] = useState<DiscrepancyType>("Delay");
  const [severity, setSeverity] = useState<DiscrepancySeverity>("Medium");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync state when props change
  useEffect(() => {
    if (defaultProjectId) setProjectId(defaultProjectId);
    if (defaultStageId) setStageId(defaultStageId);
    if (defaultTaskId) setTaskId(defaultTaskId);
  }, [defaultProjectId, defaultStageId, defaultTaskId]);

  // Fetch available projects
  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const json = await res.json();
      return json.data || [];
    },
    enabled: isOpen,
  });

  // Fetch project details for stages and tasks
  const { data: projectDetails } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await fetch(`/api/projects/${projectId}`);
      const json = await res.json();
      return json.data || null;
    },
    enabled: isOpen && !!projectId,
  });

  const stages = projectDetails?.stages || [];
  const tasks = projectDetails?.tasks || [];

  // Filter tasks by selected stage if chosen
  const filteredTasks = stageId
    ? tasks.filter((t: any) => t.stageId === stageId || t.stageId?._id === stageId)
    : tasks;

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      if (!projectId) throw new Error("Please select a project");
      if (!description.trim() || description.trim().length < 5) {
        throw new Error("Please provide a descriptive explanation (minimum 5 characters)");
      }

      const res = await fetch("/api/discrepancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          stageId: stageId || null,
          taskId: taskId || null,
          type,
          severity,
          description: description.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to raise discrepancy");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discrepancies"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["my-work"] });
      setDescription("");
      if (!defaultProjectId) setProjectId("");
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to submit discrepancy");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Log Work Lag / Discrepancy
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Raise an issue, effort overrun, or blocker to alert leads and track resolution.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project & Context Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TypeSelect
              label="Project"
              required
              disabled={!!defaultProjectId}
              value={projectId}
              onChange={(val) => {
                setProjectId(val);
                setStageId("");
                setTaskId("");
              }}
              placeholder="Select Project..."
              options={projectsData?.map((p: any) => ({
                value: p._id,
                label: `[${p.code}] ${p.name}`,
                badge: p.code,
              })) || []}
            />

            <TypeSelect
              label="Lifecycle Stage (Optional)"
              disabled={!projectId}
              value={stageId}
              onChange={(val) => {
                setStageId(val);
                setTaskId("");
              }}
              placeholder="All Stages / Project-Wide"
              options={[
                { value: "", label: "All Stages / Project-Wide" },
                ...(stages?.map((s: any) => ({
                  value: s._id,
                  label: `${s.order}. ${s.name}`,
                })) || []),
              ]}
            />

            <TypeSelect
              label="Specific Task (Optional)"
              disabled={!projectId}
              value={taskId}
              onChange={(val) => setTaskId(val)}
              placeholder="No specific task"
              options={[
                { value: "", label: "No specific task" },
                ...(filteredTasks?.map((t: any) => ({
                  value: t._id,
                  label: t.title,
                })) || []),
              ]}
            />
          </div>

          {/* Discrepancy Type Grid */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Discrepancy Classification *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DISCREPANCY_TYPES.map((dt) => {
                const Icon = dt.icon;
                const isSelected = type === dt.type;
                return (
                  <button
                    key={dt.type}
                    type="button"
                    onClick={() => setType(dt.type)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-[#00b0ef] bg-[#00b0ef]/5 text-[#007ea8] dark:text-[#00b0ef] ring-1 ring-[#00b0ef]"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? "text-[#00b0ef]" : "text-slate-400"}`} />
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#00b0ef]" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{dt.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{dt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Severity Level *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEVERITIES.map((s) => {
                const isSelected = severity === s.severity;
                return (
                  <button
                    key={s.severity}
                    type="button"
                    onClick={() => setSeverity(s.severity)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? `${s.color} ${s.badge} ring-2 ring-current`
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Detailed Description &amp; Root Cause *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what occurred, any blocker dependencies, root cause, and estimated impact..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00b0ef]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <span className="text-[11px] text-slate-400">
            Admins and assignees will be notified automatically upon submission.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-[#00b0ef] hover:bg-[#007ea8] text-white font-bold"
            >
              {mutation.isPending ? "Logging..." : "Log Discrepancy"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
