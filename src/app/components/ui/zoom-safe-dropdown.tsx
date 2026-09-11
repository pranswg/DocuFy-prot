import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * Zoom-safe dropdown using CSS absolute positioning (no Radix portal).
 *
 * Radix Select's floating-ui popper mis-measures under CSS `zoom` on <html>,
 * so this replaces portaled selects with a plain anchored list.
 */
export function ZoomSafeDropdown({
  value,
  onChange,
  options,
  placeholder = "Select",
  icon: Icon,
  className = "",
  triggerClassName = "",
  disabled = false,
}: {
  value?: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode; disabled?: boolean }[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-blue-300 hover:border-[#2F6FD6] focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <span className="shrink-0">{Icon}</span>}
          <span className="truncate text-gray-800">
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform${open ? " rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[10rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="py-1 max-h-60 overflow-auto">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange?.(o.value);
                    setOpen(false);
                  }}
                  disabled={o.disabled}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50${o.disabled ? " cursor-not-allowed opacity-50 hover:bg-transparent" : ""}${o.value === value ? " font-medium text-[#2F6FD6]" : " text-gray-700"}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {o.icon && <span className="shrink-0">{o.icon}</span>}
                    {o.label}
                  </span>
                  {o.value === value && <Check className="h-4 w-4 shrink-0 text-[#2F6FD6]" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Action dropdown — no controlled value, fires onSelect only.
 * Useful for "pick to insert" actions (e.g. note templates).
 */
export function ZoomSafeActionDropdown({
  onSelect,
  options,
  placeholder = "Select",
  icon,
  className = "",
  triggerClassName = "",
  disabled = false,
}: {
  onSelect: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-blue-300 hover:border-[#2F6FD6] focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate text-gray-800">{placeholder}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform${open ? " rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[10rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="py-1 max-h-60 overflow-auto">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(o.value);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
