"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Briefcase,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypeSelect } from "@/components/ui/type-select";

interface ManageProjectTeamModalProps {
  projectId: string;
  projectName: string;
  projectCode: string;
  isOpen: boolean;
  onClose: () => void;
  onTeamUpdated: (members: any[]) => void;
}

export function ManageProjectTeamModal({
  projectId,
  projectName,
  projectCode,
  isOpen,
  onClose,
  onTeamUpdated,
}: ManageProjectTeamModalProps) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [addingUser, setAddingUser] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchMembersData = () => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/members`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setMembers(res.data.members || []);
          setAvailableUsers(res.data.availableUsers || []);
          if (res.data.availableUsers?.length > 0) {
            setSelectedUserId(res.data.availableUsers[0]._id);
          } else {
            setSelectedUserId("");
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      fetchMembersData();
    }
  }, [isOpen, projectId]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setAddingUser(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || "Employee successfully added to project!",
        });
        setMembers(data.data?.members || []);
        onTeamUpdated(data.data?.members || []);
        // Refresh available users
        fetchMembersData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to add employee" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "An error occurred" });
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this project?`)) {
      return;
    }

    setRemovingUserId(userId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `${userName} removed from project.`,
        });
        setMembers(data.data?.members || []);
        onTeamUpdated(data.data?.members || []);
        fetchMembersData();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to remove member" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "An error occurred" });
    } finally {
      setRemovingUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00b0ef]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-[#0c2438] to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="cyan" className="font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5">
                {projectCode}
              </Badge>
              <span className="text-xs text-slate-400">Team Allocation &amp; Access</span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00b0ef]" />
              <span>Manage Project Team Members</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 truncate max-w-md">
              {projectName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold ${
                feedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="underline text-[11px]">
                Dismiss
              </button>
            </div>
          )}

          {/* Form to Add Employee to Project */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#00b0ef]" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Add Additional Employee to Project
              </h4>
            </div>

            {availableUsers.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                All available active employees and users are already assigned to this project.
              </p>
            ) : (
              <form onSubmit={handleAddEmployee} className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="flex-1 w-full">
                  <TypeSelect
                    id="add-member-select"
                    value={selectedUserId}
                    onChange={(val) => setSelectedUserId(val)}
                    placeholder="Search employee by name, email, department..."
                    options={availableUsers.map((u) => ({
                      value: u._id,
                      label: u.name,
                      sublabel: `${u.email} • ${u.department || "Engineering"}`,
                      badge: u.role?.toUpperCase(),
                    }))}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={addingUser || !selectedUserId}
                  className="w-full sm:w-auto h-11 px-5 bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {addingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Add to Project</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Currently Assigned Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>Current Project Members</span>
                <Badge variant="cyan" className="text-[10px] px-1.5 py-0 font-bold">
                  {members.length}
                </Badge>
              </span>
              <span className="text-[11px] text-slate-400">
                Members can log daily hours &amp; deliverables
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-[#00b0ef]" />
                <span className="text-xs">Loading team members...</span>
              </div>
            ) : members.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400 italic">
                No members currently assigned to this project.
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member._id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00b0ef] to-[#007ea8] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {member.name?.charAt(0) || "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {member.name}
                          </span>
                          <Badge
                            variant={
                              member.role === "manager"
                                ? "cyan"
                                : member.role === "admin"
                                ? "amber"
                                : "secondary"
                            }
                            className="text-[9px] uppercase font-extrabold px-1.5 py-0"
                          >
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {member.email} &bull; {member.department || "Engineering"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={removingUserId === member._id}
                      onClick={() => handleRemoveMember(member._id, member.name)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                      title={`Remove ${member.name} from project`}
                    >
                      {removingUserId === member._id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Added members will receive an instant dashboard alert.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold rounded-xl"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
