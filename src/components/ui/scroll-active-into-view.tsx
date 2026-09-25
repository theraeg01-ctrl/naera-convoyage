"use client";

import { useEffect, useRef } from "react";

/** Garde l'élément actif (aria-current) visible dans une rangée défilante. */
export function ScrollActiveIntoView({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
