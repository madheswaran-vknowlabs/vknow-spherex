"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  FileBarChart2,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Layers,
  Clock,
  CalendarCheck2,
} from "lucide-react";

interface TabNavigationBarProps {
  user: {
    name?: string;
    email?: string;
    role?: string;
    department?: string;
  };
}

export function TabNavigationBar({ user }: TabNavigationBarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user.role || "employee";
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("spherex_nav_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("spherex_nav_collapsed", String(next));
  };

  // Nav Links based on 3 distinct roles (All roles have Attendance tab)
  const navLinks = isAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Daily Work Tracker", href: "/daily-update", icon: Clock },
        { label: "Attendance & Leaves", href: "/attendance", icon: CalendarCheck2 },
        { label: "Projects & Tasks", href: "/projects", icon: FolderKanban },
        { label: "Team Reports", href: "/reports", icon: FileBarChart2 },
        { label: "Discrepancies", href: "/discrepancies", icon: AlertTriangle },
        { label: "User Directory", href: "/admin/users", icon: Users },
        { label: "Admin Portal", href: "/admin", icon: Shield },
      ]
    : isManager
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Daily Work Tracker", href: "/daily-update", icon: Clock },
        { label: "Attendance & Leaves", href: "/attendance", icon: CalendarCheck2 },
        { label: "Projects & Tasks", href: "/projects", icon: FolderKanban },
        { label: "Team Reports", href: "/reports", icon: FileBarChart2 },
        { label: "Discrepancies", href: "/discrepancies", icon: AlertTriangle },
        { label: "My Team", href: "/admin/users", icon: Users },
      ]
    : [
        { label: "Daily Work Update", href: "/daily-update", icon: Clock },
        { label: "Attendance & Leaves", href: "/attendance", icon: CalendarCheck2 },
        { label: "My Work", href: "/my-work", icon: CheckSquare },
        { label: "My Reports", href: "/my-reports", icon: FileBarChart2 },
      ];

  const isLinkActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin" || pathname === "/admin/settings";
    }
    if (href === "/projects") {
      return pathname.startsWith("/projects");
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Tab Navigation Rail (ONLY contains tabs and minimize/maximize option) */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/90 dark:border-slate-800 transition-all duration-300 ${
          isCollapsed ? "w-[72px]" : "w-60"
        }`}
      >
        {/* Top Header of Tab Bar: Minimize/Maximize and Role Badge at Top Right */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-1">
            {/* Section label */}
            {!isCollapsed ? (
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Navigation
              </span>
            ) : (
              <span className="text-[9px] font-extrabold uppercase text-slate-400 mx-auto">
                Tabs
              </span>
            )}

            {/* Role Badge in Top Right of the Tab Bar & Minimize/Maximize Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isCollapsed && (
                <Badge
                  variant={isAdmin ? "cyan" : isManager ? "default" : "secondary"}
                  className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.2 shadow-2xs"
                >
                  {role}
                </Badge>
              )}

              {/* Minimize / Maximize Button */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isCollapsed ? "Maximize Navigation Tab Bar" : "Minimize Navigation Tab Bar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-[#00b0ef]" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs List: ONLY Tabs */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  active
                    ? "bg-[#00b0ef]/12 text-[#007ea8] dark:text-[#00b0ef] dark:bg-[#00b0ef]/18 font-bold border-l-3 border-[#00b0ef] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    active ? "text-[#00b0ef]" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Bottom Expand Helper if collapsed */}
        {isCollapsed && (
          <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1 rounded-lg text-slate-400 hover:text-[#00b0ef] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Expand Tabs"
            >
              <ChevronRight className="w-4 h-4 text-[#00b0ef] mx-auto" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer */}
      <div className="md:hidden">
        {/* Mobile Hamburger Floating Button */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-[#00b0ef] text-white flex items-center justify-center shadow-xl cursor-pointer"
          title="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex">
            <div className="w-68 bg-white dark:bg-slate-900 h-full p-4 flex flex-col justify-between shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00b0ef]" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                      Navigation Tabs
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {navLinks.map((item) => {
                    const Icon = item.icon;
                    const active = isLinkActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                          active
                            ? "bg-[#00b0ef]/10 text-[#007ea8] dark:text-[#00b0ef] font-bold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}
