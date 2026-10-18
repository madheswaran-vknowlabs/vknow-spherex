"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search, LucideIcon, X } from "lucide-react";

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
  fullWidth?: boolean;
  searchable?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
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
  fullWidth = false,
  searchable = false,
  size = "md",
  disabled = false,
}: CoolDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Filter options if searchable
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const sizeClasses =
    size === "sm"
      ? "h-8 px-2.5 text-xs rounded-lg"
      : "h-9 px-3 text-xs sm:text-sm rounded-xl";

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "inline-block"} text-left ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`group ${
          fullWidth ? "w-full" : ""
        } flex items-center justify-between gap-2 border font-medium transition-all duration-200 cursor-pointer select-none ${sizeClasses} ${
          isOpen
            ? "bg-white dark:bg-slate-900 border-[#00b0ef] ring-2 ring-[#00b0ef]/20 shadow-md text-slate-950 dark:text-white"
            : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 hover:border-[#00b0ef]/70 text-slate-800 dark:text-slate-200 shadow-2xs"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && (
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-[#00b0ef]/10 text-[#00b0ef] shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
          {label && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              {label}:
            </span>
          )}
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="hidden sm:inline-flex px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-[#00b0ef]/10 text-[#00b0ef] shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-[#00b0ef]" : "group-hover:text-slate-600"
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 mt-1.5 z-50 ${
            fullWidth ? "w-full" : minWidth
          } max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-1 transition-all animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Search box if enabled or if many options */}
          {(searchable || options.length > 7) && (
            <div className="p-1 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
              <input
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-transparent border-none outline-hidden px-1.5 py-1 text-slate-900 dark:text-white placeholder:text-slate-400"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/40 p-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                const OptIcon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left text-xs font-medium transition-colors my-0.5 cursor-pointer ${
                      isSelected
                        ? "bg-[#00b0ef]/10 text-[#007ea8] dark:text-[#00b0ef] font-bold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {OptIcon && (
                        <OptIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? "text-[#00b0ef]" : "text-slate-400"
                          }`}
                        />
                      )}
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{option.label}</span>
                          {option.badge && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        {option.sublabel && (
                          <div className="text-[10px] text-slate-400 truncate font-normal">
                            {option.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#00b0ef] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
