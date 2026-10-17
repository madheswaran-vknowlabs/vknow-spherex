"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, LucideIcon } from "lucide-react";

export interface CoolDropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeVariant?: "default" | "cyan" | "emerald" | "amber" | "rose";
  icon?: LucideIcon;
}

interface CoolDropdownProps {
  label?: string;
  icon?: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  options: CoolDropdownOption[];
  placeholder?: string;
  className?: string;
  minWidth?: string;
}

export function CoolDropdown({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  minWidth = "min-w-[200px]",
}: CoolDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border cursor-pointer select-none ${
          isOpen
            ? "bg-white dark:bg-slate-900 border-[#00b0ef] ring-2 ring-[#00b0ef]/20 shadow-md text-slate-950 dark:text-white"
            : "bg-slate-50/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 hover:border-[#00b0ef]/60 text-slate-800 dark:text-slate-200 shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && (
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#00b0ef]/10 text-[#00b0ef] group-hover:scale-110 transition-transform">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          {label && (
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 group-hover:text-slate-500">
              {label}:
            </span>
          )}
          <span className="font-bold text-slate-900 dark:text-white truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-[#00b0ef]/10 text-[#00b0ef]">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-[#00b0ef]" : "group-hover:text-slate-600"
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 mt-2 z-50 ${minWidth} max-w-sm rounded-2xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden py-1.5 transition-all animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {options.map((option) => {
              const isSelected = option.value === value;
              const OptIcon = option.icon;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium transition-colors my-0.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#00b0ef]/10 text-[#007ea8] dark:text-[#00b0ef] font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {OptIcon && (
                      <OptIcon
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? "text-[#00b0ef]" : "text-slate-400"
                        }`}
                      />
                    )}
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.sublabel && (
                        <div className="text-[11px] text-slate-400 truncate font-normal">
                          {option.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#00b0ef] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
