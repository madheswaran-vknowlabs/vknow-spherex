import React from "react";

export function EmptyStateIllustration({ className = "w-48 h-48 mx-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="emptyCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00b0ef" />
          <stop offset="100%" stopColor="#007ea8" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="85" fill="#f0f9ff" />
      <circle cx="120" cy="120" r="65" fill="#e0f6fd" />
      {/* Clipboard / Folder */}
      <rect x="75" y="65" width="90" height="110" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="95" y="55" width="50" height="18" rx="6" fill="url(#emptyCyan)" />
      <circle cx="120" cy="64" r="3" fill="#ffffff" />
      
      {/* Content lines */}
      <rect x="92" y="90" width="56" height="6" rx="3" fill="#00b0ef" fillOpacity="0.8" />
      <rect x="92" y="106" width="40" height="5" rx="2.5" fill="#94a3b8" />
      <rect x="92" y="120" width="48" height="5" rx="2.5" fill="#cbd5e1" />
      
      {/* Floating Sparkle / Check */}
      <circle cx="160" cy="155" r="18" fill="url(#emptyCyan)" />
      <path d="M153 155 L158 160 L168 150" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
