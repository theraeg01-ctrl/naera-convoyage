"use client";

import { Home, ListChecks, Plus, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { ThemeToggle } from "./theme";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/missions", label: "Missions", icon: ListChecks },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Écrans « focus » (saisie, détail) : pas de barre d'onglets, ils ont leur propre barre d'action. */
export function isFocusedScreen(pathname: string) {
  return pathname.startsWith("/missions/");
}

export function BottomNav() {
  const pathname = usePathname();
  if (isFocusedScreen(pathname)) return null;
  const [home, missions, settings] = NAV_ITEMS;
  const tab = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-colors",
          active ? "text-foreground" : "text-faint hover:text-muted",
        )}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden />
        {item.label}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Navigation principale"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-center gap-1 px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tab(home)}
        {tab(missions)}
        <Link
          href="/missions/new"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-foreground"
        >
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-float">
            <Plus className="size-6" strokeWidth={2.4} aria-hidden />
          </span>
          Nouvelle
        </Link>
        {tab(settings)}
      </div>
    </nav>
  );
}

export function Sidebar({ storageLabel }: { storageLabel: string }) {
  const pathname = usePathname();
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <Link href="/" className="px-2" aria-label="NAERA Convoyage — accueil">
        <Logo />
      </Link>
      <Link
        href="/missions/new"
        className={cn(buttonVariants({ variant: "primary", size: "md", block: true }), "mt-8")}
      >
        <Plus aria-hidden />
        Nouvelle mission
      </Link>
      <nav aria-label="Navigation principale" className="mt-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href) && !(item.href === "/missions" && pathname === "/missions/new");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-4">
        <p className="px-2 text-xs text-faint">{storageLabel}</p>
        <ThemeToggle name="theme-sidebar" compact />
      </div>
    </aside>
  );
}
