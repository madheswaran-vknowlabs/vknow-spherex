import React from "react";

export function HeroIllustration({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="50 30 540 430"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="brandCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00b0ef" />
          <stop offset="100%" stopColor="#007ea8" />
        </linearGradient>

        <linearGradient id="brandGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00b0ef" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00b0ef" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="cardGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.98" />
        </linearGradient>

        <linearGradient id="cardGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>

        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Filters */}
        <filter id="softShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#00b0ef" floodOpacity="0.25" />
        </filter>
        <filter id="darkCardShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Background Ambient Glows & Perspective Grid */}
      <circle cx="320" cy="240" r="180" fill="url(#brandGlow)" />
      <circle cx="520" cy="100" r="80" fill="#00b0ef" fillOpacity="0.1" />
      <circle cx="100" cy="380" r="100" fill="#00b0ef" fillOpacity="0.08" />

      {/* Perspective Geometric Grid Lines */}
      <g stroke="#334155" strokeWidth="1" strokeOpacity="0.3">
        <line x1="80" y1="420" x2="560" y2="420" />
        <line x1="120" y1="360" x2="520" y2="360" />
        <line x1="160" y1="300" x2="480" y2="300" />
        <line x1="320" y1="200" x2="80" y2="420" strokeDasharray="4 4" />
        <line x1="320" y1="200" x2="200" y2="420" strokeDasharray="4 4" />
        <line x1="320" y1="200" x2="440" y2="420" strokeDasharray="4 4" />
        <line x1="320" y1="200" x2="560" y2="420" strokeDasharray="4 4" />
      </g>

      {/* Main High-Tech Dashboard Board */}
      <g filter="url(#darkCardShadow)">
        <rect
          x="70"
          y="50"
          width="500"
          height="320"
          rx="24"
          fill="url(#cardGradDark)"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Dashboard Top Header Bar */}
        <rect x="70" y="50" width="500" height="44" rx="24" fill="#0f172a" />
        <line x1="70" y1="94" x2="570" y2="94" stroke="#1e293b" strokeWidth="1.5" />

        {/* Window Dots */}
        <circle cx="102" cy="72" r="5" fill="#ef4444" />
        <circle cx="118" cy="72" r="5" fill="#f59e0b" />
        <circle cx="134" cy="72" r="5" fill="#10b981" />

        {/* App Title Pill */}
        <rect x="160" y="62" width="160" height="20" rx="10" fill="#1e293b" />
        <circle cx="172" cy="72" r="3.5" fill="#00b0ef" />
        <rect x="184" y="69" width="70" height="6" rx="3" fill="#cbd5e1" />

        {/* Live Status Pill */}
        <rect x="450" y="62" width="100" height="20" rx="10" fill="#00b0ef" fillOpacity="0.15" />
        <circle cx="462" cy="72" r="3" fill="#00b0ef" />
        <rect x="472" y="69" width="65" height="6" rx="3" fill="#00b0ef" />
      </g>

      {/* 8-Stage Interactive Lifecycle Visual Pipeline */}
      <g transform="translate(100, 115)">
        {/* Pipeline Track */}
        <rect x="10" y="24" width="420" height="4" rx="2" fill="#1e293b" />
        <rect x="10" y="24" width="260" height="4" rx="2" fill="url(#brandCyan)" />

        {/* Node 1: Requirements (Completed) */}
        <circle cx="20" cy="26" r="14" fill="#10b981" />
        <path d="M16 26 L19 29 L25 23" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="4" y="46" width="32" height="5" rx="2.5" fill="#94a3b8" />

        {/* Node 2: Documentation (Completed) */}
        <circle cx="100" cy="26" r="14" fill="#10b981" />
        <path d="M96 26 L99 29 L105 23" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="84" y="46" width="32" height="5" rx="2.5" fill="#94a3b8" />

        {/* Node 3: Design (Completed) */}
        <circle cx="180" cy="26" r="14" fill="#10b981" />
        <path d="M176 26 L179 29 L185 23" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="164" y="46" width="32" height="5" rx="2.5" fill="#94a3b8" />

        {/* Node 4: Development (Active Pulsing Sphere) */}
        <circle cx="260" cy="26" r="20" fill="url(#brandCyan)" filter="url(#softShadow)" />
        <circle cx="260" cy="26" r="8" fill="#ffffff" />
        <circle cx="260" cy="26" r="4" fill="#007ea8" />
        <rect x="238" y="52" width="44" height="6" rx="3" fill="#00b0ef" />

        {/* Node 5: Testing (Upcoming) */}
        <circle cx="340" cy="26" r="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        <rect x="326" y="46" width="28" height="5" rx="2.5" fill="#475569" />

        {/* Node 6: Production Deployment */}
        <circle cx="410" cy="26" r="12" fill="#1e293b" stroke="#334155" strokeWidth="2" />
        <rect x="396" y="46" width="28" height="5" rx="2.5" fill="#334155" />
      </g>

      {/* Analytics Wave & Gantt Mini Chart inside Dashboard */}
      <g transform="translate(100, 205)">
        {/* Mini Chart Background Container */}
        <rect x="0" y="0" width="250" height="135" rx="16" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
        <text x="16" y="24" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#f8fafc">
          Delivery Velocity &amp; Lag Trend
        </text>

        {/* Grid lines */}
        <line x1="16" y1="50" x2="234" y2="50" stroke="#1e293b" />
        <line x1="16" y1="80" x2="234" y2="80" stroke="#1e293b" />
        <line x1="16" y1="110" x2="234" y2="110" stroke="#1e293b" />

        {/* Smooth Area Wave Curve */}
        <path
          d="M16 110 Q 50 85 90 95 T 160 55 T 234 40 L 234 125 L 16 125 Z"
          fill="url(#brandGlow)"
        />
        <path
          d="M16 110 Q 50 85 90 95 T 160 55 T 234 40"
          stroke="url(#brandCyan)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Pulse point at crest */}
        <circle cx="234" cy="40" r="5" fill="#00b0ef" />
        <circle cx="234" cy="40" r="2.5" fill="#ffffff" />
      </g>

      {/* Floating 3D KPI Badge 1: Health On Time */}
      <g filter="url(#darkCardShadow)" transform="translate(370, 205)">
        <rect x="0" y="0" width="180" height="62" rx="16" fill="#1e293b" stroke="#334155" strokeWidth="1.2" />
        <circle cx="26" cy="31" r="14" fill="#10b981" fillOpacity="0.2" />
        <path d="M21 31 L24 34 L31 27" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="50" y="26" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#94a3b8" style={{ textTransform: "uppercase" }}>
          Project Health
        </text>
        <text x="50" y="47" fontFamily="sans-serif" fontSize="16" fontWeight="900" fill="#10b981">
          100% On Time
        </text>
      </g>

      {/* Floating 3D KPI Badge 2: Work Lag Zero */}
      <g filter="url(#darkCardShadow)" transform="translate(370, 280)">
        <rect x="0" y="0" width="180" height="60" rx="16" fill="#1e293b" stroke="#334155" strokeWidth="1.2" />
        <circle cx="26" cy="30" r="14" fill="#00b0ef" fillOpacity="0.2" />
        <path d="M26 23 L26 30 L31 33" stroke="#00b0ef" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="50" y="25" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#94a3b8" style={{ textTransform: "uppercase" }}>
          Schedule Lag
        </text>
        <text x="50" y="46" fontFamily="sans-serif" fontSize="16" fontWeight="900" fill="#00b0ef">
          0.0 Days Lag
        </text>
      </g>

      {/* Floating Foreground Card: Active Deliverable & Team Members */}
      <g filter="url(#softShadow)" transform="translate(180, 360)">
        <rect
          x="0"
          y="0"
          width="320"
          height="88"
          rx="18"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1.5"
        />

        {/* Task Title & Status Pill */}
        <circle cx="26" cy="28" r="8" fill="#10b981" />
        <path d="M23 28 L25 30 L29 26" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        
        <text x="42" y="28" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#0f172a">
          Production Ready Sign-Off
        </text>

        <rect x="226" y="16" width="76" height="20" rx="10" fill="#e0f6fd" />
        <text x="240" y="30" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#007ea8">
          Stage Gate 6
        </text>

        {/* Horizontal Progress Bar */}
        <rect x="20" y="44" width="280" height="6" rx="3" fill="#f1f5f9" />
        <rect x="20" y="44" width="220" height="6" rx="3" fill="url(#brandCyan)" />

        {/* Team Avatar Stack */}
        <circle cx="32" cy="68" r="9" fill="#00b0ef" />
        <circle cx="46" cy="68" r="9" fill="#1e293b" />
        <circle cx="60" cy="68" r="9" fill="#10b981" />
        <text x="76" y="72" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill="#64748b">
          8 Active Engineers Assigned
        </text>
      </g>
    </svg>
  );
}
