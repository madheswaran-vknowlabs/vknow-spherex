"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  X,
  Layers,
  Calendar,
  Users,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Building2,
  FolderPlus,
} from "lucide-react";
import { addDays, addMonths, format } from "date-fns";
import { DEFAULT_STAGES } from "@/types/models";

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  avatar?: string;
}

interface CreateProjectModalProps {
  onSuccess: () => void;
}

export function CreateProjectModal({ onSuccess }: CreateProjectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 2), "yyyy-MM-dd"));
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate code from name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!code || code === generateProjectCode(name)) {
      setCode(generateProjectCode(val));
    }
  };

  const generateProjectCode = (str: string) => {
    if (!str.trim()) return "";
    const words = str.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 4).toUpperCase();
    }
    return words
      .map((w) => w[0])
      .join("")
      .slice(0, 5)
      .toUpperCase();
  };

  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true);
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUsers(data.data);
            // Default select all users or first few
            if (selectedMembers.length === 0) {
              setSelectedMembers(data.data.slice(0, 4).map((u: any) => u._id));
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen]);

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          client: client.trim() || "Internal",
          description: description.trim(),
          plannedStartDate: new Date(startDate),
          plannedEndDate: new Date(endDate),
          members: selectedMembers,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to create project");
      }

      setIsOpen(false);
      resetForm();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCode("");
    setClient("");
    setDescription("");
    setError(null);
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-[#00b0ef] hover:bg-[#009ad4] text-white shadow-sm flex items-center gap-1.5 h-9 px-3.5 text-xs font-bold rounded-xl"
      >
        <Plus className="w-4 h-4" />
        <span>New Project</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef]">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Create New Project
                  </h3>
                  <p className="text-xs text-slate-500">
                    Initializes all 8 standard lifecycle stages automatically
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="proj-name" className="text-xs">Project Name *</Label>
                  <Input
                    id="proj-name"
                    placeholder="e.g. NextGen Microservices Platform"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="proj-code" className="text-xs">Project Code *</Label>
                  <Input
                    id="proj-code"
                    placeholder="e.g. NMP-CORE"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {/* Client & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="proj-client" className="text-xs">Client / Department</Label>
                  <Input
                    id="proj-client"
                    placeholder="e.g. Retail Banking Division"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="proj-desc" className="text-xs">Brief Description</Label>
                  <Input
                    id="proj-desc"
                    placeholder="Key objectives and delivery milestones"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Planned Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="start-date" className="text-xs">Planned Start Date *</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-date" className="text-xs">Planned Delivery Date *</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Member Selection Chips */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Assign Team Members ({selectedMembers.length} selected)</Label>
                  <span className="text-[11px] text-[#00b0ef]">Click to toggle members</span>
                </div>

                {loadingUsers ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading team members...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    {users.map((u) => {
                      const isSelected = selectedMembers.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => toggleMember(u._id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-[#00b0ef] text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                            {u.name[0]}
                          </span>
                          <span>{u.name}</span>
                          {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 8-Stage Lifecycle Template Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00b0ef]" />
                    <span>Auto-Generated 8 Lifecycle Stages</span>
                  </span>
                  <Badge variant="cyan" className="text-[10px] px-2 py-0">
                    Sequential Gating
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  {DEFAULT_STAGES.map((s, idx) => (
                    <div
                      key={s}
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 truncate"
                      title={s}
                    >
                      <strong className="text-[#00b0ef] font-mono mr-1">{idx + 1}.</strong>
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-9 px-5 text-xs font-bold bg-[#00b0ef] hover:bg-[#009ad4] text-white shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Creating Stages...
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                      Create Project &amp; Stages
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
