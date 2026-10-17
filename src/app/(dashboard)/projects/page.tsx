"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FolderKanban,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  LayoutGrid,
  Table as TableIcon,
  Users,
  ChevronRight,
  Filter,
  Sparkles,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedHealth, setSelectedHealth] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Strict role enforcement: Non-admins cannot view portfolio list
  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "admin") {
        router.replace("/my-work");
      }
    }
  }, [session, status, router]);

  const fetchProjects = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (selectedStatus !== "ALL") params.append("status", selectedStatus);
    if (selectedHealth !== "ALL") params.append("health", selectedHealth);

    fetch(`/api/projects?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProjects(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, [search, selectedHealth, selectedStatus]);

  // Aggregate stats
  const totalCount = projects.length;
  const greenCount = projects.filter((p) => p.health === "Green").length;
  const amberCount = projects.filter((p) => p.health === "Amber").length;
  const redCount = projects.filter((p) => p.health === "Red").length;
  const avgProgress =
    totalCount > 0
      ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / totalCount)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Project Portfolio</span>
            <Badge variant="cyan" className="font-mono text-xs">
              {totalCount} Active
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor end-to-end lifecycle progress, work lag, and stage gates across all systems.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Link href="/dashboard">
            <button className="h-9 px-3.5 rounded-xl border border-[#00b0ef]/40 text-[#00b0ef] hover:bg-[#00b0ef]/10 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Center</span>
            </button>
          </Link>

          {/* View toggle */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-[#00b0ef] text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Card Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-[#00b0ef] text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Dense Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <CreateProjectModal onSuccess={fetchProjects} />
        </div>
      </div>

      {/* Metrics Strip (Avoid Empty Space - High Density) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Projects
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {totalCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#00b0ef]">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              On Track
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {greenCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Warning Lag
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {amberCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Critical Slip
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {redCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg Progress
            </div>
            <div className="text-2xl font-black text-[#00b0ef] mt-0.5">{avgProgress}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#e0f6fd] dark:bg-[#0f2e42] text-[#00b0ef]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by project name, code or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Health:</span>
          {["ALL", "Green", "Amber", "Red"].map((h) => (
            <button
              key={h}
              onClick={() => setSelectedHealth(h)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                selectedHealth === h
                  ? h === "Green"
                    ? "bg-emerald-500 text-white"
                    : h === "Amber"
                    ? "bg-amber-500 text-white"
                    : h === "Red"
                    ? "bg-rose-500 text-white"
                    : "bg-[#00b0ef] text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Display: Card Grid or Dense Table */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#00b0ef]" />
          <span className="text-xs">Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No projects found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or create a new project with all 8 standard stages.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {projects.map((p) => {
            const healthVariant =
              p.health === "Green" ? "green" : p.health === "Amber" ? "amber" : "red";

            return (
              <Link
                key={p._id}
                href={`/projects/${p._id}`}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2 py-0.5 rounded-md">
                          {p.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {p.client}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 group-hover:text-[#00b0ef] transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {p.description || "Enterprise project lifecycle tracking"}
                      </p>
                    </div>

                    <Badge
                      variant={healthVariant as any}
                      className="text-[10px] font-bold uppercase shrink-0"
                    >
                      {p.health} &bull; {p.lagInDays > 0 ? `+${p.lagInDays}d Lag` : "On Track"}
                    </Badge>
                  </div>

                  {/* Current Active Stage */}
                  <div className="mt-3.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium text-[11px]">
                      Current Stage:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00b0ef]" />
                      {p.currentStageId?.name || "Requirement Discussion"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3.5 space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <span>Overall Completion</span>
                      <span className="text-slate-900 dark:text-white font-bold">
                        {p.progress || 0}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00b0ef] to-[#007ea8] rounded-full transition-all"
                        style={{ width: `${p.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Roster & Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] text-slate-500 font-medium">
                      {p.members?.length || 0} members
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                    <span className="text-[11px] text-slate-500">
                      {p.taskStats?.completed || 0}/{p.taskStats?.total || 0} tasks done
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-[#00b0ef] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Tasks</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {projects.map((p) => {
                const healthVariant =
                  p.health === "Green" ? "green" : p.health === "Amber" ? "amber" : "red";

                return (
                  <tr
                    key={p._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#00b0ef]">
                      {p.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{p.client}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00b0ef]" />
                        {p.currentStageId?.name || "Requirement Discussion"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={healthVariant as any}
                        className="text-[10px] font-bold uppercase"
                      >
                        {p.health} ({p.lagInDays > 0 ? `+${p.lagInDays}d` : "0d"})
                      </Badge>
                    </td>
                    <td className="py-3 px-4 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-[#00b0ef] rounded-full"
                            style={{ width: `${p.progress || 0}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] w-8 text-right">
                          {p.progress || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {p.taskStats?.completed || 0}/{p.taskStats?.total || 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/projects/${p._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#00b0ef] hover:bg-[#00b0ef] hover:text-white font-bold text-[11px] transition-colors"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
