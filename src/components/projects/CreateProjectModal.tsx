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
  Layers,
  Calendar,
  Users,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Building2,
  FolderPlus,
  UserCheck,
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
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

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
            if (selectedMembers.length === 0) {
              // Default select current user or first few
              if (currentUserId) {
                setSelectedMembers([currentUserId]);
              } else {
                setSelectedMembers(data.data.slice(0, 4).map((u: any) => u._id));
              }
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen, currentUserId]);

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const handleSelectSelfOnly = () => {
    if (currentUserId) {
      setSelectedMembers([currentUserId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedMembers(users.map((u) => u._id));
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
        className="h-10 px-4 rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all"
      >
        <Plus className="w-4 h-4" />
        <span>New Project</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef]">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Create New Project</span>
                    <Badge variant="cyan" className="text-[10px] font-mono">
                      8-Stage Lifecycle
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure project scope, assign team members or self-manage as admin own work.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="proj-name" className="text-xs font-bold">
                    Project Name *
                  </Label>
                  <Input
                    id="proj-name"
                    placeholder="e.g. NextGen Microservices Platform"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    className="h-11 text-sm rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proj-code" className="text-xs font-bold">
                    Project Code *
                  </Label>
                  <Input
                    id="proj-code"
                    placeholder="e.g. NMP-CORE"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    className="h-11 text-sm font-mono font-bold uppercase rounded-xl"
                  />
                </div>
              </div>

              {/* Client & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="proj-client" className="text-xs font-bold">
                    Client / Department
                  </Label>
                  <Input
                    id="proj-client"
                    placeholder="e.g. Retail Banking Division"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="h-11 text-sm rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proj-desc" className="text-xs font-bold">
                    Brief Description
                  </Label>
                  <Input
                    id="proj-desc"
                    placeholder="Key objectives and delivery milestones"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-11 text-sm rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Planned Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date" className="text-xs font-bold">
                    Planned Start Date *
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="h-11 text-sm rounded-xl font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-date" className="text-xs font-bold">
                    Planned Delivery Date *
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="h-11 text-sm rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Member Selection Chips & Admin Quick Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#00b0ef]" />
                    <Label className="text-xs font-bold">
                      Assigned Members ({selectedMembers.length} selected)
                    </Label>
                  </div>

                  {/* 1-Tap Presets */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectSelfOnly}
                      className="px-2.5 py-1 rounded-lg bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef] font-bold text-xs hover:opacity-80 transition-opacity border border-[#00b0ef]/30 flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Admin Own Work (Self)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 transition-colors"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00b0ef]" />
                    <span>Loading team members...</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    {users.map((u) => {
                      const isSelected = selectedMembers.includes(u._id);
                      const isSelf = u._id === currentUserId;
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => toggleMember(u._id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-[#00b0ef] text-white shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {u.name[0]}
                          </span>
                          <span>
                            {u.name} {isSelf ? "(Myself)" : ""}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 8-Stage Lifecycle Template Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00b0ef]" />
                    <span>Auto-Generated 8-Stage Lifecycle</span>
                  </span>
                  <Badge variant="cyan" className="text-[10px] px-2 py-0.5">
                    Sequential Gating
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  {DEFAULT_STAGES.map((s, idx) => (
                    <div
                      key={s}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 truncate text-[11px]"
                      title={s}
                    >
                      <strong className="text-[#00b0ef] font-mono mr-1">{idx + 1}.</strong>
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
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
                      <span>Creating Project...</span>
                    </>
                  ) : (
                    <span>Initialize Project</span>
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
