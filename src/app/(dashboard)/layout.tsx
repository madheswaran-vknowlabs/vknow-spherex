import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
  Bell,
  Sparkles,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;
  const role = user.role || "user";
  const name = user.name || "User";
  const department = user.department || "Engineering";
  const isAdmin = role === "admin";

  // Strict role segregation:
  // Admin: Dashboard, Projects & Tasks, Team Reports, Discrepancies, Admin Portal
  // Team Member (user): ONLY My Work and My Reports
  const navLinks = isAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Projects & Tasks", href: "/projects", icon: FolderKanban },
        { label: "Team Reports", href: "/reports", icon: FileBarChart2 },
        { label: "Discrepancies", href: "/discrepancies", icon: AlertTriangle },
        { label: "Admin Portal", href: "/admin", icon: Shield },
      ]
    : [
        { label: "My Work", href: "/my-work", icon: CheckSquare },
        { label: "My Reports", href: "/my-reports", icon: FileBarChart2 },
      ];

  const homeHref = isAdmin ? "/dashboard" : "/my-work";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
        <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href={homeHref} className="hover:opacity-90 transition-opacity">
              <VKnowLogo size="md" />
            </Link>

            {/* Main Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#00b0ef]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right User Bar */}
          <div className="flex items-center gap-4">
            {/* Context Badge */}
            <div className="hidden xl:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-[#00b0ef]" />
              <span>{isAdmin ? "Admin Portal: Full Access" : "Team Member: My Work & Reports"}</span>
            </div>

            {/* Interactive Notification Bell */}
            <NotificationBell />

            {/* User Profile Chip */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {name}
                </span>
                <span className="text-xs text-slate-500 truncate max-w-[150px]">
                  {department}
                </span>
              </div>

              <Badge
                variant={isAdmin ? "cyan" : "secondary"}
                className="text-xs uppercase font-bold tracking-wider px-2 py-0.5"
              >
                {role}
              </Badge>

              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main App Page View - Widescreen Container */}
      <main className="flex-1 w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (PWA Friendly) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-3 py-2 flex items-center justify-around shadow-lg">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-1 px-3 text-xs font-semibold text-slate-600 hover:text-[#00b0ef] dark:text-slate-400 dark:hover:text-[#00b0ef] transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
