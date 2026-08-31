"use client";

import { useEffect, useRef, useState } from "react";

export type FilterOption = {
  value: string;
  label: string;
};

export function MultiFilter({
  label,
  allLabel,
  options,
  selected,
  onChange,
  searchable = false,
  compact = false,
  menuAlign = "start",
}: {
  label: string;
  allLabel: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  compact?: boolean;
  menuAlign?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = query.trim()
    ? options.filter((option) =>
        `${option.label} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((option) => option.value === selected[0])?.label ?? selected[0])
        : `${label} ${selected.length} รายการ`;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-1 rounded-xl border-2 border-ink bg-white px-2 text-left font-semibold sm:gap-2 sm:px-3 ${
          compact ? "h-10 text-xs sm:text-sm" : "h-12"
        }`}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-1">
          {selected.length > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-black text-cream">
              {selected.length}
            </span>
          )}
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            aria-hidden
          >
            <path
              d="M5 7.5 10 12.5 15 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 overflow-hidden rounded-2xl border-2 border-ink bg-cream ${
            compact
              ? `${menuAlign === "end" ? "right-0" : "left-0"} w-max min-w-full max-w-[min(18rem,calc(100vw-1.5rem))]`
              : "w-full"
          }`}
        >
          {searchable && (
            <div className="border-b-2 border-ink p-2">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`ค้นหา${label}...`}
                className="h-10 w-full rounded-lg border-2 border-ink bg-white px-3 text-sm outline-none"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-bold ${
                selected.length === 0 ? "bg-ink text-cream" : "hover:bg-white"
              }`}
            >
              {allLabel}
            </button>
            {visible.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => toggle(option.value)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${
                    checked ? "bg-white font-bold" : "hover:bg-white/70"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-ink ${
                      checked ? "bg-ink text-cream" : "bg-white"
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden>
                        <path
                          d="M3.5 8.5 6.5 11.5 12.5 4.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 truncate">{option.label}</span>
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className="px-2 py-3 text-sm text-muted">ไม่พบรายการ</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
