import { displayRare } from "@/lib/image";

const STYLES: Record<string, string> = {
  C: "bg-[#6b6b6b] text-white",
  R: "bg-[#2563eb] text-white",
  SR: "bg-[#7c3aed] text-white",
  UR: "bg-[#e3b341] text-ink",
  SCR: "bg-[#dc2626] text-white",
  SEC: "bg-[#dc2626] text-white",
  PR: "bg-white text-ink",
  CBR: "bg-[#B0916E] text-white",
  USEC: "bg-ink text-bot-red",
};

export function RarityBadge({
  rare,
  compact = false,
}: {
  rare: string;
  compact?: boolean;
}) {
  const label = displayRare(rare);
  const style = STYLES[rare] ?? STYLES[label] ?? "bg-ink text-cream";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink font-black ${
        compact
          ? "min-w-7 px-1 py-0 text-[10px]"
          : "min-w-10 px-2 py-0.5 text-xs"
      } ${style}`}
    >
      {label}
    </span>
  );
}
