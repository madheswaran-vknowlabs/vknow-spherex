"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Shield,
  Search,
  Filter,
  Check,
  X,
  KeyRound,
  Loader2,
  ArrowLeft,
  Building2,
  Mail,
  UserCheck,
  UserX,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  department?: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");

  // Create User Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [department, setDepartment] = useState("Engineering");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset Password Modal state
  const [resettingUser, setResettingUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("password123");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/users")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setUsers(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          department: department.trim(),
          password: password.trim() || "password123",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create employee");
      }

      setIsCreateOpen(false);
      setName("");
      setEmail("");
      setPassword("password123");
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Failed to create employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    const nextStatus = !user.isActive;
    const actionName = nextStatus ? "reactivate" : "deactivate";
    if (!confirm(`Are you sure you want to ${actionName} ${user.name}?`)) return;

    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to update employee status");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleRole = async (user: UserItem) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    if (
      !confirm(
        `Change ${user.name}'s role to ${nextRole === "admin" ? "Administrator" : "Team Member"}?`
      )
    )
      return;

    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to update role");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setResetSubmitting(true);

    try {
      const res = await fetch(`/api/users/${resettingUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Password for ${resettingUser.name} has been reset successfully!`);
        setResettingUser(null);
        setNewPassword("password123");
      } else {
        alert(data.error || "Failed to reset password");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setResetSubmitting(false);
    }
  };

  // Filtered users
  const departments = Array.from(new Set(users.map((u) => u.department || "Engineering")));

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === "ALL" || (u.department || "Engineering") === selectedDept;
    const matchRole = selectedRole === "ALL" || u.role === selectedRole;
    return matchSearch && matchDept && matchRole;
  });

  const totalEmployees = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const memberCount = users.filter((u) => u.role === "user").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="text-xs text-slate-500 hover:text-[#00b0ef] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Hub</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>Employee &amp; User Directory</span>
            <Badge variant="cyan" className="text-xs font-mono">
              {totalEmployees} Total
            </Badge>
          </h1>
          <p className="text-sm text-slate-500">
            Create employee accounts, assign project permissions, configure departments, and manage access.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="h-11 px-5 rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-sm shadow-sm flex items-center gap-2 shrink-0"
        >
          <UserPlus className="w-4.5 h-4.5" />
          <span>Add New Employee</span>
        </Button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
              Total Roster
            </span>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {totalEmployees}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active Members
            </span>
            <UserCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {activeCount}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#00b0ef]">
              Team Members
            </span>
            <Building2 className="w-5 h-5 text-[#00b0ef]" />
          </div>
          <div className="text-3xl font-black text-[#00b0ef] mt-2">
            {memberCount}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Administrators
            </span>
            <ShieldCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {adminCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name or email..."
            className="pl-9 h-11 text-sm rounded-xl"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-[#00b0ef]"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-[#00b0ef]"
          >
            <option value="ALL">All Roles</option>
            <option value="user">Team Members</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#00b0ef]" />
            <span className="text-sm">Loading employee roster...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No employees found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search criteria or add a new employee above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredUsers.map((u) => {
                  const isAdminUser = u.role === "admin";
                  return (
                    <tr
                      key={u._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef] flex items-center justify-center font-bold text-sm shrink-0 border border-[#00b0ef]/30">
                            {u.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                              {u.name}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{u.department || "Engineering"}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isAdminUser
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : "bg-[#e0f6fd] text-[#00b0ef] dark:bg-[#0f2e42] dark:text-[#00b0ef] border border-[#00b0ef]/20"
                          }`}
                        >
                          {isAdminUser ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Users className="w-3.5 h-3.5" />
                          )}
                          <span>{isAdminUser ? "Administrator" : "Team Member"}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          }`}
                        >
                          {u.isActive ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                          <span>{u.isActive ? "Active Account" : "Deactivated"}</span>
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Role Button */}
                          <button
                            onClick={() => handleToggleRole(u)}
                            title={`Switch to ${isAdminUser ? "Team Member" : "Administrator"}`}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            {isAdminUser ? "Make Member" : "Make Admin"}
                          </button>

                          {/* Reset Password Button */}
                          <button
                            onClick={() => setResettingUser(u)}
                            title="Reset Employee Password"
                            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-[#00b0ef]" />
                            <span>Reset Pwd</span>
                          </button>

                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                              u.isActive
                                ? "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950/70"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70"
                            }`}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create New Employee */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Onboard New Employee
                  </h2>
                  <p className="text-xs text-slate-500">
                    Provision login credentials and department permissions
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Full Name *</Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rachel Green"
                  className="h-11 text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Corporate Email *</Label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rachel.green@vknowlabs.com"
                  className="h-11 text-sm rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Department</Label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-[#00b0ef]"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Frontend">Frontend Development</option>
                    <option value="Backend">Backend &amp; API</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Quality Assurance">Quality Assurance (QA)</option>
                    <option value="DevOps &amp; Infra">DevOps &amp; Infra</option>
                    <option value="Product Management">Product Management</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">System Role</Label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-[#00b0ef]"
                  >
                    <option value="user">Team Member (My Work &amp; Reports)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold">Initial Password *</Label>
                  <button
                    type="button"
                    onClick={() => setPassword("password123")}
                    className="text-[11px] text-[#00b0ef] hover:underline font-semibold"
                  >
                    Set to default &quot;password123&quot;
                  </button>
                </div>
                <Input
                  required
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Default: password123"
                  className="h-11 text-sm rounded-xl font-mono"
                />
                <p className="text-[11px] text-slate-400">
                  Employee can sign in immediately with this corporate password.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Employee Account</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Employee Password */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Reset Password
                  </h2>
                  <p className="text-xs text-slate-500">
                    For {resettingUser.name} ({resettingUser.email})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setResettingUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">New Password</Label>
                <Input
                  required
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-11 text-sm rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResettingUser(null)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetSubmitting}
                  className="h-10 px-5 rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-xs"
                >
                  {resetSubmitting ? "Resetting..." : "Save New Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
