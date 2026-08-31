"use client";

import { useState } from "react";
import { getCardImageUrl } from "@/lib/image";

export function CardImage({
  print,
  rare,
  name,
  className = "",
}: {
  print: string;
  rare: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = getCardImageUrl(print, rare);

  if (failed) {
    return (
      <div
        className={`flex aspect-[249/339] items-center justify-center bg-ink/5 px-2 text-center ${className}`}
      >
        <div>
          <p className="text-xs font-bold leading-snug">{name}</p>
          <p className="mt-1 text-[10px] text-muted">{print}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      className={`aspect-[249/339] w-full object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
