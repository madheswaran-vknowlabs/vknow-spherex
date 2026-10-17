"use client";

import React, { useEffect, useRef, useState } from "react";
import Gantt from "frappe-gantt";
import "@/styles/frappe-gantt.css";
import { format, parseISO, isValid, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ZoomIn, Layers, Clock, AlertCircle } from "lucide-react";

export interface GanttItem {
  id: string;
  name: string;
  start: string | Date;
  end: string | Date;
  progress: number;
  dependencies?: string | string[];
  type?: "stage" | "task";
  status?: string;
  assignee?: string;
  lagInDays?: number;
  isAtRisk?: boolean;
}

interface FrappeGanttProps {
  items: GanttItem[];
  title?: string;
  onItemClick?: (item: GanttItem) => void;
  className?: string;
  defaultViewMode?: "Day" | "Week" | "Month";
}

export function FrappeGantt({
  items,
  title,
  onItemClick,
  className = "",
  defaultViewMode = "Week",
}: FrappeGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttInstanceRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month">(defaultViewMode);

  // Normalize dates into YYYY-MM-DD format
  const formatGanttDate = (d: string | Date | undefined, fallbackOffsetDays = 0): string => {
    if (!d) {
      return format(addDays(new Date(), fallbackOffsetDays), "yyyy-MM-dd");
    }
    const parsed = typeof d === "string" ? parseISO(d) : d;
    if (!isValid(parsed)) {
      return format(addDays(new Date(), fallbackOffsetDays), "yyyy-MM-dd");
    }
    return format(parsed, "yyyy-MM-dd");
  };

  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;

    // Convert items to frappe-gantt tasks format
    const formattedTasks = items.map((item, idx) => {
      let startDateStr = formatGanttDate(item.start, idx * 3);
      let endDateStr = formatGanttDate(item.end, idx * 3 + 4);

      // Ensure start is strictly before or equal to end
      if (startDateStr > endDateStr) {
        endDateStr = startDateStr;
      }

      // Calculate custom class for color coding
      let customClass = "gantt-bar-task";
      if (item.type === "stage") {
        customClass = "gantt-bar-stage";
      } else if (item.isAtRisk || (item.lagInDays && item.lagInDays > 5)) {
        customClass = "gantt-bar-red";
      } else if (item.lagInDays && item.lagInDays > 0) {
        customClass = "gantt-bar-amber";
      } else if (item.progress === 100 || item.status === "Completed" || item.status === "Approved") {
        customClass = "gantt-bar-green";
      }

      // Format dependencies
      let depString = "";
      if (Array.isArray(item.dependencies)) {
        depString = item.dependencies.filter(Boolean).join(", ");
      } else if (typeof item.dependencies === "string") {
        depString = item.dependencies;
      }

      return {
        id: String(item.id),
        name: item.name,
        start: startDateStr,
        end: endDateStr,
        progress: Math.min(100, Math.max(0, Math.round(item.progress || 0))),
        dependencies: depString,
        custom_class: customClass,
      };
    });

    try {
      // Clear previous container contents
      containerRef.current.innerHTML = "";

      // Create SVG inside container
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("id", "gantt-svg-" + Math.random().toString(36).substring(7));
      containerRef.current.appendChild(svg);

      const gantt = new (Gantt as any)(svg, formattedTasks, {
        header_height: 50,
        column_width: viewMode === "Day" ? 38 : viewMode === "Week" ? 85 : 120,
        step: 24,
        view_modes: ["Day", "Week", "Month"],
        bar_height: 28,
        bar_corner_radius: 6,
        arrow_curve: 5,
        padding: 18,
        view_mode: viewMode,
        date_format: "YYYY-MM-DD",
        custom_popup_html: (task: any) => {
          const original = items.find((i) => String(i.id) === String(task.id));
          return `
            <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-slate-900 dark:text-slate-100 min-w-[200px]">
              <div class="font-bold text-sm text-[#007ea8] dark:text-[#00b0ef] mb-1">${task.name}</div>
              <div class="text-xs text-slate-500 mb-2 flex items-center justify-between">
                <span>${task._start.toLocaleDateString()} - ${task._end.toLocaleDateString()}</span>
              </div>
              <div class="flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                <span class="text-slate-500">Progress:</span>
                <span class="text-[#00b0ef] font-bold">${task.progress}%</span>
              </div>
              ${
                original?.assignee
                  ? `<div class="text-xs text-slate-500 mt-1 flex justify-between"><span>Assignee:</span> <span class="font-medium text-slate-800 dark:text-slate-200">${original.assignee}</span></div>`
                  : ""
              }
              ${
                original?.lagInDays
                  ? `<div class="text-xs text-amber-500 font-semibold mt-1 flex justify-between"><span>Lag:</span> <span>+${original.lagInDays} days</span></div>`
                  : ""
              }
            </div>
          `;
        },
        on_click: (task: any) => {
          if (onItemClick) {
            const found = items.find((i) => String(i.id) === String(task.id));
            if (found) onItemClick(found);
          }
        },
      });

      ganttInstanceRef.current = gantt;
    } catch (err) {
      console.error("Failed to render Frappe Gantt:", err);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [items, viewMode, onItemClick]);

  const changeViewMode = (mode: "Day" | "Week" | "Month") => {
    setViewMode(mode);
    if (ganttInstanceRef.current) {
      ganttInstanceRef.current.change_view_mode(mode);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center px-6">
        <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          No Timeline Dates Available
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Set planned start and end dates on stages and tasks to render the interactive Frappe Gantt timeline.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden ${className}`}>
      {/* Gantt Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00b0ef]/10 text-[#00b0ef] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{title || "Project Gantt Timeline"}</span>
              <Badge variant="cyan" className="text-xs">
                {items.length} items
              </Badge>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Interactive timeline powered by Frappe Gantt with dependency tracking &amp; lag indicators
            </p>
          </div>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => changeViewMode("Day")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "Day"
                ? "bg-white dark:bg-slate-900 text-[#00b0ef] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Day View
          </button>
          <button
            onClick={() => changeViewMode("Week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "Week"
                ? "bg-white dark:bg-slate-900 text-[#00b0ef] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Week View
          </button>
          <button
            onClick={() => changeViewMode("Month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "Month"
                ? "bg-white dark:bg-slate-900 text-[#00b0ef] shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Month View
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#00b0ef]" />
          <span>Stage Milestone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>Completed / On Time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500" />
          <span>At Risk / Warning Lag</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-500" />
          <span>Critical Slip / Blocker</span>
        </div>
      </div>

      {/* SVG Gantt Canvas Container */}
      <div className="p-4 overflow-x-auto w-full custom-scrollbar">
        <div ref={containerRef} className="frappe-gantt-wrapper min-h-[380px] w-full" />
      </div>

      <style jsx global>{`
        .frappe-gantt-wrapper svg {
          border-radius: 8px;
          min-width: 100%;
        }
        .gantt-bar-stage .bar {
          fill: #00b0ef !important;
          stroke: #007ea8 !important;
          stroke-width: 1px !important;
        }
        .gantt-bar-stage .bar-progress {
          fill: #007ea8 !important;
        }
        .gantt-bar-green .bar {
          fill: #10b981 !important;
        }
        .gantt-bar-green .bar-progress {
          fill: #059669 !important;
        }
        .gantt-bar-amber .bar {
          fill: #f59e0b !important;
        }
        .gantt-bar-amber .bar-progress {
          fill: #d97706 !important;
        }
        .gantt-bar-red .bar {
          fill: #ef4444 !important;
        }
        .gantt-bar-red .bar-progress {
          fill: #dc2626 !important;
        }
        .gantt .bar-label {
          font-weight: 600 !important;
          font-size: 12px !important;
          fill: #1e293b !important;
        }
        .dark .gantt .bar-label {
          fill: #f8fafc !important;
        }
        .gantt .grid-row:nth-child(even) {
          fill: #f8fafc !important;
        }
        .dark .gantt .grid-row:nth-child(even) {
          fill: #0d1527 !important;
        }
        .gantt .arrow {
          stroke: #00b0ef !important;
          stroke-width: 2px !important;
        }
      `}</style>
    </div>
  );
}
