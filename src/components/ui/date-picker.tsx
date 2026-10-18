"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from "lucide-react";
import { format, parse, isValid, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday } from "date-fns";

interface DatePickerProps {
  value?: string | Date | null;
  onChange: (dateStr: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  label,
  required = false,
  className = "",
  minDate,
  maxDate,
  disabled = false,
}: DatePickerProps) {
  // Format initial value to YYYY-MM-DD
  const formatToString = (val: string | Date | null | undefined): string => {
    if (!val) return "";
    if (typeof val === "string") {
      // Check if already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
      const parsed = new Date(val);
      if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
      return val;
    }
    if (val instanceof Date && isValid(val)) {
      return format(val, "yyyy-MM-dd");
    }
    return "";
  };

  const initialStr = formatToString(value);
  const [inputValue, setInputValue] = useState(initialStr);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month currently viewed in calendar
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (initialStr) {
      const d = parse(initialStr, "yyyy-MM-dd", new Date());
      if (isValid(d)) return d;
    }
    return new Date();
  });

  // Keep internal input value in sync when prop changes externally
  useEffect(() => {
    const nextStr = formatToString(value);
    setInputValue(nextStr);
    if (nextStr) {
      const d = parse(nextStr, "yyyy-MM-dd", new Date());
      if (isValid(d)) setCurrentMonth(d);
    }
  }, [value]);

  // Outside click closes calendar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle manual keyboard input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // If matches YYYY-MM-DD and is valid date, fire onChange
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const parsed = parse(val, "yyyy-MM-dd", new Date());
      if (isValid(parsed)) {
        onChange(val);
        setCurrentMonth(parsed);
      }
    } else if (val === "") {
      onChange("");
    }
  };

  const handleSelectDate = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    setInputValue(formatted);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleApplyPreset = (daysToAdd: number) => {
    const target = daysToAdd === 0 ? new Date() : addDays(new Date(), daysToAdd);
    handleSelectDate(target);
  };

  // Calendar matrix calculation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const selectedDate = inputValue ? parse(inputValue, "yyyy-MM-dd", new Date()) : null;
  const isDateSelectedValid = selectedDate && isValid(selectedDate);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input Row: Manual typing + Calendar Button */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full h-9 pl-3 pr-10 rounded-xl border text-xs font-medium transition-all ${
            isOpen
              ? "border-[#00b0ef] ring-2 ring-[#00b0ef]/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}`}
        />

        {/* Clear or Calendar Trigger */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={() => {
                setInputValue("");
                onChange("");
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-[#00b0ef] hover:bg-[#e0f6fd] dark:hover:bg-[#00b0ef]/10 rounded-lg transition-colors cursor-pointer"
            title="Open Calendar"
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 w-72 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Presets Bar */}
          <div className="flex items-center gap-1 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleApplyPreset(0)}
              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-[#00b0ef] hover:text-white dark:bg-slate-800 dark:hover:bg-[#00b0ef] text-slate-700 dark:text-slate-300 transition-colors shrink-0"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(7)}
              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-[#00b0ef] hover:text-white dark:bg-slate-800 dark:hover:bg-[#00b0ef] text-slate-700 dark:text-slate-300 transition-colors shrink-0"
            >
              +1 Wk
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(14)}
              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-[#00b0ef] hover:text-white dark:bg-slate-800 dark:hover:bg-[#00b0ef] text-slate-700 dark:text-slate-300 transition-colors shrink-0"
            >
              +2 Wks
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(30)}
              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-[#00b0ef] hover:text-white dark:bg-slate-800 dark:hover:bg-[#00b0ef] text-slate-700 dark:text-slate-300 transition-colors shrink-0"
            >
              +1 Mo
            </button>
          </div>

          {/* Month / Year Navigator */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setCurrentMonth(addDays(monthStart, -1))}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {format(currentMonth, "MMMM yyyy")}
            </span>

            <button
              type="button"
              onClick={() => setCurrentMonth(addDays(monthEnd, 1))}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, idx) => {
              const isSelected = isDateSelectedValid && isSameDay(d, selectedDate!);
              const inCurrentMonth = isSameMonth(d, monthStart);
              const isCurrentDay = isToday(d);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(d)}
                  className={`h-7 w-7 rounded-lg text-[11px] font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#00b0ef] text-white shadow-xs font-bold ring-2 ring-[#00b0ef]/30"
                      : isCurrentDay
                      ? "border border-[#00b0ef] text-[#00b0ef] bg-[#e0f6fd]/50 dark:bg-[#00b0ef]/10"
                      : inCurrentMonth
                      ? "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      : "text-slate-300 dark:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {format(d, "d")}
                </button>
              );
            })}
          </div>

          {/* Manual Entry Tip */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Manual format: YYYY-MM-DD</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#00b0ef] font-bold hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
