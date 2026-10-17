"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Search,
  ChevronDown,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { addMonths, format } from "date-fns";
import { DEFAULT_STAGES } from "@/types/models";
import { generateProjectCode } from "@/lib/utils";

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

const PRESET_ADDITIONAL_STAGES = [
  "Feasibility Study",
  "Client Demo",
  "Security & Compliance Audit",
  "Performance & Load Testing",
  "Beta Release",
];

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

  // Searchable Member Dropdown State
  const [memberSearch, setMemberSearch] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Customizable Lifecycle Stages State
  const [stages, setStages] = useState<string[]>([...DEFAULT_STAGES]);
  const [customStageInput, setCustomStageInput] = useState("");

  // Close member dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMemberDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-generate code silently from name
  const handleNameChange = (val: string) => {
    setName(val);
    setCode(generateProjectCode(val));
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
              if (currentUserId) {
                setSelectedMembers([currentUserId]);
              } else {
                setSelectedMembers(data.data.slice(0, 3).map((u: any) => u._id));
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

  const handleClearAllMembers = () => {
    setSelectedMembers([]);
  };

  // Stage Management Functions
  const handleAddStage = (stageName: string) => {
    const trimmed = stageName.trim();
    if (!trimmed) return;
    if (stages.includes(trimmed)) {
      alert(`Stage '${trimmed}' is already in the lifecycle.`);
      return;
    }
    setStages([...stages, trimmed]);
    setCustomStageInput("");
  };

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      alert("A project must have at least one stage.");
      return;
    }
    setStages(stages.filter((_, idx) => idx !== index));
  };

  const handleResetStages = () => {
    setStages([...DEFAULT_STAGES]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const generatedCode = code.trim() || generateProjectCode(name) || "PROJ";

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: generatedCode.toUpperCase(),
          client: client.trim() || "Internal",
          description: description.trim(),
          plannedStartDate: new Date(startDate),
          plannedEndDate: new Date(endDate),
          members: selectedMembers,
          stages: stages,
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
    setStages([...DEFAULT_STAGES]);
    setMemberSearch("");
    setError(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = memberSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.department || "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef]">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Create New Project</span>
                    <Badge variant="cyan" className="text-[10px] font-mono">
                      {stages.length}-Stage Lifecycle
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure project scope, assign team members, and customize delivery stages.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Project Name (Full-width, Project Code is auto-generated silently) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="proj-name" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Project Name <span className="text-rose-500">*</span>
                  </Label>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" /> Auto Code Sync
                  </span>
                </div>
                <Input
                  id="proj-name"
                  placeholder="e.g. NextGen Microservices Platform"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="h-11 text-sm rounded-xl font-medium focus:ring-2 focus:ring-[#00b0ef]"
                />
              </div>

              {/* 2. Client / Organization */}
              <div className="space-y-1.5">
                <Label htmlFor="proj-client" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Client / Department / Sponsor
                </Label>
                <Input
                  id="proj-client"
                  placeholder="e.g. Retail Banking Division or Internal"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="h-11 text-sm rounded-xl font-medium"
                />
              </div>

              {/* 3. Brief Description (Enlarged with ample space) */}
              <div className="space-y-1.5">
                <Label htmlFor="proj-desc" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Brief Description &amp; Delivery Objectives
                </Label>
                <textarea
                  id="proj-desc"
                  rows={3}
                  placeholder="Provide key delivery goals, technical architecture scope, dependencies, and customer acceptance criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00b0ef] transition-colors resize-y leading-relaxed"
                />
              </div>

              {/* 4. Planned Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start-date" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Planned Start Date <span className="text-rose-500">*</span>
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
                  <Label htmlFor="end-date" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Planned Delivery Date <span className="text-rose-500">*</span>
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

              {/* 5. Assigned Members - Searchable Dropdown Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#00b0ef]" />
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Assigned Members ({selectedMembers.length} selected)
                    </Label>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectSelfOnly}
                      className="px-2.5 py-1 rounded-lg bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef] font-bold text-xs hover:opacity-80 transition-opacity border border-[#00b0ef]/30 flex items-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Admin Own Work (Self)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    {selectedMembers.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllMembers}
                        className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-500 text-xs transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Searchable Dropdown Component */}
                <div ref={memberDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-sm text-left hover:border-[#00b0ef] transition-colors cursor-pointer"
                  >
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {selectedMembers.length === 0
                        ? "Choose members from dropdown..."
                        : `${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""} selected`}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isMemberDropdownOpen ? "rotate-180 text-[#00b0ef]" : ""
                      }`}
                    />
                  </button>

                  {isMemberDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                      {/* Search Bar inside Dropdown */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <Input
                          placeholder="Search members by name, role or department..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="h-9 pl-9 text-xs rounded-lg border-slate-200 dark:border-slate-800"
                          autoFocus
                        />
                      </div>

                      {/* Members List with Checkboxes */}
                      <div className="max-h-56 overflow-y-auto space-y-1">
                        {loadingUsers ? (
                          <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-[#00b0ef]" />
                            <span>Loading team...</span>
                          </div>
                        ) : filteredUsers.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No team members match your search
                          </div>
                        ) : (
                          filteredUsers.map((u) => {
                            const isSelected = selectedMembers.includes(u._id);
                            const isSelf = u._id === currentUserId;
                            return (
                              <div
                                key={u._id}
                                onClick={() => toggleMember(u._id)}
                                className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-[#00b0ef]/10 text-slate-900 dark:text-white"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                      isSelected
                                        ? "bg-[#00b0ef] text-white"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                    }`}
                                  >
                                    {u.name[0]}
                                  </div>
                                  <div className="truncate">
                                    <div className="font-semibold truncate">
                                      {u.name} {isSelf ? "(Myself)" : ""}
                                    </div>
                                    <div className="text-[10px] text-slate-400 truncate">
                                      {u.department || "Engineering"} • {u.email}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "bg-[#00b0ef] border-[#00b0ef] text-white"
                                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Members Pill Chips */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedMembers.map((id) => {
                      const user = users.find((u) => u._id === id);
                      if (!user) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#00b0ef] text-white text-[9px] flex items-center justify-center font-bold">
                            {user.name[0]}
                          </span>
                          <span>{user.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleMember(id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 6. Customizable Lifecycle Stages */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00b0ef]" />
                    <span>Project Lifecycle Stages ({stages.length} Stages)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetStages}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#00b0ef] transition-colors cursor-pointer"
                      title="Reset to default 8 stages"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Standard</span>
                    </button>
                    <Badge variant="cyan" className="text-[10px] px-2 py-0.5">
                      Sequential Gating
                    </Badge>
                  </div>
                </div>

                {/* Preset Suggestions Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">Add Stage Preset:</span>
                  {PRESET_ADDITIONAL_STAGES.map((preset) => {
                    const isAdded = stages.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddStage(preset)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                          isAdded
                            ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#00b0ef] hover:text-[#00b0ef]"
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{preset}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Stage Input Bar */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Or type custom stage (e.g. Feasibility, Client Demo, UAT Signoff)..."
                    value={customStageInput}
                    onChange={(e) => setCustomStageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddStage(customStageInput);
                      }
                    }}
                    className="h-9 text-xs rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddStage(customStageInput)}
                    disabled={!customStageInput.trim()}
                    className="h-9 px-3.5 rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Stage</span>
                  </Button>
                </div>

                {/* Active Stages Preview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {stages.map((s, idx) => (
                    <div
                      key={`${s}-${idx}`}
                      className="group flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:border-[#00b0ef]/50 transition-colors"
                      title={s}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-md bg-[#00b0ef]/10 text-[#00b0ef] text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                          {s}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(idx)}
                        className="text-slate-300 group-hover:text-rose-500 hover:text-rose-600 transition-colors p-0.5 cursor-pointer ml-1 shrink-0"
                        title="Remove stage"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-6 rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-sm shadow-sm cursor-pointer"
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
