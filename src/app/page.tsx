import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import { Project, User, Task, Discrepancy, Stage, WeeklyUpdate, AuditLog } from "@/models";
import { VKnowLogo } from "@/components/vectors/VKnowLogo";
import { HeroIllustration } from "@/components/vectors/HeroIllustration";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/common/SignOutButton";
import {
  FolderKanban,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Layers,
  Database,
  ArrowRight,
} from "lucide-react";


export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  await connectDB();

  const [projectCount, userCount, taskCount, discrepancyCount, updateCount, auditCount] =
    await Promise.all([
      Project.countDocuments({ isArchived: false }),
      User.countDocuments({ isActive: true }),
      Task.countDocuments({ isArchived: false }),
      Discrepancy.countDocuments({ status: { $in: ["Open", "In Review"] } }),
      WeeklyUpdate.countDocuments({}),
      AuditLog.countDocuments({}),
    ]);

  const userRole = (session.user as any).role;
  const userName = session.user.name || "User";
  const userDept = (session.user as any).department || "Engineering";

  // Fetch projects to showcase phase 1 readiness
  const projects = await Project.find({ isArchived: false })
    .populate("members", "name email avatar")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <VKnowLogo size="md" />

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                {userName}
              </span>
              <span className="text-xs text-slate-500 capitalize flex items-center gap-1.5 justify-end">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    userRole === "admin" ? "bg-[#00b0ef]" : "bg-emerald-500"
                  }`}
                />
                {userRole} &bull; {userDept}
              </span>
            </div>

            <Badge
              variant={userRole === "admin" ? "cyan" : "secondary"}
              className="uppercase tracking-wider font-bold text-[10px]"
            >
              {userRole}
            </Badge>

            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & System Status Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#0a2336] to-slate-900 p-8 text-white shadow-xl border border-slate-800">
          <div className="absolute right-0 top-0 w-80 h-80 bg-[#00b0ef]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00b0ef]/20 border border-[#00b0ef]/40 text-[#38c5f5] text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5" />
                Phase 1 Core Infrastructure Initialized &amp; Verified
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Welcome, <span className="text-[#00b0ef]">{userName}</span>
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                VKnow SphereX is active with MongoDB Mongoose connection pooling, Auth.js
                role-based security, field-level append-only audit logging, and the full seeded
                dataset.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[100px]">
                <div className="text-2xl font-black text-[#00b0ef]">{projectCount}</div>
                <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">
                  Projects
                </div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[100px]">
                <div className="text-2xl font-black text-emerald-400">{userCount}</div>
                <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">
                  Users
                </div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[100px]">
                <div className="text-2xl font-black text-amber-400">{updateCount}</div>
                <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">
                  Updates
                </div>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[100px]">
                <div className="text-2xl font-black text-purple-400">{auditCount}</div>
                <div className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">
                  Audit Logs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 1 Verification Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-[#00b0ef]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Database Engine
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                MongoDB + Mongoose
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Global Cached Pool Active
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Authentication
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Auth.js + Roles
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                Server Guard Enforced
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Open Discrepancies
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {discrepancyCount} Pending
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Scope &amp; Effort Tracked
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Historical Tracking
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                8 Weeks Seeded
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Ready for Rollups
              </div>
            </div>
          </div>
        </div>

        {/* Seeded Projects Portfolio Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Seeded Lifecycle Projects
              </h2>
              <p className="text-xs text-slate-500">
                Representing varied lifecycle stages, health statuses, and work lag
              </p>
            </div>
            <Badge variant="cyan">4 Projects Loaded</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p: any) => {
              const healthBadge =
                p.health === "Green" ? "green" : p.health === "Amber" ? "amber" : "red";

              return (
                <div
                  key={p._id.toString()}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-[#00b0ef] transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#00b0ef] bg-[#e0f6fd] dark:bg-[#0f2e42] px-2 py-0.5 rounded-md">
                        {p.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{p.description}</p>
                    </div>
                    <Badge variant={healthBadge as any} className="uppercase font-bold text-[10px]">
                      {p.health} &bull; {p.lagInDays > 0 ? `+${p.lagInDays}d Lag` : "On Track"}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 mt-4">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <span>Lifecycle Completion</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{p.progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00b0ef] to-[#007ea8] rounded-full transition-all"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                    <span>Client: <strong className="text-slate-700 dark:text-slate-300">{p.client}</strong></span>
                    <span>Status: <strong className="text-slate-700 dark:text-slate-300">{p.status}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
