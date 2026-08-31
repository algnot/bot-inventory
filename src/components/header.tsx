"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SyncButton } from "./sync-button";

const NAV = [
  { href: "/", label: "ค้นหาของฉัน", short: "ค้นหา" },
  { href: "/boxes", label: "กล่อง", short: "กล่อง" },
  { href: "/people", label: "เจ้าของ", short: "เจ้าของ" },
  { href: "/catalog", label: "การ์ดทั้งหมด", short: "การ์ด" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b-4 border-ink bg-ink text-cream pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-3 sm:px-4 md:flex-row md:items-center md:gap-4">
        <Link href="/" className="shrink-0 leading-tight">
          <div className="text-[10px] font-medium tracking-wide text-gold sm:text-[11px]">
            BATTLE OF TALINGCHAN
          </div>
          <div className="text-base font-extrabold sm:text-lg">BOT Inventory</div>
        </Link>
        <nav className="flex flex-wrap items-center gap-1.5 md:ml-auto">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border-2 px-2.5 py-1 text-xs font-semibold whitespace-nowrap sm:px-3 sm:text-sm ${
                  active
                    ? "border-cream bg-cream text-ink"
                    : "border-transparent text-cream/80 hover:border-cream/40"
                }`}
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <SyncButton />
        </nav>
      </div>
    </header>
  );
}
