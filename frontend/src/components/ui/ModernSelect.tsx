"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
}

interface ModernSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  triggerClassName?: string
  id?: string
  name?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export function ModernSelect({
  value,
  onChange,
  options,
  className = "",
  triggerClassName = "w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-100",
  id,
  name,
  required,
  disabled,
  placeholder = "-- Pilih --"
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => String(opt.value) === String(value))

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input type="hidden" name={name} id={id} value={value} required={required} />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${triggerClassName} ${isOpen ? '!bg-white !ring-2 !ring-emerald-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`${selectedOption ? 'text-current' : 'text-slate-500'} truncate mr-2`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : 'text-slate-400'}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-2 w-full min-w-max rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                String(value) === String(option.value)
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="truncate pr-4">{option.label}</span>
              {String(value) === String(option.value) && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}