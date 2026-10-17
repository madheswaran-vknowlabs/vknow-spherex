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
        window.location.href = "/";
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
      {/* Left Column: Visual Hero Branding (60% Width Split) */}
      <div className="hidden lg:flex lg:w-[60%] relative bg-gradient-to-br from-slate-950 via-[#0a1e2c] to-slate-950 text-white p-8 xl:p-12 flex-col justify-between overflow-hidden border-r border-slate-800/80">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00b0ef]/20 rounded-full blur-3xl -mr-28 -mt-28 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#007ea8]/20 rounded-full blur-3xl -ml-28 -mb-28 pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <VKnowLogo size="md" variant="light" />
          <Badge variant="cyan" className="font-semibold text-xs tracking-wider uppercase px-3 py-1">
            Enterprise Tracker v2.0
          </Badge>
        </div>

        {/* Center Content: Headline & Sizable Vector Illustration */}
        <div className="relative z-10 my-auto py-2 w-full max-w-2xl xl:max-w-3xl mx-auto flex flex-col justify-center">
          <div className="mb-4 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
              Requirement <span className="text-[#00b0ef]">to Release.</span>
            </h1>
            <p className="mt-2 text-slate-300 text-xs sm:text-sm xl:text-base leading-relaxed max-w-xl">
              Real-time work lag calculation, automated weekly rollups, immutable audit trails,
              and executive gating for engineering delivery.
            </p>
          </div>

          {/* Sizable Vector Illustration Container */}
          <div className="bg-slate-900/70 backdrop-blur-md rounded-3xl p-5 sm:p-6 xl:p-7 border border-slate-800 shadow-2xl w-full mx-auto">
            <HeroIllustration className="w-full h-auto max-h-[380px] xl:max-h-[430px]" />
          </div>

          {/* Value Props Row */}
          <div className="grid grid-cols-3 gap-3.5 mt-4 w-full">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[#00b0ef] mb-0.5">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">8 Stages</span>
              </div>
              <p className="text-xs text-slate-300">Formal sign-offs &amp; gating</p>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-amber-400 mb-0.5">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">&lt; 2 Mins</span>
              </div>
              <p className="text-xs text-slate-300">Fast weekly update filing</p>
            </div>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-0.5">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Audit Log</span>
              </div>
              <p className="text-xs text-slate-300">Immutable diffs &amp; history</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-3.5">
          <span>&copy; {new Date().getFullYear()} VKnow Labs.</span>
          <span>Timezone: Asia/Kolkata (IST)</span>
        </div>
      </div>

      {/* Right Column: Sign In Form (40% Width Split - Neat & Crisp) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 sm:p-10 xl:p-12 overflow-y-auto bg-white dark:bg-slate-950">
        <div className="w-full max-w-md space-y-6 my-auto">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-4">
              <VKnowLogo size="lg" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Sign in to manage projects, update deliverables, or review stage sign-offs
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-medium flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Corporate Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@vknowlabs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 text-sm sm:text-base rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <span className="text-xs font-semibold text-[#00b0ef]">
                  Default: password123
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 text-sm sm:text-base rounded-xl"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-bold bg-[#00b0ef] hover:bg-[#009ad4] text-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Demo User Quick Fill Chips */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00b0ef]" />
              <span>1-Click Test Accounts</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => quickFill("admin@vknowlabs.com")}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Madheswaran
                  </span>
                  <Badge variant="cyan" className="text-[10px] px-1.5 py-0 font-bold">
                    Admin
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 truncate">admin@vknowlabs.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("sarah.lead@vknowlabs.com")}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Sarah Jenkins
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                    Lead
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 truncate">sarah.lead@vknowlabs.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("alex.dev@vknowlabs.com")}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Alex Rivera
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                    PWA Dev
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 truncate">alex.dev@vknowlabs.com</div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("rohit.qa@vknowlabs.com")}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#00b0ef] dark:hover:border-[#00b0ef] bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Rohit Verma
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                    QA
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 truncate">rohit.qa@vknowlabs.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
