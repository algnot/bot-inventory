"use client";

function pageWindow(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 3);
    pages.add(total - 2);
    pages.add(total - 1);
  }
  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const items = pageWindow(page, totalPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="หน้า">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="ก่อนหน้า"
        className="h-10 rounded-xl border-2 border-ink bg-white px-2 text-sm font-bold disabled:opacity-40 sm:px-3"
      >
        <span className="sm:hidden">‹</span>
        <span className="hidden sm:inline">ก่อนหน้า</span>
      </button>
      {items.map((item, index) => {
        const prev = items[index - 1];
        const gap = prev && item - prev > 1;
        return (
          <span key={item} className="flex items-center gap-1">
            {gap && <span className="px-1 font-bold text-muted">…</span>}
            <button
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={`h-10 min-w-9 rounded-xl border-2 border-ink px-2 text-sm font-bold sm:min-w-10 sm:px-3 ${
                item === page ? "bg-ink text-cream" : "bg-white"
              }`}
            >
              {item}
            </button>
          </span>
        );
      })}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="ถัดไป"
        className="h-10 rounded-xl border-2 border-ink bg-white px-2 text-sm font-bold disabled:opacity-40 sm:px-3"
      >
        <span className="sm:hidden">›</span>
        <span className="hidden sm:inline">ถัดไป</span>
      </button>
    </nav>
  );
}
