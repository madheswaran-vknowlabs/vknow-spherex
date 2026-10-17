import React from "react";
import Image from "next/image";

interface VKnowLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "default" | "light";
}

export function VKnowLogo({
  className = "",
  size = "md",
  showText = true,
  variant = "default",
}: VKnowLogoProps) {
  const dimensions = {
    sm: { width: 28, height: 28, text: "text-lg", sub: "text-[10px]" },
    md: { width: 36, height: 36, text: "text-xl", sub: "text-xs" },
    lg: { width: 48, height: 48, text: "text-2xl", sub: "text-sm" },
    xl: { width: 64, height: 64, text: "text-3xl", sub: "text-base" },
  }[size];

  const titleColor =
    variant === "light"
      ? "text-white"
      : "text-slate-900 dark:text-white";

  const subtitleColor =
    variant === "light"
      ? "text-slate-300"
      : "text-slate-500 dark:text-slate-400";

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative flex items-center justify-center p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <Image
          src="/logo.png"
          alt="VKnow Labs Logo"
          width={dimensions.width}
          height={dimensions.height}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-black tracking-tight ${dimensions.text} ${titleColor} flex items-center gap-1.5`}>
            VKnow <span className="text-[#00b0ef]">SphereX</span>
          </span>
          <span className={`font-semibold tracking-wider uppercase ${subtitleColor} ${dimensions.sub} mt-0.5`}>
            Lifecycle Tracker
          </span>
        </div>
      )}
    </div>
  );
}
