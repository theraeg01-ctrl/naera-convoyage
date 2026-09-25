"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { isFocusedScreen } from "./navigation";

/**
 * Barre d'identité mobile : même marque NAERA partout, nom de l'espace
 * explicite. Masquée sur les écrans « focus » (saisie, fiche mission).
 */
export function PortalTopBar({ home, label }: { home: string; label: string }) {
  const pathname = usePathname();
  if (isFocusedScreen(pathname)) return null;
  return (
    <div className="mb-5 flex items-center justify-between lg:hidden">
      <Link href={home} className="flex items-center gap-2" aria-label={`NAERA — ${label}`}>
        <LogoMark className="size-7" />
        <span className="text-[13px] font-bold tracking-[0.26em]">NAERA</span>
      </Link>
      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">{label}</span>
    </div>
  );
}
