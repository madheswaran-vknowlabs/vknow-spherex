import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { VKnowLogo } from "@/components/vectors/VKnowLogo";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/common/SignOutButton";
import { NotificationBell } from "@/components/common/NotificationBell";
import { TabNavigationBar } from "@/components/layout/TabNavigationBar";
import { Sparkles } from "lucide-react";

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
  const role = user.role || "employee";
  const name = user.name || "User";
  const department = user.department || "Engineering";
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  const homeHref = isAdmin || isManager ? "/dashboard" : "/my-work";

  const getInitials = (nameStr: string) => {
    return (
      nameStr
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Global Header Bar: Brand Logo & User Details with Logout */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
        <div className="w-full px-3 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Brand Logo & Title on Left */}
          <Link href={homeHref} className="hover:opacity-90 transition-opacity shrink-0">
            <VKnowLogo size="md" />
          </Link>

          {/* Right Header Bar: Context, Notifications, User Details, Role & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* System Context Badge */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-[#00b0ef]" />
              <span>
                {isAdmin
                  ? "Admin: Full System Access"
                  : isManager
                  ? "Manager: Team & Projects Scope"
                  : "Employee: My Work & Reports"}
              </span>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Details & Logout inside Header */}
            <div className="flex items-center gap-2.5 sm:gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00b0ef] to-[#007ea8] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0"
                title={`${name} (${department})`}
              >
                {getInitials(name)}
              </div>

              {/* User Name & Department */}
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {name}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {department}
                </span>
              </div>

              {/* Role Badge */}
              <Badge
                variant={isAdmin ? "cyan" : isManager ? "default" : "secondary"}
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5"
              >
                {role}
              </Badge>

              {/* Logout Button */}
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Body: Left Tab Navigation Rail + Right Page Content */}
      <div className="flex-1 flex min-w-0">
        {/* Navigation Tab Bar: ONLY contains tabs and minimize/maximize option */}
        <TabNavigationBar user={user} />

        {/* Page Content View */}
        <main className="flex-1 min-w-0 px-3 sm:px-6 lg:px-8 py-5 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
