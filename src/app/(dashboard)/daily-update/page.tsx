"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format, subDays, addDays, parseISO, isToday, isYesterday } from "date-fns";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Palmtree,
  Plus,
  Trash2,
  HelpCircle,
  MessageSquare,
  MessageSquareQuote,
  Check,
  Send,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Briefcase,
  Layers,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Info,
  Building2,
  Home,
  MapPin,
  CalendarDays,
  Download,
  FileSpreadsheet,
  BarChart3,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Auto format smart time entry (e.g. "1000" -> "10:00 AM", "2330" -> "11:30 PM")
function formatSmartTime(input: string): string {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.includes("AM") || trimmed.includes("PM")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 3 || digits.length === 4) {
    let hours = parseInt(digits.slice(0, digits.length - 2), 10);
    const minutes = digits.slice(-2);
    if (hours < 0 || hours > 23 || parseInt(minutes, 10) > 59) return trimmed;

    const period = hours >= 12 ? "PM" : "AM";
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;

    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${formattedHours}:${minutes} ${period}`;
  }
  return trimmed;
}

// Compute hours difference between two formatted time strings
function calculateHoursDiff(from: string, to: string): number {
  if (!from || !to) return 0;
  const parseTime = (str: string) => {
    const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const p = match[3]?.toUpperCase();
    if (p === "PM" && h < 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const start = parseTime(from);
  const end = parseTime(to);
  if (start === null || end === null || end <= start) return 0;
  return parseFloat(((end - start) / 60).toFixed(1));
}

export default function DailyUpdatePage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;

  // Selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Employee Form State
  const [entryMode, setEntryMode] = useState<"tasks" | "leave">("tasks");
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [leaveType, setLeaveType] = useState<string>("Casual Leave");
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [workLocation, setWorkLocation] = useState<"In Office" | "Work From Home" | "Client Site">("In Office");
  const [dayType, setDayType] = useState<"Work Day" | "Non Work Day" | "Festival Day">("Work Day");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Manager & Admin View Tabs & Period Filter
  const [activeTab, setActiveTab] = useState<"tracker" | "attendance">("tracker");
  const [attendancePeriod, setAttendancePeriod] = useState<"day" | "week" | "month">("week");
  const [attendanceSearch, setAttendanceSearch] = useState<string>("");

  // New Task Inline Entry Inputs
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskDescription, setTaskDescription] = useState<string>("");
  const [startTimeInput, setStartTimeInput] = useState<string>("10:00 AM");
  const [endTimeInput, setEndTimeInput] = useState<string>("12:00 PM");
  const [taskStatus, setTaskStatus] = useState<string>("Completed");

  // Manager Doubt Modal State
  const [doubtModalOpen, setDoubtModalOpen] = useState(false);
  const [activeDoubtTarget, setActiveDoubtTarget] = useState<{
    updateId: string;
    taskItemId: string;
    taskTitle: string;
    employeeName: string;
  } | null>(null);
  const [doubtQuestion, setDoubtQuestion] = useState("");
  const [doubtSubmitting, setDoubtSubmitting] = useState(false);

  // Employee Reply State
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState(false);

  const fetchDailyData = (dateStr: string, periodStr: string = attendancePeriod) => {
    setLoading(true);
    fetch(`/api/daily-updates?date=${dateStr}&period=${periodStr}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
          if (res.data.role === "employee") {
            const update = res.data.update;
            if (update) {
              setWorkLocation(update.workLocation || "In Office");
              setDayType(update.dayType || "Work Day");
              if (update.status === "on_leave") {
                setEntryMode("leave");
                setLeaveType(update.leaveType || "Casual Leave");
                setLeaveReason(update.leaveReason || "");
                setTasksList([]);
              } else {
                setEntryMode("tasks");
                setTasksList(update.tasks || []);
                setGeneralNotes(update.generalNotes || "");
              }
            } else {
              setEntryMode("tasks");
              setWorkLocation("In Office");
              setDayType("Work Day");
              setTasksList([]);
              setGeneralNotes("");
              setLeaveReason("");
            }

            // Set default project and stage if available
            if (res.data.projects?.length > 0 && !selectedProjectId) {
              setSelectedProjectId(res.data.projects[0]._id);
            }
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDailyData(selectedDate, attendancePeriod);
  }, [selectedDate, attendancePeriod]);

  // Quick Export Attendance Excel
  const handleExportAttendanceExcel = () => {
    window.open(`/api/daily-updates?date=${selectedDate}&period=${attendancePeriod}&export=excel`, "_blank");
  };

  // When selected project changes, update default stage
  useEffect(() => {
    if (data?.stages && selectedProjectId) {
      const pStages = data.stages.filter((s: any) => s.projectId === selectedProjectId);
      if (pStages.length > 0) {
        setSelectedStageId(pStages[0]._id);
      }
    }
  }, [selectedProjectId, data]);

  // Quick Date Navigation
  const handleShiftDate = (delta: number) => {
    const cur = new Date(selectedDate);
    const next = delta > 0 ? addDays(cur, delta) : subDays(cur, Math.abs(delta));
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  const handleSetQuickDate = (type: "today" | "yesterday") => {
    if (type === "today") setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    if (type === "yesterday") setSelectedDate(format(subDays(new Date(), 1), "yyyy-MM-dd"));
  };

  // Add a task into the day's local list
  const handleAddTask = () => {
    if (!taskTitle.trim()) {
      alert("Please enter a deliverable task title");
      return;
    }
    if (!selectedProjectId) {
      alert("Please select a project");
      return;
    }

    const currentProject = data.projects?.find((p: any) => p._id === selectedProjectId);
    const currentStage = data.stages?.find((s: any) => s._id === selectedStageId);

    const calculatedHours = calculateHoursDiff(startTimeInput, endTimeInput) || 2;

    const newTaskItem = {
      projectId: selectedProjectId,
      projectName: currentProject?.name || "SphereX Project",
      stageId: selectedStageId || null,
      stageName: currentStage?.name || "Current Stage",
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      startTime: startTimeInput,
      endTime: endTimeInput,
      hours: calculatedHours,
      taskStatus,
      doubts: [],
    };

    setTasksList([newTaskItem, ...tasksList]);
    setTaskTitle("");
    setTaskDescription("");
  };

  const handleRemoveTask = (idx: number) => {
    setTasksList(tasksList.filter((_, i) => i !== idx));
  };

  // Submit Day's Update (Employee)
  const handleSubmitDailyUpdate = async () => {
    if (entryMode === "tasks" && tasksList.length === 0) {
      alert("Please add at least one task or switch to 'On Leave' if you did not work today.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        dateString: selectedDate,
        status: entryMode === "leave" ? "on_leave" : "submitted",
        leaveType: entryMode === "leave" ? leaveType : null,
        leaveReason: entryMode === "leave" ? leaveReason : "",
        workLocation,
        dayType,
        tasks: entryMode === "tasks" ? tasksList : [],
        generalNotes: entryMode === "tasks" ? generalNotes : "",
      };

      const res = await fetch("/api/daily-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        setFeedback({
          type: "success",
          message:
            entryMode === "leave"
              ? `Leave recorded for ${selectedDate}`
              : `Daily work update successfully saved for ${selectedDate} (${result.data?.totalHours || 0} hrs)`,
        });
        fetchDailyData(selectedDate);
      } else {
        setFeedback({ type: "error", message: result.error || "Failed to save daily update" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "An error occurred" });
    } finally {
      setSubmitting(false);
    }
  };

  // Manager: Open Doubt Modal
  const handleOpenDoubtModal = (updateId: string, taskItemId: string, taskTitle: string, employeeName: string) => {
    setActiveDoubtTarget({ updateId, taskItemId, taskTitle, employeeName });
    setDoubtQuestion("");
    setDoubtModalOpen(true);
  };

  const handleConfirmRaiseDoubt = async () => {
    if (!activeDoubtTarget || !doubtQuestion.trim()) return;
    setDoubtSubmitting(true);

    try {
      const res = await fetch("/api/daily-updates/doubt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateId: activeDoubtTarget.updateId,
          taskItemId: activeDoubtTarget.taskItemId,
          question: doubtQuestion.trim(),
        }),
      });
      const result = await res.json();
      if (result.success) {
        setDoubtModalOpen(false);
        fetchDailyData(selectedDate);
      } else {
        alert(result.error || "Failed to raise doubt");
      }
    } catch (err: any) {
      alert(err.message || "Failed to raise doubt");
    } finally {
      setDoubtSubmitting(false);
    }
  };

  // Employee: Reply to Doubt
  const handleReplyToDoubt = async (updateId: string, taskItemId: string, doubtId: string, resolve: boolean = true) => {
    const replyText = replyTextMap[doubtId];
    if (!replyText?.trim() && !resolve) {
      alert("Please enter a reply before submitting.");
      return;
    }
    setReplySubmitting(true);

    try {
      const res = await fetch("/api/daily-updates/doubt/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateId,
          taskItemId,
          doubtId,
          reply: replyText || "Clarified & resolved",
          resolve,
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetchDailyData(selectedDate);
      } else {
        alert(result.error || "Failed to submit reply");
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit reply");
    } finally {
      setReplySubmitting(false);
    }
  };

  const isRoleEmployee = data?.role === "employee";
  const isRoleManager = data?.role === "manager";
  const isRoleAdmin = data?.role === "admin";

  const totalLoggedToday = tasksList.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================= */}
      {/* TOP HEADER & DATE NAVIGATOR (COMMON ACROSS ALL ROLES)      */}
      {/* ========================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="cyan" className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5">
              {isRoleEmployee ? "Employee Daily Work Portal" : isRoleManager ? "Team Daily Tracker" : "Company Daily Log Audit"}
            </Badge>
            <span className="text-xs text-slate-400">
              {isRoleEmployee ? "End-of-day task & time sync" : "Live reporting team review"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>{isRoleEmployee ? "My Daily Work Update" : "Daily Work Updates"}</span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              ({format(parseISO(selectedDate), "EEEE, dd MMMM yyyy")})
            </span>
          </h1>
        </div>

        {/* Date Selector Navigation Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-600 dark:text-slate-300"
              title="Previous Date"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSetQuickDate("yesterday")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                isYesterday(parseISO(selectedDate))
                  ? "bg-[#00b0ef] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Yesterday
            </button>

            <button
              onClick={() => handleSetQuickDate("today")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                isToday(parseISO(selectedDate))
                  ? "bg-[#00b0ef] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Today
            </button>

            <button
              onClick={() => handleShiftDate(1)}
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all text-slate-600 dark:text-slate-300"
              title="Next Date"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Date Picker Input */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 px-3 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-2 focus:ring-[#00b0ef] outline-hidden cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#00b0ef]" />
          <span className="text-sm font-medium">Fetching daily records for {selectedDate}...</span>
        </div>
      ) : isRoleEmployee ? (
        /* ========================================================= */
        /* CASE 1: EMPLOYEE VIEW (FIRST PAGE FOR EMPLOYEE)           */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Status Alert Banner */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold ${
                feedback.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-xs underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Current Status Pill Bar */}
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status for {selectedDate}:</span>
              {data?.update?.status === "submitted" ? (
                <>
                  <Badge variant="cyan" className="font-extrabold text-xs px-3 py-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submitted • {data.update.totalHours} Hours Logged</span>
                  </Badge>
                  <Badge variant="outline" className="font-bold text-xs px-2.5 py-1 border-sky-300 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                    {data.update.workLocation === "Work From Home" ? <Home className="w-3 h-3 text-sky-500" /> : <Building2 className="w-3 h-3 text-sky-500" />}
                    <span>{data.update.workLocation || "In Office"}</span>
                  </Badge>
                  <Badge variant="outline" className="font-bold text-xs px-2.5 py-1 border-purple-300 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-purple-500" />
                    <span>{data.update.dayType || "Work Day"}</span>
                  </Badge>
                </>
              ) : data?.update?.status === "on_leave" ? (
                <Badge className="font-extrabold text-xs px-3 py-1 bg-purple-500 text-white flex items-center gap-1.5">
                  <Palmtree className="w-3.5 h-3.5" />
                  <span>On Leave: {data.update.leaveType}</span>
                </Badge>
              ) : (
                <Badge variant="secondary" className="font-extrabold text-xs px-3 py-1 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Daily Update</span>
                </Badge>
              )}
            </div>

            {/* Switch between Log Work & On Leave mode */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEntryMode("tasks")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  entryMode === "tasks" ? "bg-[#00b0ef] text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Log Tasks &amp; Hours</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("leave")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  entryMode === "leave" ? "bg-amber-500 text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <Palmtree className="w-3.5 h-3.5" />
                <span>I Was On Leave</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB MODE 1: LOG TASKS & WORK HOURS                        */}
          {/* ========================================================= */}
          {entryMode === "tasks" ? (
            <div className="space-y-6">
              {/* Single-Row Quick Deliverable Entry Bar */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00b0ef]" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Track Your Daily Work (Auto-syncs with Project Stages)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Smart time auto-formats (e.g. 1000 &rarr; 10:00 AM)
                  </span>
                </div>

                {/* Row 0: Work Location & Day Type Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#00b0ef]" />
                      <span>Work Location (Attendance Mode) *</span>
                    </label>
                    <select
                      value={workLocation}
                      onChange={(e) => setWorkLocation(e.target.value as any)}
                      className="w-full h-11 px-3.5 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#00b0ef] outline-hidden cursor-pointer"
                    >
                      <option value="In Office">🏢 In Office (Physical Workplace)</option>
                      <option value="Work From Home">🏠 Work From Home (WFH Remote)</option>
                      <option value="Client Site">📍 Client Site (On-site Visit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-[#00b0ef]" />
                      <span>Day Type *</span>
                    </label>
                    <select
                      value={dayType}
                      onChange={(e) => setDayType(e.target.value as any)}
                      className="w-full h-11 px-3.5 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#00b0ef] outline-hidden cursor-pointer"
                    >
                      <option value="Work Day">💼 Work Day (Standard Operating Day)</option>
                      <option value="Non Work Day">🏖️ Non Work Day (Weekend / Weekly Off)</option>
                      <option value="Festival Day">🎉 Festival Day (Public / Gazetted Holiday)</option>
                    </select>
                  </div>
                </div>

                {/* Row 1: Project & Stage Dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full h-11 px-3 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#00b0ef] outline-hidden cursor-pointer"
                    >
                      {data?.projects?.map((p: any) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.code || p.key || "PRJ"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Project Stage / Module
                    </label>
                    <select
                      value={selectedStageId}
                      onChange={(e) => setSelectedStageId(e.target.value)}
                      className="w-full h-11 px-3 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#00b0ef] outline-hidden cursor-pointer"
                    >
                      {data?.stages
                        ?.filter((s: any) => s.projectId === selectedProjectId)
                        .map((s: any) => (
                          <option key={s._id} value={s._id}>
                            #{s.order} {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Deliverable Title & Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Deliverable / Task Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Implement agentic tool calling schema & tests"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full h-11 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#00b0ef] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Work Description &amp; Details (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Added unit test suite and verified JSON schema validation"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#00b0ef] outline-hidden"
                    />
                  </div>
                </div>

                {/* Row 3: From Time, To Time, Status, and + Add Task button */}
                <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
                  <div className="w-full sm:w-36">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      From Time
                    </label>
                    <input
                      type="text"
                      placeholder="10:00 AM"
                      value={startTimeInput}
                      onChange={(e) => setStartTimeInput(e.target.value)}
                      onBlur={() => setStartTimeInput(formatSmartTime(startTimeInput))}
                      className="w-full h-11 px-3 text-xs sm:text-sm font-semibold text-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#00b0ef] outline-hidden"
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      To Time
                    </label>
                    <input
                      type="text"
                      placeholder="12:00 PM"
                      value={endTimeInput}
                      onChange={(e) => setEndTimeInput(e.target.value)}
                      onBlur={() => setEndTimeInput(formatSmartTime(endTimeInput))}
                      className="w-full h-11 px-3 text-xs sm:text-sm font-semibold text-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#00b0ef] outline-hidden"
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Status
                    </label>
                    <select
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value)}
                      className="w-full h-11 px-3 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#00b0ef] outline-hidden cursor-pointer"
                    >
                      <option value="Completed">Completed</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Blocked">Blocked</option>
                      <option value="To Do">To Do</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-auto ml-auto">
                    <Button
                      type="button"
                      onClick={handleAddTask}
                      className="w-full sm:w-auto h-11 px-6 bg-[#00b0ef] hover:bg-[#009ad4] text-white font-bold rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Day&apos;s Log</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Added Tasks Table for Selected Date */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Tasks &amp; Deliverables Logged for {format(parseISO(selectedDate), "dd MMM yyyy")}
                    </h3>
                    <Badge variant="cyan" className="font-extrabold text-xs">
                      {tasksList.length} Items • {totalLoggedToday}h Total
                    </Badge>
                  </div>
                </div>

                {tasksList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold">No tasks logged yet for this date.</p>
                    <p className="text-xs text-slate-400">
                      Use the quick entry form above to log deliverables, or switch to &quot;I Was On Leave&quot; tab.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasksList.map((task, idx) => (
                      <div
                        key={task._id || idx}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <Badge variant="outline" className="font-bold text-[10px] text-[#00b0ef] border-[#00b0ef]/40">
                              {task.projectName}
                            </Badge>
                            {task.stageName && (
                              <Badge variant="secondary" className="font-bold text-[10px]">
                                {task.stageName}
                              </Badge>
                            )}
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#00b0ef]" />
                              <span>{task.startTime} – {task.endTime} ({task.hours}h)</span>
                            </span>

                            <Badge
                              variant={
                                task.taskStatus === "Completed"
                                  ? "green"
                                  : task.taskStatus === "Blocked"
                                  ? "red"
                                  : "default"
                              }
                              className="text-[11px] font-bold"
                            >
                              {task.taskStatus}
                            </Badge>

                            <button
                              type="button"
                              onClick={() => handleRemoveTask(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {task.description}
                          </p>
                        )}

                        {/* ========================================================= */}
                        {/* MANAGER DOUBT / CLARIFICATION CARD (IF RAISED BY MANAGER) */}
                        {/* ========================================================= */}
                        {task.doubts && task.doubts.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                            {task.doubts.map((doubt: any) => (
                              <div
                                key={doubt._id}
                                className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                                  doubt.status === "resolved"
                                    ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                    : "bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <MessageSquareQuote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>Manager Query from {doubt.raisedByName}:</span>
                                  </div>
                                  <Badge
                                    variant={doubt.status === "resolved" ? "green" : "amber"}
                                    className="text-[10px] font-extrabold"
                                  >
                                    {doubt.status === "resolved" ? "Resolved" : "Clarification Needed"}
                                  </Badge>
                                </div>

                                <p className="font-semibold text-xs italic pl-5">
                                  &ldquo;{doubt.question}&rdquo;
                                </p>

                                {doubt.reply ? (
                                  <div className="pl-5 pt-1 text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>
                                      <strong>Your Reply:</strong> {doubt.reply}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="pl-5 pt-2 flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="Type your explanation or clarification..."
                                      value={replyTextMap[doubt._id] || ""}
                                      onChange={(e) =>
                                        setReplyTextMap({ ...replyTextMap, [doubt._id]: e.target.value })
                                      }
                                      className="flex-1 h-9 px-3 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900"
                                    />
                                    <Button
                                      size="sm"
                                      disabled={replySubmitting}
                                      onClick={() =>
                                        handleReplyToDoubt(data?.update?._id, task._id, doubt._id, true)
                                      }
                                      className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                                    >
                                      Reply &amp; Resolve
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* General Notes & Submit Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      End of Day General Notes &amp; Blockers (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Completed all scheduled tasks. No blocking issues for tomorrow's standup."
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      className="w-full p-3 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#00b0ef] outline-hidden"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Total Hours to Commit: <strong className="text-slate-900 dark:text-white">{totalLoggedToday} hrs</strong>
                    </span>

                    <Button
                      type="button"
                      disabled={submitting || tasksList.length === 0}
                      onClick={handleSubmitDailyUpdate}
                      className="h-11 px-7 bg-[#00b0ef] hover:bg-[#009ad4] text-white font-black text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Daily Log...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Commit Daily Work Log for {format(parseISO(selectedDate), "dd MMM")}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* TAB MODE 2: I WAS ON LEAVE                                */
            /* ========================================================= */
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5 max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center shrink-0">
                  <Palmtree className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Record Leave Status for {format(parseISO(selectedDate), "EEEE, dd MMMM yyyy")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Filing leave ensures your daily submission is compliant and alerts your reporting manager.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Leave Type *
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="Casual Leave">Casual Leave (CL)</option>
                    <option value="Sick Leave">Sick Leave (SL)</option>
                    <option value="Paid Time Off">Paid Time Off (PTO)</option>
                    <option value="Holiday">Official Public Holiday</option>
                    <option value="Other">Other Approved Absence</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Leave Reason / Details (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Out of office for medical appointment or family function."
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full p-3.5 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEntryMode("tasks")}
                    className="h-11 px-5 rounded-2xl text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitDailyUpdate}
                    className="h-11 px-7 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl shadow-md cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Recording Leave...</span>
                      </>
                    ) : (
                      <span>Save &amp; Confirm Leave</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* CASE 2 & 3: MANAGER & ADMIN VIEW                          */
        /* ========================================================= */
        <div className="space-y-6">
          {/* View Mode Switcher & Period Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("tracker")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "tracker"
                    ? "bg-[#00b0ef] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Daily Tracker &amp; Review</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("attendance");
                  fetchDailyData(selectedDate, attendancePeriod);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "attendance"
                    ? "bg-[#00b0ef] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Attendance &amp; Consolidated Sheet</span>
              </button>
            </div>

            {/* Attendance Mode Period Selector & Export */}
            {activeTab === "attendance" && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {(["day", "week", "month"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setAttendancePeriod(p);
                        fetchDailyData(selectedDate, p);
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                        attendancePeriod === p
                          ? "bg-[#00b0ef] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {p === "day" ? "Day Wise" : p === "week" ? "Week Wise" : "Month Wise"}
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={handleExportAttendanceExcel}
                  className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Download Excel Attendance Register with Consolidated Counts"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Attendance Excel</span>
                </Button>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* TAB 1: ATTENDANCE & CONSOLIDATED SHEET                    */}
          {/* ========================================================= */}
          {activeTab === "attendance" ? (
            <div className="space-y-6">
              {/* Period Info Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/30 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00b0ef] text-white flex items-center justify-center shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Consolidated Attendance &amp; Hours Rollup
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Period: <strong className="text-sky-600 dark:text-sky-400">{data?.attendance?.periodLabel || "Current Period"}</strong> ({data?.attendance?.startDateStr} &rarr; {data?.attendance?.endDateStr})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold text-xs px-2.5 py-1 text-slate-700 dark:text-slate-300">
                    Mode: {attendancePeriod === "day" ? "Day Wise" : attendancePeriod === "week" ? "Week Wise" : "Month Wise"}
                  </Badge>
                </div>
              </div>

              {/* Consolidated Metrics KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Total Staff
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {data?.attendance?.teamSummary?.totalMembers || 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Active team members</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#00b0ef] block mb-1">
                    Logged Hours
                  </span>
                  <div className="text-2xl font-black text-[#00b0ef]">
                    {data?.attendance?.teamSummary?.totalLoggedHours || 0}h
                  </div>
                  <span className="text-[10px] text-slate-400">Avg {data?.attendance?.teamSummary?.avgHoursPerWorkDay || 0}h / work day</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-1">
                    In Office
                  </span>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                    {data?.attendance?.teamSummary?.inOfficeCount || 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Physical presence days</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                    Work From Home
                  </span>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {data?.attendance?.teamSummary?.wfhCount || 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Remote logged days</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                    Festival Days
                  </span>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {data?.attendance?.teamSummary?.festivalDayCount || 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Gazetted / Public holidays</span>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 block mb-1">
                    Total Leaves
                  </span>
                  <div className="text-2xl font-black text-rose-500">
                    {data?.attendance?.teamSummary?.leaveCount || 0}
                  </div>
                  <span className="text-[10px] text-slate-400">Approved absence days</span>
                </div>
              </div>

              {/* Employee Consolidated Table */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00b0ef]" />
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Employee Consolidated Attendance Breakdown
                    </h4>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee or dept..."
                      value={attendanceSearch}
                      onChange={(e) => setAttendanceSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-hidden"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3 text-center">In Office</th>
                        <th className="py-3 px-3 text-center">WFH</th>
                        <th className="py-3 px-3 text-center">Work Days</th>
                        <th className="py-3 px-3 text-center">Festival</th>
                        <th className="py-3 px-3 text-center">Non-Work</th>
                        <th className="py-3 px-3 text-center">Leaves</th>
                        <th className="py-3 px-3 text-right">Total Hours</th>
                        <th className="py-3 px-3 text-right">Avg / Day</th>
                        <th className="py-3 px-4 text-center">Compliance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data?.attendance?.staffConsolidated
                        ?.filter((staff: any) => {
                          if (!attendanceSearch.trim()) return true;
                          const q = attendanceSearch.toLowerCase();
                          return (
                            staff.employee?.name?.toLowerCase().includes(q) ||
                            staff.employee?.department?.toLowerCase().includes(q) ||
                            staff.employee?.email?.toLowerCase().includes(q)
                          );
                        })
                        .map((staff: any) => {
                          const emp = staff.employee;
                          const hasLogged = staff.totalHours > 0 || staff.leaveDays > 0;
                          return (
                            <tr
                              key={emp._id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                                <div className="text-[11px] text-slate-400">{emp.email}</div>
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                                {emp.department || "Engineering"}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-sky-600 dark:text-sky-400">
                                {staff.inOfficeDays}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                {staff.wfhDays}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                                {staff.workDays}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-purple-600 dark:text-purple-400">
                                {staff.festivalDays}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-500">
                                {staff.nonWorkDays}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-rose-500">
                                {staff.leaveDays}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                                {staff.totalHours} hrs
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-[#00b0ef]">
                                {staff.avgHoursPerDay} hrs
                              </td>
                              <td className="py-3 px-4 text-center">
                                {hasLogged ? (
                                  <Badge variant="cyan" className="text-[10px] font-bold px-2 py-0.5">
                                    Active Log
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                    No Record
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Day-by-Day Attendance Register Grid Matrix */}
              {data?.attendance?.daysList && data?.attendance?.daysList.length > 1 && (
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#00b0ef]" />
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Attendance Register (Day-by-Day Grid Matrix)
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400">
                      Shows daily work location, leave status, and logged engineering hours
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3 text-left sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[140px]">
                            Employee
                          </th>
                          {data?.attendance?.daysList.map((dayStr: string) => {
                            let label = dayStr;
                            try {
                              label = format(parseISO(dayStr), "dd MMM (EEE)");
                            } catch {}
                            return (
                              <th key={dayStr} className="py-2.5 px-2 text-center min-w-[95px]">
                                {label}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data?.attendance?.staffConsolidated?.map((staff: any) => {
                          const emp = staff.employee;
                          const recordsMap = new Map();
                          if (staff.dailyRecords) {
                            staff.dailyRecords.forEach((dr: any) => recordsMap.set(dr.dateString, dr));
                          }
                          return (
                            <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                                <div>{emp.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">{emp.department || "Engineering"}</div>
                              </td>
                              {data?.attendance?.daysList.map((dayStr: string) => {
                                const rec = recordsMap.get(dayStr);
                                if (!rec) {
                                  return (
                                    <td key={dayStr} className="py-2 px-1 text-center">
                                      <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                                    </td>
                                  );
                                }
                                if (rec.status === "on_leave") {
                                  return (
                                    <td key={dayStr} className="py-2 px-1 text-center">
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                        Leave ({rec.leaveType?.slice(0, 4) || "CL"})
                                      </span>
                                    </td>
                                  );
                                }
                                if (rec.dayType === "Festival Day") {
                                  return (
                                    <td key={dayStr} className="py-2 px-1 text-center">
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                        Festival
                                      </span>
                                    </td>
                                  );
                                }
                                if (rec.dayType === "Non Work Day") {
                                  return (
                                    <td key={dayStr} className="py-2 px-1 text-center">
                                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        Off
                                      </span>
                                    </td>
                                  );
                                }
                                const isWfh = rec.workLocation === "Work From Home";
                                return (
                                  <td key={dayStr} className="py-2 px-1 text-center">
                                    <span
                                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        isWfh
                                          ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                          : "bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                                      }`}
                                    >
                                      {isWfh ? "WFH" : "Office"} ({rec.totalHours || 0}h)
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* TAB 2: DAILY TRACKER & TASK REVIEW (SINGLE DAY DRILLDOWN) */
            /* ========================================================= */
            <div className="space-y-6">
              {/* Summary Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Total Team
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {data?.summary?.totalMembers || 0}
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                    Submitted
                  </span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {data?.summary?.submittedCount || 0}
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block mb-1">
                    On Leave
                  </span>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {data?.summary?.leaveCount || 0}
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                    Pending Log
                  </span>
                  <div className="text-2xl font-black text-amber-500">
                    {data?.summary?.pendingCount || 0}
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#00b0ef] block mb-1">
                    Total Hours
                  </span>
                  <div className="text-2xl font-black text-[#00b0ef]">
                    {data?.summary?.totalHours || 0}h
                  </div>
                </div>
              </div>

              {/* Team Member Daily Reports List */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00b0ef]" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Team Daily Progress for {format(parseISO(selectedDate), "dd MMMM yyyy")}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Click &quot;Raise Doubt&quot; on any task to notify the employee
                  </span>
                </div>

                <div className="space-y-4">
                  {data?.team?.map((memberObj: any) => {
                    const emp = memberObj.employee;
                    const update = memberObj.update;
                    const status = memberObj.status;

                    return (
                      <div
                        key={emp._id}
                        className="p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3.5"
                      >
                        {/* Header: Employee Info & Status Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00b0ef] to-[#007ea8] text-white font-black text-sm flex items-center justify-center shadow-xs">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {emp.name}
                              </h4>
                              <span className="text-xs text-slate-500">
                                {emp.email} • {emp.department || "Engineering"}
                              </span>
                            </div>
                          </div>

                          <div>
                            {status === "submitted" ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="cyan" className="font-extrabold text-xs px-3 py-1 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>SUBMITTED ({update?.totalHours}h Logged)</span>
                                </Badge>
                                <Badge variant="outline" className="font-bold text-[11px] px-2 py-0.5 border-sky-300 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                                  {update?.workLocation === "Work From Home" ? <Home className="w-3 h-3 text-sky-500" /> : <Building2 className="w-3 h-3 text-sky-500" />}
                                  <span>{update?.workLocation || "In Office"}</span>
                                </Badge>
                                <Badge variant="outline" className="font-bold text-[11px] px-2 py-0.5 border-purple-300 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3 text-purple-500" />
                                  <span>{update?.dayType || "Work Day"}</span>
                                </Badge>
                              </div>
                            ) : status === "on_leave" ? (
                              <Badge className="font-extrabold text-xs px-3 py-1 bg-purple-500 text-white flex items-center gap-1.5">
                                <Palmtree className="w-3.5 h-3.5" />
                                <span>ON LEAVE: {update?.leaveType}</span>
                              </Badge>
                            ) : (
                              <Badge className="font-extrabold text-xs px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>PENDING UPDATE</span>
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Content: Tasks breakdown or leave reason */}
                        {status === "on_leave" ? (
                          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
                            <strong>Reason:</strong> {update?.leaveReason || "Personal Leave"}
                          </div>
                        ) : status === "submitted" && update?.tasks?.length > 0 ? (
                          <div className="space-y-2.5 pl-2 sm:pl-4">
                            {update.tasks.map((task: any, tIdx: number) => (
                              <div
                                key={task._id || tIdx}
                                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="font-bold text-[10px] text-[#00b0ef]">
                                      {task.projectName}
                                    </Badge>
                                    {task.stageName && (
                                      <Badge variant="secondary" className="font-bold text-[10px]">
                                        {task.stageName}
                                      </Badge>
                                    )}
                                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                                      {task.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                      {task.startTime} – {task.endTime} ({task.hours}h)
                                    </span>

                                    <Badge variant="default" className="text-[10px]">
                                      {task.taskStatus}
                                    </Badge>

                                    {/* Manager: Raise Doubt Button */}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleOpenDoubtModal(update._id, task._id, task.title, emp.name)
                                      }
                                      className="h-7 px-2.5 text-xs text-amber-600 dark:text-amber-400 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl flex items-center gap-1 font-semibold cursor-pointer"
                                    >
                                      <HelpCircle className="w-3.5 h-3.5" />
                                      <span>Raise Doubt</span>
                                    </Button>
                                  </div>
                                </div>

                                {task.description && (
                                  <p className="text-xs text-slate-500">{task.description}</p>
                                )}

                                {/* Existing Doubts & Replies on this Task */}
                                {task.doubts && task.doubts.length > 0 && (
                                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                    {task.doubts.map((doubt: any) => (
                                      <div
                                        key={doubt._id}
                                        className={`p-2.5 rounded-xl text-xs space-y-1 ${
                                          doubt.status === "resolved"
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold flex items-center gap-1">
                                            <MessageSquareQuote className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Doubt raised by {doubt.raisedByName}:</span>
                                          </span>
                                          <Badge
                                            variant={doubt.status === "resolved" ? "green" : "outline"}
                                            className="text-[10px]"
                                          >
                                            {doubt.status === "resolved" ? "Clarified" : "Open Doubt"}
                                          </Badge>
                                        </div>
                                        <p className="italic text-slate-700 dark:text-slate-300">{doubt.question}</p>
                                        {doubt.reply && (
                                          <div className="pt-1 text-slate-600 dark:text-slate-400 border-t border-dashed border-slate-200 dark:border-slate-700">
                                            <strong className="text-emerald-600 dark:text-emerald-400">
                                              {emp.name}&apos;s Clarification:
                                            </strong>{" "}
                                            {doubt.reply}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}

                            {update?.generalNotes && (
                              <div className="text-xs text-slate-500 italic pt-1">
                                <strong>General Notes:</strong> {update.generalNotes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                            No work log submitted for this date yet.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MANAGER: RAISE DOUBT MODAL                                */}
      {/* ========================================================= */}
      {doubtModalOpen && activeDoubtTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Raise Doubt / Query on Task</h3>
              </div>
              <button
                onClick={() => setDoubtModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div>
                  <span className="text-slate-500">Employee:</span>{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{activeDoubtTarget.employeeName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Task:</span>{" "}
                  <strong className="text-slate-800 dark:text-slate-200">{activeDoubtTarget.taskTitle}</strong>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Your Doubt or Clarification Question *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please clarify if the unit tests have been integrated into CI pipeline."
                  value={doubtQuestion}
                  onChange={(e) => setDoubtQuestion(e.target.value)}
                  className="w-full p-3 text-xs sm:text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDoubtModalOpen(false)}
                  className="text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={doubtSubmitting || !doubtQuestion.trim()}
                  onClick={handleConfirmRaiseDoubt}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {doubtSubmitting ? "Notifying..." : "Notify Employee"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
