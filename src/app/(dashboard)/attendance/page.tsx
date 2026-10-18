"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format, parseISO, addMonths, subMonths, isToday, isWeekend } from "date-fns";
import {
  CalendarCheck2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Palmtree,
  Stethoscope,
  Award,
  Baby,
  HeartHandshake,
  HeartPulse,
  Plus,
  X,
  Check,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Building2,
  Home,
  MapPin,
  CalendarDays,
  ShieldAlert,
  Loader2,
  Search,
  Sliders,
  Edit,
  UserCheck,
  Briefcase,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypeSelect } from "@/components/ui/type-select";

// Corporate Leave Type Configurations
const CORPORATE_LEAVES = [
  {
    key: "casualLeave",
    label: "Casual Leave",
    short: "CL",
    defaultQuota: 12,
    icon: Palmtree,
    color: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    desc: "Short personal errands, family duties, or unforeseen absence",
  },
  {
    key: "sickLeave",
    label: "Sick Leave",
    short: "SL",
    defaultQuota: 12,
    icon: Stethoscope,
    color: "from-rose-500 to-pink-500",
    bgLight: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-300",
    desc: "Personal illness, seasonal health recovery, or clinical checkups",
  },
  {
    key: "earnedLeave",
    label: "Earned Leave",
    short: "EL",
    defaultQuota: 15,
    icon: Award,
    color: "from-emerald-500 to-teal-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    desc: "Planned vacation, long travel, privilege or privilege accrual",
  },
  {
    key: "maternityLeave",
    label: "Maternity Leave",
    short: "ML",
    defaultQuota: 180,
    icon: Baby,
    color: "from-purple-500 to-indigo-500",
    bgLight: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-300",
    desc: "Statutory paid maternity and infant childcare support (26 weeks)",
  },
  {
    key: "paternityLeave",
    label: "Paternity Leave",
    short: "PL",
    defaultQuota: 15,
    icon: HeartHandshake,
    color: "from-sky-500 to-blue-500",
    bgLight: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-300",
    desc: "Paid paternity support for newborn or newly adopted child",
  },
  {
    key: "medicalLeave",
    label: "Medical Leave",
    short: "MedL",
    defaultQuota: 15,
    icon: HeartPulse,
    color: "from-red-500 to-rose-600",
    bgLight: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    desc: "Extended hospital stay, surgery recovery, or major illness",
  },
];

export default function AttendancePage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const userRole = currentUser?.role || "employee";
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";

  // Active top-level subtab
  const [activeTab, setActiveTab] = useState<"self" | "team" | "policy">("self");

  // Current attendance month: "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  // Data states
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [leaveData, setLeaveData] = useState<any>(null);

  // Apply Leave Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyLeaveType, setApplyLeaveType] = useState<string>("Casual Leave");
  const [applyStartDate, setApplyStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [applyEndDate, setApplyEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [applyIsHalfDay, setApplyIsHalfDay] = useState(false);
  const [applyHalfDaySession, setApplyHalfDaySession] = useState<string>("First Half");
  const [applyReason, setApplyReason] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Manager Approval Action state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<any>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  // Admin Policy Editor state
  const [policyQuotas, setPolicyQuotas] = useState({
    casualLeave: 12,
    sickLeave: 12,
    earnedLeave: 15,
    maternityLeave: 180,
    paternityLeave: 15,
    medicalLeave: 15,
  });
  const [policyNotes, setPolicyNotes] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySuccess, setPolicySuccess] = useState<string | null>(null);

  // Admin Employee Balance Editor Modal state
  const [editingBalanceUser, setEditingBalanceUser] = useState<any>(null);
  const [editBalanceForm, setEditBalanceForm] = useState<any>({});
  const [editBalanceNote, setEditBalanceNote] = useState("");
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceSearchQuery, setBalanceSearchQuery] = useState("");

  // Load Attendance data for selected month
  const fetchAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?month=${selectedMonth}`);
      const json = await res.json();
      if (json.success) {
        setAttendanceData(json);
      }
    } catch (e) {
      console.error("Error loading attendance:", e);
    }
  };

  // Load Leave Balances & Requests
  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leaves");
      const json = await res.json();
      if (json.success) {
        setLeaveData(json);
        if (json.policy?.quotas) {
          setPolicyQuotas(json.policy.quotas);
          setPolicyNotes(json.policy.notes || "");
        }
      }
    } catch (e) {
      console.error("Error loading leaves:", e);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchAttendance(), fetchLeaves()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [selectedMonth]);

  // Navigate months
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prev = subMonths(new Date(y, m - 1, 1), 1);
    setSelectedMonth(format(prev, "yyyy-MM"));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const next = addMonths(new Date(y, m - 1, 1), 1);
    setSelectedMonth(format(next, "yyyy-MM"));
  };

  // Calculate requested duration in Apply Leave Modal
  const calculateRequestedDays = () => {
    if (applyIsHalfDay) return 0.5;
    try {
      const s = parseISO(applyStartDate);
      const e = parseISO(applyEndDate);
      const diffMs = e.getTime() - s.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  };

  // Get current balance object for chosen leave type
  const getSelectedTypeBalance = () => {
    if (!leaveData?.balance) return null;
    const config = CORPORATE_LEAVES.find((c) => c.label === applyLeaveType);
    if (!config) return null;
    const typeBal = leaveData.balance[config.key];
    if (!typeBal) return null;
    const allocated = typeBal.allocated ?? config.defaultQuota;
    const used = typeBal.used ?? 0;
    const pending = typeBal.pending ?? 0;
    const available = Math.max(0, allocated - used - pending);
    return { allocated, used, pending, available, config };
  };

  // Submit Apply Leave
  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplySubmitting(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      const res = await fetch("/api/leaves/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType: applyLeaveType,
          startDate: applyStartDate,
          endDate: applyEndDate,
          isHalfDay: applyIsHalfDay,
          halfDaySession: applyIsHalfDay ? applyHalfDaySession : null,
          reason: applyReason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit leave application.");
      }

      setApplySuccess(json.message);
      setApplyReason("");
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setApplySuccess(null);
        loadAll();
      }, 1200);
    } catch (err: any) {
      setApplyError(err.message);
    } finally {
      setApplySubmitting(false);
    }
  };

  // Manager Approve or Reject
  const handleLeaveAction = async (requestId: string, action: "approve" | "reject", remarks = "") => {
    setActionLoadingId(requestId);
    try {
      const res = await fetch("/api/leaves/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action, remarks }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Action failed.");
      } else {
        setRejectModalItem(null);
        setRejectRemarks("");
        await loadAll();
      }
    } catch (e: any) {
      alert(e.message || "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Admin Save Corporate Policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    setPolicySuccess(null);
    try {
      const res = await fetch("/api/leaves/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotas: policyQuotas,
          notes: policyNotes,
          applyToExisting: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save policy.");
      setPolicySuccess("Corporate standard leave quotas saved and applied successfully!");
      setTimeout(() => setPolicySuccess(null), 3000);
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingPolicy(false);
    }
  };

  // Admin Save Employee Balance Adjustment
  const handleSaveEmployeeBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBalanceUser) return;
    setSavingBalance(true);
    try {
      const res = await fetch("/api/leaves/adjust-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingBalanceUser.userId,
          balances: editBalanceForm,
          adjustmentNote: editBalanceNote,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to update balance.");
      setEditingBalanceUser(null);
      await loadAll();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingBalance(false);
    }
  };

  const pendingApprovalsCount = leaveData?.pendingApprovals?.length || 0;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#00b0ef]/10 text-[#009ad4] dark:text-[#00b0ef]">
              Corporate HR &amp; Lifecycle
            </span>
            <Badge variant="outline" className="text-[11px] font-bold">
              Year {new Date().getFullYear()} Register
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarCheck2 className="w-8 h-8 text-[#00b0ef]" />
            <span>Attendance &amp; Leave Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Track daily attendance, view real-time leave balances (taken vs left), and manage corporate standard leave approvals.
          </p>
        </div>

        {/* Action Button: Apply Leave */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            onClick={() => setIsApplyModalOpen(true)}
            className="h-11 px-5 rounded-2xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-xs shadow-md shadow-[#00b0ef]/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Apply for Leave</span>
          </Button>
        </div>
      </div>

      {/* Navigation Subtabs (All / Team / Policy) */}
      {(isManager || isAdmin) && (
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 w-fit">
          <button
            onClick={() => setActiveTab("self")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "self"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            My Attendance &amp; Leaves
          </button>

          <button
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "team"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>Team Leave Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab("policy")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "policy"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-[#00b0ef]" />
              <span>Corporate Quota Settings</span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: EMPLOYEE SELF ATTENDANCE & LEAVE BALANCES               */}
      {/* ============================================================== */}
      {activeTab === "self" && (
        <div className="space-y-6">
          {/* SECTION 1: CORPORATE STANDARD LEAVE BALANCES (Taken / Left) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#00b0ef]" />
                  <span>Corporate Standard Leave Balances</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Allocated quota vs days taken and remaining available for Year {new Date().getFullYear()}
                </p>
              </div>

              <span className="text-[11px] font-bold text-slate-400">
                Standard Entitlement Cycle
              </span>
            </div>

            {/* 6 Corporate Standard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {CORPORATE_LEAVES.map((type) => {
                const typeBal = leaveData?.balance ? leaveData.balance[type.key] : null;
                const allocated = typeBal?.allocated ?? type.defaultQuota;
                const used = typeBal?.used ?? 0;
                const pending = typeBal?.pending ?? 0;
                const left = Math.max(0, allocated - used - pending);
                const percentUsed = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
                const TypeIcon = type.icon;

                return (
                  <div
                    key={type.key}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Icon + Short Badge + Title */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl ${type.bgLight} ${type.text} flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                {type.label}
                              </h4>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {type.short}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1">{type.desc}</p>
                          </div>
                        </div>
                      </div>

                      {/* Main Count Display: Left vs Allocated */}
                      <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center mb-3">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Allocated</div>
                          <div className="text-base font-black text-slate-800 dark:text-slate-100">
                            {allocated}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-amber-500">Taken</div>
                          <div className="text-base font-black text-amber-600 dark:text-amber-400">
                            {used}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                            Available Left
                          </div>
                          <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            {left}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar & Pending indicator */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                          <span>Usage: {percentUsed}%</span>
                          {pending > 0 && (
                            <span className="text-amber-500 font-bold">
                              {pending} day(s) pending approval
                            </span>
                          )}
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${type.color} rounded-full transition-all duration-500`}
                            style={{ width: `${percentUsed}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Apply Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setApplyLeaveType(type.label);
                        setIsApplyModalOpen(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-[#00b0ef] dark:bg-slate-800 dark:hover:bg-[#00b0ef] text-slate-700 hover:text-white dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Apply {type.short}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: MONTHLY ATTENDANCE REGISTER & STATS */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            {/* Header with Month Selector & Summary Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#00b0ef]" />
                  <span>Monthly Attendance Register</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comprehensive daily presence, logged hours, work mode, and leave tracking
                </p>
              </div>

              {/* Month Selector Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[130px] text-center">
                  {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Attendance Metrics Counters */}
            {attendanceData?.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                    Present Days
                  </div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                    {attendanceData.stats.presentDays}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/60 text-center">
                  <div className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">
                    In Office
                  </div>
                  <div className="text-xl font-black text-sky-700 dark:text-sky-300">
                    {attendanceData.stats.officeDays}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 text-center">
                  <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                    Work From Home
                  </div>
                  <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                    {attendanceData.stats.wfhDays}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                    Leaves Taken
                  </div>
                  <div className="text-xl font-black text-amber-700 dark:text-amber-300">
                    {attendanceData.stats.leaveDays}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-800/60 text-center">
                  <div className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400">
                    Total Hours
                  </div>
                  <div className="text-xl font-black text-cyan-700 dark:text-cyan-300">
                    {attendanceData.stats.totalHoursLogged}h
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Compliance Rate
                  </div>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                    {attendanceData.stats.complianceRate}%
                  </div>
                </div>
              </div>
            )}

            {/* Daily Calendar Register Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
              {attendanceData?.dailyRegister?.map((day: any) => {
                const isDayToday = isToday(parseISO(day.dateString));
                const isWknd = day.isWeekend;

                let badgeBg = "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800";
                let statusLabel = "Unlogged";
                let statusTextColor = "text-slate-400";

                if (day.attendanceStatus === "present") {
                  badgeBg = "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50";
                  statusLabel = day.workLocation === "Work From Home" ? "WFH" : "In Office";
                  statusTextColor = "text-emerald-600 dark:text-emerald-400";
                } else if (day.attendanceStatus === "on_leave") {
                  badgeBg = "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50";
                  statusLabel = day.leaveType ? day.leaveType.split(" ")[0] : "Leave";
                  statusTextColor = "text-amber-600 dark:text-amber-400";
                } else if (day.attendanceStatus === "holiday") {
                  badgeBg = "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/50";
                  statusLabel = "Holiday";
                  statusTextColor = "text-purple-600 dark:text-purple-400";
                } else if (isWknd) {
                  badgeBg = "bg-slate-50/50 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800";
                  statusLabel = "Weekend";
                  statusTextColor = "text-slate-400";
                }

                return (
                  <div
                    key={day.dateString}
                    className={`p-2.5 rounded-2xl border transition-all ${badgeBg} ${
                      isDayToday ? "ring-2 ring-[#00b0ef] shadow-xs" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-800 dark:text-slate-200">
                        {day.dayNumber} {day.dayName}
                      </span>
                      {isDayToday && (
                        <span className="w-2 h-2 rounded-full bg-[#00b0ef]" title="Today" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className={`text-[11px] font-extrabold truncate ${statusTextColor}`}>
                        {statusLabel}
                      </div>

                      {day.hours > 0 ? (
                        <div className="text-[10px] font-mono font-bold text-slate-500">
                          {day.hours}h logged
                        </div>
                      ) : day.attendanceStatus === "on_leave" && day.leaveReason ? (
                        <div className="text-[9px] text-amber-600/80 truncate italic" title={day.leaveReason}>
                          {day.leaveReason}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">-</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: MY LEAVE APPLICATIONS HISTORY */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#00b0ef]" />
                  <span>My Leave Applications History</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Record of submitted, approved, and pending corporate leaves
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsApplyModalOpen(true)}
                className="text-xs font-bold rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-[#00b0ef]" />
                New Application
              </Button>
            </div>

            {leaveData?.myRequests?.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                No leave requests filed yet for this period. Click &quot;Apply for Leave&quot; above to submit an application.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Leave Type</th>
                      <th className="py-2.5 px-3">Dates</th>
                      <th className="py-2.5 px-3">Days</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Reviewed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {leaveData?.myRequests?.map((req: any) => (
                      <tr key={req._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                          {req.leaveType}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {req.startDate} → {req.endDate}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-200">
                          {req.totalDays} {req.isHalfDay ? `(Half Day - ${req.halfDaySession})` : "Day(s)"}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </td>
                        <td className="py-3 px-3">
                          {req.status === "approved" ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Approved
                            </span>
                          ) : req.status === "rejected" ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center gap-1 w-fit">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Approval
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {req.reviewedByName ? (
                            <span>
                              {req.reviewedByName}{" "}
                              {req.reviewRemarks && (
                                <span className="text-[10px] text-slate-400 block italic truncate max-w-[140px]">
                                  &quot;{req.reviewRemarks}&quot;
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Awaiting Manager</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MANAGER / ADMIN TEAM APPROVALS QUEUE                    */}
      {/* ============================================================== */}
      {activeTab === "team" && (isManager || isAdmin) && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#00b0ef]" />
                  <span>Team Leave Applications Queue</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Review and approve employee leave requests. Approved leaves auto-synchronize to the daily attendance register.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00b0ef]/10 text-[#009ad4] dark:text-[#00b0ef]">
                {leaveData?.pendingApprovals?.length || 0} Pending Request(s)
              </span>
            </div>

            {leaveData?.pendingApprovals?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All pending team leave applications have been reviewed! No items in the queue.
              </div>
            ) : (
              <div className="space-y-3">
                {leaveData?.pendingApprovals?.map((req: any) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {req.userName}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {req.department}
                        </Badge>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00b0ef]/10 text-[#00b0ef]">
                          {req.leaveType}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <span>
                          <strong>Dates:</strong> {req.startDate} to {req.endDate}
                        </span>
                        <span>&bull;</span>
                        <span>
                          <strong>Duration:</strong> {req.totalDays} day(s){" "}
                          {req.isHalfDay && `(${req.halfDaySession})`}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        &quot;{req.reason}&quot;
                      </div>
                    </div>

                    {/* Action Buttons: Approve / Reject */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={actionLoadingId === req._id}
                        onClick={() => handleLeaveAction(req._id, "approve")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                      >
                        {actionLoadingId === req._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                        )}
                        <span>Approve Leave</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoadingId === req._id}
                        onClick={() => {
                          setRejectModalItem(req);
                          setRejectRemarks("");
                        }}
                        className="border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        <span>Reject</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ADMIN CORPORATE POLICY & EMPLOYEE ROSTER BALANCES       */}
      {/* ============================================================== */}
      {activeTab === "policy" && isAdmin && (
        <div className="space-y-6">
          {/* SECTION 1: CORPORATE QUOTAS SETTINGS (EDITABLE BY ADMIN) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#00b0ef]" />
                <span>Enterprise Leave Quotas (Editable by Admin)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure organization-wide default annual leave allocations for standard corporate categories.
              </p>
            </div>

            {policySuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{policySuccess}</span>
              </div>
            )}

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {CORPORATE_LEAVES.map((type) => (
                  <div
                    key={type.key}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                  >
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>{type.label} ({type.short})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Days / Year</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={(policyQuotas as any)[type.key] ?? type.defaultQuota}
                      onChange={(e) =>
                        setPolicyQuotas({
                          ...policyQuotas,
                          [type.key]: Number(e.target.value),
                        })
                      }
                      className="w-full h-10 px-3 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 line-clamp-1">{type.desc}</p>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Policy Notes / Circular Reference
                </label>
                <input
                  type="text"
                  value={policyNotes}
                  onChange={(e) => setPolicyNotes(e.target.value)}
                  placeholder="e.g. Approved under Enterprise HR Policy 2026-27"
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={savingPolicy}
                  className="bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-xs rounded-2xl px-6 h-11 cursor-pointer"
                >
                  {savingPolicy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving Policy...
                    </>
                  ) : (
                    <span>Save &amp; Apply Corporate Policy</span>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* SECTION 2: EMPLOYEE LEAVE BALANCE DIRECTORY (EDITABLE BY ADMIN) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00b0ef]" />
                  <span>Employee Leave Roster &amp; Balance Directory</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect or adjust individual employee leave balances and custom allotments.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={balanceSearchQuery}
                  onChange={(e) => setBalanceSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">CL (Taken/Left)</th>
                    <th className="py-2.5 px-3">SL (Taken/Left)</th>
                    <th className="py-2.5 px-3">EL (Taken/Left)</th>
                    <th className="py-2.5 px-3">MedL (Taken/Left)</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leaveData?.allEmployeeBalances
                    ?.filter((b: any) =>
                      b.userName.toLowerCase().includes(balanceSearchQuery.toLowerCase()) ||
                      b.userEmail.toLowerCase().includes(balanceSearchQuery.toLowerCase())
                    )
                    ?.map((bal: any) => {
                      const clLeft = Math.max(0, (bal.casualLeave?.allocated || 12) - (bal.casualLeave?.used || 0));
                      const slLeft = Math.max(0, (bal.sickLeave?.allocated || 12) - (bal.sickLeave?.used || 0));
                      const elLeft = Math.max(0, (bal.earnedLeave?.allocated || 15) - (bal.earnedLeave?.used || 0));
                      const mlLeft = Math.max(0, (bal.medicalLeave?.allocated || 15) - (bal.medicalLeave?.used || 0));

                      return (
                        <tr key={bal._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {bal.userName}
                            </div>
                            <div className="text-[10px] text-slate-400">{bal.userEmail}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                            {bal.department}
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            <span className="text-amber-500 font-bold">{bal.casualLeave?.used || 0}</span> /{" "}
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{clLeft}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            <span className="text-amber-500 font-bold">{bal.sickLeave?.used || 0}</span> /{" "}
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{slLeft}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            <span className="text-amber-500 font-bold">{bal.earnedLeave?.used || 0}</span> /{" "}
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{elLeft}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            <span className="text-amber-500 font-bold">{bal.medicalLeave?.used || 0}</span> /{" "}
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{mlLeft}</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBalanceUser(bal);
                                setEditBalanceForm({
                                  casualLeave: { ...bal.casualLeave },
                                  sickLeave: { ...bal.sickLeave },
                                  earnedLeave: { ...bal.earnedLeave },
                                  maternityLeave: { ...bal.maternityLeave },
                                  paternityLeave: { ...bal.paternityLeave },
                                  medicalLeave: { ...bal.medicalLeave },
                                });
                                setEditBalanceNote(bal.adjustmentNote || "");
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#00b0ef] hover:bg-[#00b0ef]/10 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit Balance</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: APPLY FOR LEAVE                                       */}
      {/* ============================================================== */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="w-5 h-5 text-[#00b0ef]" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Apply for Leave
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {applyError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            {applySuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{applySuccess}</span>
              </div>
            )}

            <form onSubmit={handleApplyLeaveSubmit} className="space-y-4">
              {/* TypeSelect for Leave Type */}
              <TypeSelect
                label="Leave Category"
                required
                value={applyLeaveType}
                onChange={(val) => setApplyLeaveType(val)}
                options={CORPORATE_LEAVES.map((type) => {
                  const typeBal = leaveData?.balance ? leaveData.balance[type.key] : null;
                  const left = typeBal ? Math.max(0, (typeBal.allocated || type.defaultQuota) - (typeBal.used || 0) - (typeBal.pending || 0)) : type.defaultQuota;
                  return {
                    value: type.label,
                    label: `${type.label} (${type.short})`,
                    badge: `${left} left`,
                    sublabel: type.desc,
                    icon: type.icon,
                  };
                })}
              />

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={applyStartDate}
                    onChange={(e) => {
                      setApplyStartDate(e.target.value);
                      if (e.target.value > applyEndDate) {
                        setApplyEndDate(e.target.value);
                      }
                    }}
                    className="w-full h-11 px-3 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={applyEndDate}
                    min={applyStartDate}
                    onChange={(e) => setApplyEndDate(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Half Day Option */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Half Day Leave
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Select if applying for 0.5 day only
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="halfDayCheck"
                    checked={applyIsHalfDay}
                    onChange={(e) => setApplyIsHalfDay(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00b0ef] focus:ring-[#00b0ef] cursor-pointer"
                  />
                  {applyIsHalfDay && (
                    <select
                      value={applyHalfDaySession}
                      onChange={(e) => setApplyHalfDaySession(e.target.value)}
                      className="h-8 px-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="First Half">First Half (Morning)</option>
                      <option value="Second Half">Second Half (Afternoon)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Real-time Calculation & Quota Preview Banner */}
              {(() => {
                const bal = getSelectedTypeBalance();
                const reqDays = calculateRequestedDays();
                const remainingAfter = bal ? bal.available - reqDays : 0;
                const isInsufficient = bal && remainingAfter < 0;

                return (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs ${
                      isInsufficient
                        ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                        : "bg-[#00b0ef]/10 border-[#00b0ef]/30 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span>Requested Duration:</span>
                      <span className="font-black text-sm">{reqDays} Day(s)</span>
                    </div>
                    {bal && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Available Balance: {bal.available} days</span>
                        <span className={isInsufficient ? "font-bold text-rose-600" : "font-bold text-emerald-600 dark:text-emerald-400"}>
                          {isInsufficient ? "Quota Exceeded" : `Remaining After: ${remainingAfter} day(s)`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Reason Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Reason for Absence *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Attending doctor appointment, family event, or personal leave."
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  className="w-full p-3 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="rounded-2xl text-xs font-bold"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={applySubmitting}
                  className="rounded-2xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-xs px-6 cursor-pointer"
                >
                  {applySubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Submitting...
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: MANAGER REJECTION REMARKS                             */}
      {/* ============================================================== */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Reject Leave Application</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Provide feedback or reason for rejecting <strong>{rejectModalItem.userName}&apos;s</strong>{" "}
              {rejectModalItem.leaveType} application ({rejectModalItem.totalDays} day(s)).
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Rejection Remarks / Operational Reason *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Critical release scheduled during this period; please reschedule."
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                className="w-full p-3 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalItem(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={() => handleLeaveAction(rejectModalItem._id, "reject", rejectRemarks)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ADMIN ADJUST EMPLOYEE LEAVE BALANCE                   */}
      {/* ============================================================== */}
      {editingBalanceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#00b0ef]" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Adjust Leave Balance: {editingBalanceUser.userName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBalanceUser(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Override allocated quotas or recorded taken days for this employee.
            </p>

            <form onSubmit={handleSaveEmployeeBalance} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CORPORATE_LEAVES.map((type) => {
                  const typeData = editBalanceForm[type.key] || { allocated: type.defaultQuota, used: 0 };
                  return (
                    <div
                      key={type.key}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {type.label} ({type.short})
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Allocated</label>
                          <input
                            type="number"
                            min="0"
                            value={typeData.allocated}
                            onChange={(e) =>
                              setEditBalanceForm({
                                ...editBalanceForm,
                                [type.key]: {
                                  ...typeData,
                                  allocated: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full h-8 px-2.5 font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">Taken / Used</label>
                          <input
                            type="number"
                            min="0"
                            value={typeData.used}
                            onChange={(e) =>
                              setEditBalanceForm({
                                ...editBalanceForm,
                                [type.key]: {
                                  ...typeData,
                                  used: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full h-8 px-2.5 font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Adjustment Reason / Note *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Granted 3 additional Earned Leave days for project milestone overtime."
                  value={editBalanceNote}
                  onChange={(e) => setEditBalanceNote(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingBalanceUser(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={savingBalance}
                  className="rounded-xl bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold text-xs px-5 cursor-pointer"
                >
                  {savingBalance ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    <span>Save Adjustments</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
