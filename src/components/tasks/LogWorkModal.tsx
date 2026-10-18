"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Clock,
  CheckCircle,
  X,
  Sparkles,
  Calendar,
  History,
  FileText,
  Loader2,
  TrendingUp,
} from "lucide-react";

interface LogWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: any;
  stageName?: string;
  stageOrder?: number;
}

export function LogWorkModal({
  isOpen,
  onClose,
  onSuccess,
  task,
  stageName,
  stageOrder,
}: LogWorkModalProps) {
  // Preset time slots
  const PRESET_SLOTS = [
    { label: "10:00 AM – 12:00 PM", start: "10:00", end: "12:00", hours: 2 },
    { label: "09:30 AM – 01:30 PM", start: "09:30", end: "13:30", hours: 4 },
    { label: "02:00 PM – 05:00 PM", start: "14:00", end: "17:00", hours: 3 },
    { label: "05:30 PM – 07:30 PM", start: "17:30", end: "19:30", hours: 2 },
  ];

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [hours, setHours] = useState<number>(2);
  const [notes, setNotes] = useState("");
  const [percentComplete, setPercentComplete] = useState<number>(task?.percentComplete || 0);
  const [status, setStatus] = useState<string>(task?.status || "In Progress");
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setPercentComplete(task.percentComplete || 0);
      setStatus(task.status || "In Progress");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setStartTime("10:00");
      setEndTime("12:00");
      setHours(2);
      setNotes("");
    }
  }, [task]);

  // Auto-calculate hours whenever startTime or endTime changes
  const calculateHours = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const [startH, startM] = startStr.split(":").map(Number);
    const [endH, endM] = endStr.split(":").map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const diffMins = endMins - startMins;
    if (diffMins > 0) {
      return Math.round((diffMins / 60) * 10) / 10;
    }
    return 0;
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const calculated = calculateHours(newStart, endTime);
    if (calculated > 0) setHours(calculated);
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const calculated = calculateHours(startTime, newEnd);
    if (calculated > 0) setHours(calculated);
  };

  const handleApplyPreset = (preset: typeof PRESET_SLOTS[0]) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
    setHours(preset.hours);
  };

  // Convert 24h string to 12h readable string (e.g. 10:00 -> 10:00 AM)
  const formatTime12h = (time24: string) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    if (!notes.trim()) {
      alert("Please provide a brief description of what you worked on during this session.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}/log-work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: formatTime12h(startTime),
          endTime: formatTime12h(endTime),
          hours: Number(hours),
          date,
          notes: notes.trim(),
          percentComplete: Number(percentComplete),
          status,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        alert(json.error || "Failed to log work session.");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while logging work.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-7 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-extrabold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2.5 py-0.5 rounded-full">
                {stageName ? `Stage ${stageOrder || ""}: ${stageName}` : "Deliverable Task"}
              </span>
              <Badge variant="cyan" className="text-[9px] uppercase font-bold">
                Log Work Session
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {task.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Estimated: <strong>{task.estimatedHours}h</strong>
              </span>
              <span>&bull;</span>
              <span>
                Logged so far: <strong className="text-[#00b0ef]">{task.loggedHours || 0}h</strong>
              </span>
              <span>&bull;</span>
              <span>
                Current Status: <strong>{task.status}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Time Interval (10am to 12pm) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00b0ef]" />
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Time Slot &amp; Working Interval
                </Label>
              </div>
              <span className="text-[10px] text-slate-400">
                e.g. 10:00 AM to 12:00 PM
              </span>
            </div>

            {/* Quick Preset Slots */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {PRESET_SLOTS.map((slot) => {
                const isActive = startTime === slot.start && endTime === slot.end;
                return (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => handleApplyPreset(slot)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
                      isActive
                        ? "bg-[#00b0ef] text-white border-[#00b0ef] shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#00b0ef]"
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>

            {/* Time Slot Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              {/* Date */}
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Work Date
                </Label>
                <DatePicker value={date} onChange={setDate} placeholder="YYYY-MM-DD" />
              </div>

              {/* Start Time */}
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="h-9 text-xs rounded-xl font-medium"
                  required
                />
              </div>

              {/* End Time */}
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  End Time
                </Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="h-9 text-xs rounded-xl font-medium"
                  required
                />
              </div>

              {/* Total Duration Hours */}
              <div className="space-y-1 sm:col-span-1">
                <div className="flex justify-between items-center">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Logged Hours
                  </Label>
                  <span className="text-[9px] font-mono text-[#00b0ef]">
                    {formatTime12h(startTime)} – {formatTime12h(endTime)}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="h-9 text-xs font-bold rounded-xl pr-8 text-[#00b0ef]"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">
                    hrs
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Candidate Accomplishment & Notes */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#00b0ef]" />
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Work Accomplishment &amp; Details <span className="text-rose-500">*</span>
                </Label>
              </div>
              <span className="text-[10px] text-slate-400">
                Clear summary for manager review
              </span>
            </div>

            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what specific deliverables or items you completed during this time interval (e.g. Worked from 10am to 12pm designing the interactive stepper components, checked mobile layout, and resolved icon alignment)..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#00b0ef]/30 focus:border-[#00b0ef] transition-all resize-y min-h-[80px]"
            />
          </div>

          {/* Section 3: Progress & Task Status Update */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00b0ef]" />
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Updated Task Status &amp; Progress
                </Label>
              </div>
              <span className="text-xs font-mono font-bold text-[#00b0ef]">
                {percentComplete}% Complete
              </span>
            </div>

            {/* Status Segmented Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: "To Do", label: "To Do" },
                { val: "In Progress", label: "In Progress" },
                { val: "Under Review", label: "Under Review" },
                { val: "Completed", label: "Completed" },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => {
                    setStatus(s.val);
                    if (s.val === "Completed") setPercentComplete(100);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    status === s.val
                      ? s.val === "Completed"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                        : "bg-[#00b0ef] text-white border-[#00b0ef] shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Progress Range Slider */}
            <div className="space-y-1 pt-1">
              <input
                type="range"
                min="0"
                max="100"
                value={percentComplete}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPercentComplete(val);
                  if (val === 100) setStatus("Completed");
                }}
                className="w-full accent-[#00b0ef] cursor-pointer h-2"
              />
            </div>
          </div>

          {/* Past Sessions Accordion (if any) */}
          {task.workLogs && task.workLogs.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#00b0ef] transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>
                  {showHistory ? "Hide Past Sessions" : `View Past Sessions (${task.workLogs.length})`}
                </span>
              </button>

              {showHistory && (
                <div className="mt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 max-h-40 overflow-y-auto">
                  {task.workLogs.map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                        <span>
                          {log.startTime && log.endTime
                            ? `${log.startTime} – ${log.endTime} (${log.hours}h)`
                            : `${log.hours}h Logged`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {log.date ? format(new Date(log.date), "MMM dd, yyyy") : ""} by {log.userName}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          &quot;{log.notes}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#00b0ef] hover:bg-[#009ad4] text-white h-9 px-5 text-xs font-bold rounded-xl shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Logging Session...</span>
                </>
              ) : (
                "Save Work Session & Update Task"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
