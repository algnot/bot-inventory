"use client";

import { KEYWORD_COLORS, KEYWORDS, keywordImageUrl } from "@/lib/keywords";
import { symbolImageUrl } from "@/lib/image";

type Part =
  | { type: "text"; text: string }
  | { type: "keyword"; text: string }
  | { type: "symbol"; text: string }
  | { type: "mark"; text: string };

const MARKS: Record<string, string> = {
  mod: "Mod",
  magic: "Magic",
  react: "React",
  land: "Land",
  only: "Only",
};

function tokenize(input: string): Part[] {
  const pattern =
    /(\{symbol\s+[^}]+\}|\{mod\}|\{magic\}|\{react\}|\{land\}|\{only\}|\{[^}]+\}|\[[^\]]+\])/gi;
  const parts: Part[] = [];
  let last = 0;
  for (const match of input.matchAll(pattern)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push({ type: "text", text: input.slice(last, idx) });
    const raw = match[0];
    const inner = raw.slice(1, -1);
    const symbolMatch = inner.match(/^symbol\s+(.+)$/i);
    if (symbolMatch) {
      parts.push({ type: "symbol", text: symbolMatch[1].trim() });
    } else if (MARKS[inner.toLowerCase()]) {
      parts.push({ type: "mark", text: MARKS[inner.toLowerCase()] });
    } else if (KEYWORDS.includes(inner) || KEYWORD_COLORS[inner]) {
      parts.push({ type: "keyword", text: inner });
    } else if (KEYWORDS.includes(inner.replace(/^Symbol\s+/i, ""))) {
      parts.push({ type: "keyword", text: inner });
    } else {
      parts.push({ type: "text", text: raw });
    }
    last = idx + raw.length;
  }
  if (last < input.length) parts.push({ type: "text", text: input.slice(last) });
  return parts.flatMap((part) =>
    part.type === "text" ? splitKeywords(part.text) : [part],
  );
}

function splitKeywords(text: string): Part[] {
  if (!text) return [];
  const re = new RegExp(`(${KEYWORDS.map(escapeRe).join("|")})`, "g");
  const parts: Part[] = [];
  let last = 0;
  for (const match of text.matchAll(re)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push({ type: "text", text: text.slice(last, idx) });
    parts.push({ type: "keyword", text: match[0] });
    last = idx + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts.length ? parts : [{ type: "text", text }];
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function colorClass(color: string) {
  if (color === "blue") return "text-blue-700";
  if (color === "red") return "text-bot-red";
  if (color === "green") return "text-emerald-700";
  return "text-violet-700";
}

export function EffectText({
  text,
  hashtagText,
}: {
  text: string;
  hashtagText?: string;
}) {
  const body = hashtagText ? `${text}\n\n#${hashtagText}` : text;
  const lines = body.split("\n");

  return (
    <div className="space-y-1 text-[15px] leading-relaxed">
      {lines.map((line, i) => (
        <p key={`${i}-${line.slice(0, 12)}`} className={line.startsWith("#") ? "text-right text-sm text-muted" : ""}>
          {tokenize(line).map((part, j) => {
            if (part.type === "text") return <span key={j}>{part.text}</span>;
            if (part.type === "symbol") {
              const src = symbolImageUrl(part.text);
              return (
                <span key={j} className="inline-flex items-center gap-1 font-bold">
                  {src && (
                    <img src={src} alt="" className="inline h-5 w-5 object-contain" />
                  )}
                  {part.text}
                </span>
              );
            }
            if (part.type === "mark") {
              return (
                <span
                  key={j}
                  className="mx-0.5 inline-flex rounded border border-ink px-1 text-xs font-bold"
                >
                  {part.text}
                </span>
              );
            }
            const color = KEYWORD_COLORS[part.text] ?? "purple";
            const src = keywordImageUrl(part.text);
            return (
              <span
                key={j}
                className={`inline-flex items-center gap-1 font-extrabold ${colorClass(color)}`}
              >
                {src && (
                  <img src={src} alt="" className="inline h-5 w-auto object-contain" />
                )}
                {part.text}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
