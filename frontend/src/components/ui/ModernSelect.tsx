"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  icon?: ReactNode;
  description?: string;
}

export interface ModernSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  icon?: ReactNode;
  align?: "left" | "right";
  direction?: "auto" | "up" | "down";
  title?: string;
}

export function ModernSelect({
  value,
  onChange,
  options,
  className = "",
  triggerClassName,
  dropdownClassName = "",
  id,
  name,
  required,
  disabled,
  placeholder = "-- Pilih --",
  icon,
  align = "left",
  direction = "auto",
  title,
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(`modern-select-${Math.random().toString(36).slice(2, 9)}`);

  // Menutup dropdown ini jika dropdown ModernSelect lain dibuka (mencegah tabrakan / bentrok)
  useEffect(() => {
    const handleOtherOpened = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail !== instanceId.current) {
        setIsOpen(false);
      }
    };
    window.addEventListener("modern-select-opened", handleOtherOpened);
    return () => window.removeEventListener("modern-select-opened", handleOtherOpened);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleOpen = () => {
    if (disabled) return;
    const nextState = !isOpen;
    if (nextState && containerRef.current) {
      // Siarkan event ke ModernSelect lain agar menutup
      window.dispatchEvent(
        new CustomEvent("modern-select-opened", { detail: instanceId.current })
      );

      // Hitung ketersediaan ruang di atas vs di bawah
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (direction === "up") {
        setOpenUpwards(true);
      } else if (direction === "down") {
        setOpenUpwards(false);
      } else {
        // Otomatis: jika ruang bawah sempit (< 240px) dan ruang atas lebih lega, buka ke atas
        setOpenUpwards(spaceBelow < 240 && spaceAbove > spaceBelow);
      }
    }
    setIsOpen(nextState);
  };

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const defaultTriggerClass =
    "w-full rounded-xl bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 border border-slate-200 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div
      className={`relative inline-block ${isOpen ? "z-50" : "z-10"} ${className}`}
      ref={containerRef}
    >
      <input type="hidden" name={name} id={id} value={value} required={required} />

      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        title={title}
        className={`flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
          triggerClassName || defaultTriggerClass
        } ${isOpen ? "!border-emerald-500 !ring-2 !ring-emerald-500/20 shadow-xs" : ""} ${
          disabled ? "opacity-50 !cursor-not-allowed" : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className={`${selectedOption ? "text-slate-800 dark:text-slate-100" : "text-slate-400"} truncate`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-600" : "text-slate-400"
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className={`absolute z-[9999] min-w-full rounded-xl bg-white p-1 shadow-2xl ring-1 border border-slate-200/90 duration-150 max-h-60 overflow-y-auto ${
            openUpwards
              ? "bottom-full mb-1.5 animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
              : "top-full mt-1.5 animate-in fade-in zoom-in-95 slide-in-from-top-2"
          } ${align === "right" ? "right-0" : "left-0"} ${dropdownClassName}`}
        >
          {options.map((option) => {
            const isSelected = String(value) === String(option.value);
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(String(option.value));
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-700 font-bold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <div className="truncate">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span className="block text-[10px] text-slate-400 font-normal truncate">
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}