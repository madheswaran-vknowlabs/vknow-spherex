"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { VKnowLogo } from "@/components/vectors/VKnowLogo";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/common/SignOutButton";
import { NotificationBell } from "@/components/common/NotificationBell";
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
  Sparkles,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

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
  const name = user.name || "User";
  const department = user.department || "Engineering";
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

  // Nav Links based on 3 distinct roles
  const navLinks = isAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Projects & Tasks", href: "/projects", icon: FolderKanban },
        { label: "Team Reports", href: "/reports", icon: FileBarChart2 },
        { label: "Discrepancies", href: "/discrepancies", icon: AlertTriangle },
        { label: "User Directory", href: "/admin/users", icon: Users },
        { label: "Admin Portal", href: "/admin", icon: Shield },
      ]
    : isManager
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Projects & Tasks", href: "/projects", icon: FolderKanban },
        { label: "Team Reports", href: "/reports", icon: FileBarChart2 },
        { label: "Discrepancies", href: "/discrepancies", icon: AlertTriangle },
        { label: "My Team", href: "/admin/users", icon: Users },
      ]
    : [
        { label: "My Work", href: "/my-work", icon: CheckSquare },
        { label: "My Reports", href: "/my-reports", icon: FileBarChart2 },
      ];

  const homeHref = isAdmin || isManager ? "/dashboard" : "/my-work";

  const getInitials = (nameStr: string) => {
    return nameStr
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  };

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
      {/* Desktop Tab Navigation Bar / Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/90 dark:border-slate-800 transition-all duration-300 ${
          isCollapsed ? "w-[76px]" : "w-[270px]"
        }`}
      >
        {/* Top Header of Tab Bar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-1">
            {/* Logo */}
            <Link
              href={homeHref}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0"
              title="VKnow SphereX"
            >
              <VKnowLogo size="sm" showText={!isCollapsed} />
            </Link>

            {/* Role Badge in Top Right of the Tab Bar & Minimize/Maximize Toggle */}
            <div className="flex items-center gap-1 shrink-0">
              {!isCollapsed && (
                <Badge
                  variant={isAdmin ? "cyan" : isManager ? "default" : "secondary"}
                  className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 shadow-2xs"
                >
                  {role}
                </Badge>
              )}

              {/* Minimize / Maximize Button */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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

          {/* Minimized Role Indicator */}
          {isCollapsed && (
            <div className="mt-2 text-center">
              <span
                className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                  isAdmin
                    ? "bg-[#00b0ef]/15 text-[#00b0ef]"
                    : isManager
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
                title={`Role: ${role}`}
              >
                {role.slice(0, 3)}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Tabs List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${isCollapsed ? "text-center" : ""}`}>
            {isCollapsed ? "Tabs" : "Navigation"}
          </div>

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

        {/* User Details at the Bottom of the Nav Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00b0ef] to-[#007ea8] text-white flex items-center justify-center font-bold text-xs shadow-xs"
                title={`${name} (${department}) - ${role.toUpperCase()}`}
              >
                {getInitials(name)}
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00b0ef] to-[#007ea8] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  {getInitials(name)}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {department}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-800 transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-3 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <Link href={homeHref} className="hover:opacity-90">
          <VKnowLogo size="sm" />
        </Link>

        <div className="flex items-center gap-2">
          <Badge
            variant={isAdmin ? "cyan" : isManager ? "default" : "secondary"}
            className="text-[10px] uppercase font-bold"
          >
            {role}
          </Badge>
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex">
          <div className="w-72 bg-white dark:bg-slate-900 h-full p-4 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <VKnowLogo size="sm" />
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

            {/* Mobile User Card at Bottom */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#00b0ef] text-white flex items-center justify-center font-bold text-xs">
                  {getInitials(name)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{name}</div>
                  <div className="text-[10px] text-slate-400">{role.toUpperCase()}</div>
                </div>
              </div>
              <SignOutButton />
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
