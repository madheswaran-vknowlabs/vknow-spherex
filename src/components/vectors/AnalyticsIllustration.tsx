import React from "react";

export function AnalyticsIllustration({ className = "w-48 h-48 mx-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="anCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00b0ef" />
          <stop offset="100%" stopColor="#007ea8" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="90" fill="#f0f9ff" />
      <circle cx="120" cy="120" r="70" fill="#e0f6fd" fillOpacity="0.6" />

      {/* Chart bars */}
      <rect x="65" y="130" width="22" height="45" rx="6" fill="#cbd5e1" />
      <rect x="95" y="105" width="22" height="70" rx="6" fill="#585858" />
      <rect x="125" y="80" width="22" height="95" rx="6" fill="url(#anCyan)" />
      <rect x="155" y="60" width="22" height="115" rx="6" fill="#10b981" />

      {/* Trend line */}
      <path d="M76 125 Q 106 95 136 75 T 166 52" stroke="#00b0ef" strokeWidth="3" strokeLinecap="round" />
      <circle cx="166" cy="52" r="5" fill="#ffffff" stroke="#00b0ef" strokeWidth="3" />
    </svg>
  );
}
