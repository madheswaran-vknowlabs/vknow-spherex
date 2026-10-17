"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResolveDiscrepancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  discrepancy: {
    _id: string;
    type: string;
    severity: string;
    description: string;
    status: string;
    resolution?: string;
    projectId?: { name: string; code: string };
  } | null;
  onSuccess?: () => void;
}

export function ResolveDiscrepancyModal({
  isOpen,
  onClose,
  discrepancy,
  onSuccess,
}: ResolveDiscrepancyModalProps) {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<"In Review" | "Resolved" | "Closed">(
    discrepancy?.status === "Resolved" ? "Closed" : "Resolved"
  );
  const [resolution, setResolution] = useState(discrepancy?.resolution || "");
  const [errorMsg, setErrorMsg] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      if (!resolution.trim() || resolution.trim().length < 5) {
        throw new Error("Please enter a resolution description (minimum 5 characters)");
      }

      const res = await fetch(`/api/discrepancies/${discrepancy?._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          resolution: resolution.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update discrepancy status");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discrepancies"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to resolve discrepancy");
    },
  });

  if (!isOpen || !discrepancy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Resolve Discrepancy
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Update status and document root cause mitigation or sign-off.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Issue Summary Context */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {discrepancy.type} ({discrepancy.severity})
              </span>
              <span className="text-slate-500">{discrepancy.projectId?.name}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 italic">
              &quot;{discrepancy.description}&quot;
            </p>
          </div>

          {/* Target Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Resolution State *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["In Review", "Resolved", "Closed"] as const).map((s) => {
                const isSelected = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? "border-[#00b0ef] bg-[#00b0ef]/10 text-[#007ea8] dark:text-[#00b0ef] ring-1 ring-[#00b0ef]"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resolution Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Resolution Actions / Mitigation Details *
            </label>
            <textarea
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Explain how this issue was resolved, adjusted timeline, or scope consensus reached..."
              className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00b0ef]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/80 dark:bg-slate-900/80">
          <Button variant="outline" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {mutation.isPending ? "Saving..." : `Confirm ${status}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
