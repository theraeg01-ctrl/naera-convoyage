"use client";

import {
  BarChart3,
  Building2,
  CircleUserRound,
  FileText,
  Home,
  LayoutGrid,
  ListChecks,
  LogOut,
  Plus,
  Receipt,
  Repeat2,
  Settings,
  Truck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/actions/session";
import { Logo } from "@/components/brand/logo";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { buttonVariants } from "@/components/ui/button";
import { activeNavItem, type NavIcon, type NavItem } from "@/core/navigation/portal-navigation";
import { cn } from "@/utils/cn";
import { ThemeToggle } from "./theme";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  order: Plus,
  missions: ListChecks,
  plus: Plus,
  billing: Receipt,
  analytics: BarChart3,
  team: UsersRound,
  account: CircleUserRound,
  customers: Users,
  businesses: Building2,
  drivers: Truck,
  quotes: FileText,
  finance: Wallet,
  settings: Settings,
};

export interface PortalIdentity {
  portalLabel: string;
  name: string;
  /** Rôle ou organisation affichés sous le nom. */
  detail: string;
}

/**
 * Écrans « focus » (saisie, détail) : pas de barre d'onglets, ils ont leur
 * propre barre d'action en bas d'écran.
 */
export function isFocusedScreen(pathname: string) {
  return (
    /^\/(admin|pro)\/missions\/.+/.test(pathname) ||
    /^\/(client|driver)\/missions\/.+/.test(pathname) ||
    pathname === "/client/order"
  );
}

/** Vide les pages gardées hors connexion avant de changer d'utilisateur (appareil partagé). */
export async function clearOfflinePages() {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.endsWith("-pages")).map((key) => caches.delete(key)));
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form
      action={async () => {
        await clearOfflinePages().catch(() => undefined);
        await signOutAction();
      }}
    >
      <button type="submit" className={cn(buttonVariants({ variant: "ghost", size: "sm", block: true }), className)}>
        <LogOut aria-hidden />
        Déconnexion
      </button>
    </form>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function IdentityCard({ identity }: { identity: PortalIdentity }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold">
        {initials(identity.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{identity.name}</span>
        <span className="block truncate text-xs text-muted">{identity.detail}</span>
      </span>
    </div>
  );
}

export function PortalSidebar({ items, identity }: { items: NavItem[]; identity: PortalIdentity }) {
  const pathname = usePathname();
  const active = activeNavItem(items, pathname);
  const primary = items.find((item) => item.primary);
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <Link href={items[0]?.href ?? "/"} className="px-2" aria-label="NAERA Convoyage — accueil">
        <Logo />
      </Link>
      <p className="mt-4 px-2 text-xs font-semibold tracking-[0.08em] text-faint uppercase">{identity.portalLabel}</p>
      {primary ? (
        <Link
          href={primary.href}
          className={cn(buttonVariants({ variant: "primary", size: "md", block: true }), "mt-5")}
        >
          <Plus aria-hidden />
          {primary.label}
        </Link>
      ) : null}
      <nav aria-label="Navigation principale" className="mt-6 space-y-1 overflow-y-auto">
        {items
          .filter((item) => !item.primary)
          .map((item) => {
            const Icon = ICONS[item.icon];
            const current = active?.id === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                  current ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="mt-auto space-y-3 pt-4">
        <IdentityCard identity={identity} />
        <div className="grid grid-cols-2 gap-1">
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Repeat2 aria-hidden />
            Profil
          </Link>
          <SignOutButton className="px-2" />
        </div>
        <ThemeToggle name="theme-sidebar" compact />
      </div>
    </aside>
  );
}

export function PortalBottomNav({ items, identity }: { items: NavItem[]; identity: PortalIdentity }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  if (isFocusedScreen(pathname)) return null;
  const active = activeNavItem(items, pathname);
  const tabs = items.filter((item) => item.tab);
  const primary = items.find((item) => item.primary);
  const overflow = items.filter((item) => !item.tab && !item.primary);
  const moreActive = overflow.some((item) => item.id === active?.id);

  const tab = (item: NavItem) => {
    const Icon = ICONS[item.icon];
    const current = active?.id === item.id;
    return (
      <Link
        key={item.id}
        href={item.href}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-colors",
          current ? "text-foreground" : "text-faint hover:text-muted",
        )}
      >
        <Icon className="size-[22px]" strokeWidth={current ? 2.4 : 2} aria-hidden />
        <span className="max-w-full truncate px-1">{item.label}</span>
      </Link>
    );
  };

  // Deux onglets, l'action principale au centre, puis les suivants.
  const before = tabs.slice(0, 2);
  const after = tabs.slice(2);
  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-xl items-center gap-1 px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {before.map(tab)}
          {primary ? (
            <Link
              href={primary.href}
              aria-label={primary.label}
              className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-foreground"
            >
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-float">
                <Plus className="size-6" strokeWidth={2.4} aria-hidden />
              </span>
              <span className="max-w-full truncate px-1">{primary.id === "order" ? "Commander" : "Nouvelle"}</span>
            </Link>
          ) : null}
          {after.map(tab)}
          {overflow.length > 0 ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className={cn(
                "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-colors",
                moreActive ? "text-foreground" : "text-faint hover:text-muted",
              )}
            >
              <LayoutGrid className="size-[22px]" strokeWidth={moreActive ? 2.4 : 2} aria-hidden />
              Plus
            </button>
          ) : null}
        </div>
      </nav>
      {overflow.length > 0 ? (
        <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={identity.portalLabel}>
          <div className="space-y-4 pb-2">
            <IdentityCard identity={identity} />
            {overflow.length > 0 ? (
              <nav aria-label="Autres rubriques" className="grid grid-cols-2 gap-2">
                {overflow.map((item) => {
                  const Icon = ICONS[item.icon];
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      aria-current={active?.id === item.id ? "page" : undefined}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-border px-3 text-[15px] font-medium hover:bg-surface-2"
                    >
                      <Icon className="size-5 shrink-0 text-muted" aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            <ThemeToggle name="theme-sheet" />
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                onClick={() => setMoreOpen(false)}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <Repeat2 aria-hidden />
                Changer de profil
              </Link>
              <SignOutButton />
            </div>
          </div>
        </BottomSheet>
      ) : null}
    </>
  );
}
