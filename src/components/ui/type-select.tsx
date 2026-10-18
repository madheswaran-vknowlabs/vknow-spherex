"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X, Search } from "lucide-react";

export interface TypeSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: any;
}

export interface TypeSelectProps {
  id?: string;
  label?: string;
  icon?: any;
  value: string;
  onChange: (value: string) => void;
  options: TypeSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowCustom?: boolean;
  size?: "sm" | "md" | "lg";
}

export function TypeSelect({
  id,
  label,
  icon: HeaderIcon,
  value,
  onChange,
  options,
  placeholder = "Type or select...",
  className = "",
  disabled = false,
  required = false,
  allowCustom = false,
  size = "md",
}: TypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Find the selected option object
  const selectedOption = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)),
    [options, value]
  );

  // Sync display text with selected value when not actively typing
  useEffect(() => {
    if (!isFocused) {
      setQuery(selectedOption ? selectedOption.label : value || "");
    }
  }, [selectedOption, value, isFocused]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    // When displaying exactly the selected option's label, show all options so user sees full list
    if (selectedOption && query.trim().toLowerCase() === selectedOption.label.trim().toLowerCase()) {
      return options;
    }
    const q = query.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSublabel = opt.sublabel?.toLowerCase().includes(q);
      const matchValue = String(opt.value).toLowerCase().includes(q);
      return matchLabel || matchSublabel || matchValue;
    });
  }, [options, query, selectedOption]);

  // Set highlighted index to selected option when opening or updating list
  useEffect(() => {
    if (isOpen) {
      const selectedIdx = filteredOptions.findIndex(
        (opt) => String(opt.value) === String(value)
      );
      if (selectedIdx !== -1) {
        setHighlightedIndex(selectedIdx);
      } else {
        setHighlightedIndex(0);
      }
    }
  }, [isOpen, value, filteredOptions]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        // Reset query to selected label if query wasn't committed
        setQuery(selectedOption ? selectedOption.label : value || "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption, value]);

  const handleSelect = (option: TypeSelectOption) => {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (allowCustom && query.trim()) {
        onChange(query.trim());
        setIsOpen(false);
        setIsFocused(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setIsFocused(false);
      setQuery(selectedOption ? selectedOption.label : value || "");
      inputRef.current?.blur();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const heightClass = size === "sm" ? "h-9" : size === "lg" ? "h-12" : "h-11";
  const fontSizeClass = size === "sm" ? "text-xs" : "text-xs sm:text-sm";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Label above */}
      {label && (
        <label
          htmlFor={id}
          className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5 select-none"
        >
          {HeaderIcon && <HeaderIcon className="w-3.5 h-3.5 text-[#00b0ef]" />}
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input container */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={`group relative flex items-center w-full ${heightClass} px-3 rounded-2xl border transition-all duration-200 cursor-text bg-white dark:bg-slate-900 ${
          isOpen
            ? "border-[#00b0ef] ring-2 ring-[#00b0ef]/20 shadow-md"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800" : ""}`}
      >
        {/* Selected Option's Custom Icon (if any) */}
        {selectedOption?.icon && !isOpen && (
          <div className="mr-2 shrink-0 text-[#00b0ef]">
            {typeof selectedOption.icon === "string" ? (
              <span className="text-base">{selectedOption.icon}</span>
            ) : (
              <selectedOption.icon className="w-4 h-4" />
            )}
          </div>
        )}

        {/* Search / Typeable Input Field */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
            // Select text on click for immediate typing replacement
            setTimeout(() => inputRef.current?.select(), 50);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent border-none outline-hidden font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${fontSizeClass}`}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Clear Button (when value exists and not disabled) */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1 cursor-pointer"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Chevron Dropdown Toggle */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }
          }}
          className="p-1 rounded-full text-slate-400 hover:text-[#00b0ef] transition-colors cursor-pointer shrink-0"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#00b0ef]" : ""
            }`}
          />
        </button>
      </div>

      {/* Floating Dropdown Options Menu */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[240px] max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {filteredOptions.length === 0 ? (
            <div className="py-5 px-3 text-center text-xs text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
              <span>No matching options for &quot;{query}&quot;</span>
              {allowCustom && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(query.trim());
                    setIsOpen(false);
                    setIsFocused(false);
                  }}
                  className="block mx-auto mt-2 text-xs font-bold text-[#00b0ef] hover:underline cursor-pointer"
                >
                  Use &quot;{query.trim()}&quot; as custom value
                </button>
              )}
            </div>
          ) : (
            filteredOptions.map((option, idx) => {
              const isSelected = String(option.value) === String(value);
              const isHighlighted = idx === highlightedIndex;
              const OptIcon = option.icon;

              return (
                <div
                  key={`${option.value}-${idx}`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(option)}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors select-none ${
                    isSelected
                      ? "bg-[#00b0ef]/10 text-[#007ea8] dark:text-[#00b0ef] font-bold"
                      : isHighlighted
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {OptIcon && (
                      <span className="shrink-0 text-[#00b0ef]">
                        {typeof OptIcon === "string" ? (
                          <span className="text-sm">{OptIcon}</span>
                        ) : (
                          <OptIcon className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}

                    <div className="truncate">
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.sublabel && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-normal">
                          {option.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-[#00b0ef] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
export default TypeSelect;
