"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  CheckSquare,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  task_assigned: { icon: CheckSquare, color: "text-[#00b0ef]", bg: "bg-[#00b0ef]/10" },
  task_overdue: { icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10" },
  task_blocked: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  dependency_slipped: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  stage_approval_needed: { icon: ShieldCheck, color: "text-[#00b0ef]", bg: "bg-[#00b0ef]/10" },
  stage_approved: { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  stage_rejected: { icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10" },
  weekly_reminder: { icon: Calendar, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  discrepancy_raised: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  discrepancy_resolved: { icon: Check, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  system: { icon: Sparkles, color: "text-slate-500", bg: "bg-slate-500/10" },
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { markAllRead: true }),
      });
      if (id) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Notifications"
        className={`relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
          isOpen
            ? "bg-slate-100 dark:bg-slate-800 text-[#00b0ef]"
            : "text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#00b0ef] text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#00b0ef]/10 text-[#00b0ef]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAsRead()}
                className="flex items-center gap-1 text-[11px] font-bold text-[#00b0ef] hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  All caught up!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No new notifications at this time.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const typeConfig = TYPE_ICONS[n.type] || TYPE_ICONS.system;
                const IconComponent = typeConfig.icon;

                return (
                  <div
                    key={n._id}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n._id);
                    }}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      n.isRead
                        ? "hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75"
                        : "bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.bg} ${typeConfig.color}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#00b0ef] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                        <span>
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => setIsOpen(false)}
                            className="text-[#00b0ef] hover:underline flex items-center gap-0.5 font-bold"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
