import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  CalendarCheck,
  FolderKanban,
  FileText,
  Sliders,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default async function AdminHubPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== "admin") {
    redirect("/my-work");
  }

  const adminSections = [
    {
      title: "Weekly Submission Compliance",
      description: "Monitor weekly update submission status (Submitted, Late, Missing) across all team members.",
      href: "/admin/compliance",
      icon: CalendarCheck,
      badge: "Real-time Tracking",
      badgeVariant: "cyan",
    },
    {
      title: "Portfolio & Lifecycle Gating",
      description: "Oversee project stages, review deliverables, and approve formal gate sign-offs.",
      href: "/projects",
      icon: FolderKanban,
      badge: "Stage Sign-Off",
      badgeVariant: "green",
    },
    {
      title: "Tracking & Lag Thresholds",
      description: "Configure delivery lag warning and critical thresholds, reminder schedules, and timezone.",
      href: "/admin/settings",
      icon: Sliders,
      badge: "Config Engine",
      badgeVariant: "amber",
    },
    {
      title: "Discrepancy & Blocker Registry",
      description: "Review enterprise-wide scope changes, effort overruns, delivery delays, and quality issues.",
      href: "/discrepancies",
      icon: ShieldCheck,
      badge: "Quality & Lag",
      badgeVariant: "red",
    },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Admin Management Hub</span>
              <Badge variant="cyan" className="text-[10px] uppercase font-bold tracking-wider">
                Executive Access
              </Badge>
            </h1>
            <p className="text-xs text-slate-500">
              Configure lifecycle parameters, sign off stage gates, and audit submission compliance
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminSections.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[#00b0ef] group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant={item.badgeVariant as any} className="text-[10px] font-bold">
                    {item.badge}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#00b0ef] transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-[#00b0ef]">
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
