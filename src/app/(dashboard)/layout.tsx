import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TabNavigationBar } from "@/components/layout/TabNavigationBar";
import { NotificationBell } from "@/components/common/NotificationBell";
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
  const isAdmin = role === "admin";
  const isManager = role === "manager";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Tab Navigation Bar (Minimize/Maximize, role in top right, user details at bottom) */}
      <TabNavigationBar user={user} />

      {/* Main App Content View */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Slim Utility Header */}
        <header className="sticky top-0 z-30 w-full h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-[#00b0ef]" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {isAdmin
                ? "Admin: Full System Access"
                : isManager
                ? "Manager: Team & Projects Scope"
                : "Employee: My Work & Reports"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-5 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
