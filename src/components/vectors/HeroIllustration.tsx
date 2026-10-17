import React from "react";

export function HeroIllustration({ className = "w-full h-auto max-w-md" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00b0ef" />
          <stop offset="100%" stopColor="#007ea8" />
        </linearGradient>
        <linearGradient id="cyanSoft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f6fd" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
        <filter id="shadowGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#00b0ef" floodOpacity="0.22" />
        </filter>
        <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.08" />
        </filter>
      </defs>

      {/* Background ambient orbs */}
      <circle cx="480" cy="120" r="90" fill="#00b0ef" fillOpacity="0.12" />
      <circle cx="120" cy="380" r="110" fill="#00b0ef" fillOpacity="0.08" />
      <path d="M50 240 Q 200 120 400 200 T 550 180" stroke="#00b0ef" strokeWidth="2" strokeDasharray="6 6" strokeOpacity="0.4" />

      {/* Main Dashboard Card */}
      <g filter="url(#cardShadow)">
        <rect x="70" y="60" width="460" height="340" rx="20" fill="url(#cardBg)" stroke="#e2e8f0" strokeWidth="1.5" />
        {/* Window controls */}
        <circle cx="102" cy="88" r="5" fill="#ef4444" />
        <circle cx="118" cy="88" r="5" fill="#f59e0b" />
        <circle cx="134" cy="88" r="5" fill="#10b981" />
        {/* Header bar */}
        <rect x="160" y="82" width="140" height="12" rx="6" fill="#e2e8f0" />
        <rect x="420" y="80" width="80" height="16" rx="8" fill="url(#cyanSoft)" />
        <circle cx="430" cy="88" r="3" fill="#00b0ef" />
        <rect x="440" y="85" width="50" height="6" rx="3" fill="#00b0ef" />
      </g>

      {/* Stage Flow Nodes */}
      <g transform="translate(100, 125)">
        {/* Stage 1 */}
        <rect x="0" y="0" width="90" height="42" rx="10" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
        <circle cx="16" cy="21" r="7" fill="#10b981" />
        <path d="M13 21 L15 23 L19 19" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="30" y="14" width="46" height="6" rx="3" fill="#334155" />
        <rect x="30" y="24" width="30" height="4" rx="2" fill="#94a3b8" />

        {/* Connector 1 */}
        <line x1="90" y1="21" x2="115" y2="21" stroke="#10b981" strokeWidth="2" />

        {/* Stage 2 */}
        <rect x="115" y="0" width="90" height="42" rx="10" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
        <circle cx="131" cy="21" r="7" fill="#10b981" />
        <path d="M128 21 L130 23 L134 19" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="145" y="14" width="46" height="6" rx="3" fill="#334155" />
        <rect x="145" y="24" width="30" height="4" rx="2" fill="#94a3b8" />

        {/* Connector 2 */}
        <line x1="205" y1="21" x2="230" y2="21" stroke="#00b0ef" strokeWidth="2" strokeDasharray="3 3" />

        {/* Stage 3 (Active) */}
        <rect x="230" y="-4" width="105" height="50" rx="12" fill="url(#cyanSoft)" stroke="#00b0ef" strokeWidth="2" filter="url(#shadowGlow)" />
        <circle cx="248" cy="21" r="8" fill="#00b0ef" />
        <circle cx="248" cy="21" r="4" fill="#ffffff" />
        <rect x="264" y="14" width="55" height="7" rx="3.5" fill="#007ea8" />
        <rect x="264" y="25" width="38" height="5" rx="2.5" fill="#00b0ef" />

        {/* Connector 3 */}
        <line x1="335" y1="21" x2="355" y2="21" stroke="#cbd5e1" strokeWidth="2" />

        {/* Stage 4 (Upcoming) */}
        <rect x="355" y="0" width="50" height="42" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx="370" cy="21" r="6" fill="#cbd5e1" />
        <rect x="382" y="18" width="16" height="6" rx="3" fill="#cbd5e1" />
      </g>

      {/* Metrics Row */}
      <g transform="translate(100, 195)">
        {/* Metric 1: Health On Track */}
        <rect x="0" y="0" width="115" height="65" rx="12" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
        <rect x="14" y="14" width="40" height="6" rx="3" fill="#15803d" />
        <text x="14" y="44" fontFamily="sans-serif" fontSize="18" fontWeight="bold" fill="#166534">94.2%</text>
        <circle cx="95" cy="22" r="10" fill="#dcfce7" />
        <path d="M92 22 L94 24 L98 20" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />

        {/* Metric 2: Work Lag Engine */}
        <rect x="125" y="0" width="125" height="65" rx="12" fill="url(#cyanSoft)" stroke="#00b0ef" strokeWidth="1.5" />
        <rect x="139" y="14" width="45" height="6" rx="3" fill="#007ea8" />
        <text x="139" y="44" fontFamily="sans-serif" fontSize="18" fontWeight="bold" fill="#007ea8">0.4d Lag</text>
        <circle cx="230" cy="22" r="10" fill="#bae6fd" />
        <path d="M230 17 L230 22 L234 24" stroke="#007ea8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Metric 3: Weekly Compliance */}
        <rect x="260" y="0" width="140" height="65" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
        <rect x="274" y="14" width="55" height="6" rx="3" fill="#475569" />
        <text x="274" y="44" fontFamily="sans-serif" fontSize="18" fontWeight="bold" fill="#0f172a">100%</text>
        <text x="325" y="44" fontFamily="sans-serif" fontSize="11" fill="#64748b">Filed</text>
      </g>

      {/* Floating Team & Task Card */}
      <g filter="url(#shadowGlow)" transform="translate(180, 280)">
        <rect x="0" y="0" width="310" height="100" rx="16" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
        <rect x="20" y="18" width="160" height="8" rx="4" fill="#0f172a" />
        <rect x="20" y="32" width="110" height="6" rx="3" fill="#94a3b8" />
        
        {/* Progress Bar with #00B0EF */}
        <rect x="20" y="52" width="270" height="8" rx="4" fill="#e2e8f0" />
        <rect x="20" y="52" width="200" height="8" rx="4" fill="url(#cyanGrad)" />
        
        {/* Avatars */}
        <circle cx="32" cy="78" r="10" fill="#00b0ef" />
        <circle cx="48" cy="78" r="10" fill="#585858" />
        <circle cx="64" cy="78" r="10" fill="#10b981" />
        <text x="82" y="82" fontFamily="sans-serif" fontSize="11" fontWeight="600" fill="#64748b">+4 members</text>

        <rect x="215" y="68" width="75" height="20" rx="10" fill="#10b981" fillOpacity="0.15" />
        <text x="232" y="82" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#166534">On Track</text>
      </g>
    </svg>
  );
}
