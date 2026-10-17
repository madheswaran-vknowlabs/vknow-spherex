"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { VKnowLogo } from "@/components/vectors/VKnowLogo";
import { HeroIllustration } from "@/components/vectors/HeroIllustration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  const quickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError(null);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Left Column: Visual Hero Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-[#0a1e2c] to-slate-900 text-white p-8 xl:p-10 flex-col justify-between overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00b0ef]/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#007ea8]/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <VKnowLogo size="md" variant="light" />
          <Badge variant="cyan" className="font-medium text-xs">
            Lifecycle v2.0
          </Badge>
        </div>

        <div className="relative z-10 my-auto py-3 max-w-lg">
          <div className="mb-4">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Lifecycle Intelligence from <br />
              <span className="text-[#00b0ef]">Requirement to Release.</span>
            </h1>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">
              Real-time work lag calculation, automated weekly rollups, immutable audit trails,
              and executive reporting for engineering teams.
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl max-w-md mx-auto">
            <HeroIllustration className="w-full h-auto max-h-[220px]" />
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[#00b0ef] mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">8 Stages</span>
              </div>
              <p className="text-[11px] text-slate-300">Formal sign-offs</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-amber-400 mb-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">&lt; 2 Mins</span>
              </div>
              <p className="text-[11px] text-slate-300">Fast updates</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Audit Log</span>
              </div>
              <p className="text-[11px] text-slate-300">Immutable diffs</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-3">
          <span>&copy; {new Date().getFullYear()} VKnow Labs.</span>
          <span>Timezone: Asia/Kolkata (IST)</span>
        </div>
      </div>

      {/* Right Column: Sign In Form (Fit in viewport) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 xl:p-12 overflow-y-auto">
        <div className="w-full max-w-sm space-y-5 my-auto">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-4">
              <VKnowLogo size="md" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sign in to manage projects, log progress, or review sign-offs
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@vknowlabs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <span className="text-[11px] text-[#00b0ef]">
                  Default: password123
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-sm font-semibold bg-[#00b0ef] hover:bg-[#009ad4] text-white shadow hover:shadow-md transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In to Workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Demo User Quick Fill Chips */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <Sparkles className="w-3 h-3 text-[#00b0ef]" />
              <span>1-Click Test Demo Accounts (Seeded)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickFill("admin@vknowlabs.com")}
                className="text-left p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] bg-white dark:bg-slate-900 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Madheswaran
                  </span>
                  <Badge variant="cyan" className="text-[9px] px-1.5 py-0">
                    Admin
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-500 truncate">admin@vknowlabs.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("sarah.lead@vknowlabs.com")}
                className="text-left p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] bg-white dark:bg-slate-900 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Sarah Jenkins
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    Lead
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-500 truncate">sarah.lead@vknowlabs.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("alex.dev@vknowlabs.com")}
                className="text-left p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] bg-white dark:bg-slate-900 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Alex Rivera
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    PWA Dev
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-500 truncate">alex.dev@vknowlabs.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("rohit.qa@vknowlabs.com")}
                className="text-left p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] bg-white dark:bg-slate-900 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Rohit Verma
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    QA
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-500 truncate">rohit.qa@vknowlabs.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
