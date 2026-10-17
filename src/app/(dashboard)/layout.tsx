import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { VKnowLogo } from "@/components/vectors/VKnowLogo";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/common/SignOutButton";
import {
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

  const navLinks = [
    { label: "Portfolio", href: "/projects", icon: FolderKanban },
    { label: "My Work", href: "/my-work", icon: CheckSquare },
    { label: "Discrepancies", href: "/discrepancies", icon: AlertTriangle },
    { label: "Reports", href: "/reports", icon: FileBarChart2 },
    ...(role === "admin"
      ? [{ label: "Admin Portal", href: "/admin", icon: Shield }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/projects" className="hover:opacity-90 transition-opacity">
              <VKnowLogo size="sm" />
            </Link>

            {/* Main Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right User Bar */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Tag */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              <Sparkles className="w-3 h-3 text-[#00b0ef]" />
              <span>Phase 4: Tracking &amp; Health Engine Active</span>
            </div>

            {/* Notification Bell Icon */}
            <button
              title="Notifications"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00b0ef] ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* User Profile Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="flex flex-col text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  {name}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {department}
                </span>
              </div>

              <Badge
                variant={role === "admin" ? "cyan" : "secondary"}
                className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0"
              >
                {role}
              </Badge>

              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main App Page View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
