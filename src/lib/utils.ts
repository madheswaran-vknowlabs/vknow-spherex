import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(hours: number): string {
  if (!hours) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getHealthBadgeClass(health: "Green" | "Amber" | "Red" | string): string {
  switch (health) {
    case "Green":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    case "Amber":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
    case "Red":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
}

/**
 * Auto-generate an intuitive, clean, professional project code from a project name.
 * Examples:
 * - "SphereX" -> "SPHER"
 * - "SphereX AI" -> "SPH-AI"
 * - "SphereX AI Assistant" -> "SAA"
 * - "NextGen Microservices Platform" -> "NMP"
 * - "Customer Relationship Portal" -> "CRP"
 */
export function generateProjectCode(name: string): string {
  if (!name || !name.trim()) return "";
  
  // Clean special characters except alphanumerics, spaces, and hyphens
  const cleaned = name.replace(/[^a-zA-Z0-9\s-]/g, " ").trim();
  const words = cleaned.split(/[\s-]+/).filter(Boolean);
  
  if (words.length === 0) return "";
  
  if (words.length === 1) {
    const single = words[0].toUpperCase();
    return single.length <= 5 ? single : single.slice(0, 5);
  }
  
  if (words.length === 2) {
    const w1 = words[0].slice(0, 3).toUpperCase();
    const w2 = words[1].slice(0, 3).toUpperCase();
    return `${w1}-${w2}`;
  }
  
  // 3 or more words: take initials of each word up to 6 characters
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 6)
    .toUpperCase();
}

