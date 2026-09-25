"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { isFocusedScreen } from "./navigation";

/**
 * Barre d'identité mobile : même marque NAERA partout, nom de l'espace en
 * retrait et, pour les comptes professionnels, le contexte compact
 * (« Garage Martin · Pro Plus »). Masquée sur les écrans « focus ».
 */
export function PortalTopBar({ home, label, context }: { home: string; label: string; context?: string | null }) {
  const pathname = usePathname();
  if (isFocusedScreen(pathname)) return null;
  return (
    <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
      <Link href={home} className="flex shrink-0 items-center gap-2" aria-label={`NAERA — ${label}`}>
        <LogoMark className="size-7" />
        <span className="text-[13px] font-bold tracking-[0.26em]">NAERA</span>
        <span className="border-l border-border pl-2 text-[11px] font-semibold tracking-[0.06em] text-faint uppercase">
          {label}
        </span>
      </Link>
      {context ? <span className="min-w-0 truncate text-[13px] font-medium text-muted">{context}</span> : null}
    </div>
  );
}
