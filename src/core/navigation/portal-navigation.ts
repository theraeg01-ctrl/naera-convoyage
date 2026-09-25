import type { Actor, Portal } from "../access/actor";
import { can, type Permission } from "../access/permissions";
import { hasFeature, type Entitlements, type FeatureKey } from "../plans/features";

/** Clés d'icônes (associées aux icônes dans l'interface web ou mobile). */
export type NavIcon =
  | "home"
  | "order"
  | "missions"
  | "plus"
  | "billing"
  | "analytics"
  | "team"
  | "account"
  | "customers"
  | "businesses"
  | "drivers"
  | "quotes"
  | "finance"
  | "settings";

export interface NavItem {
  id: string;
  label: string;
  /** Libellé court de la barre d'onglets mobile (à défaut : label). */
  shortLabel?: string;
  href: string;
  icon: NavIcon;
  /** Permission requise (rôle). */
  permission?: Permission;
  /** Fonctionnalité requise (plan). */
  feature?: FeatureKey;
  /** Action principale (bouton mis en avant). */
  primary?: boolean;
  /** Onglet de la barre inférieure mobile (les autres vont dans « Plus »). */
  tab?: boolean;
}

/** Une navigation par portail : chaque utilisateur a une interface adaptée à son travail. */
export const PORTAL_NAVIGATION: Record<Portal, readonly NavItem[]> = {
  client: [
    { id: "home", label: "Accueil", href: "/client", icon: "home", tab: true },
    {
      id: "order",
      label: "Commander",
      href: "/client/order",
      icon: "plus",
      primary: true,
      permission: "missions.create",
    },
    {
      id: "missions",
      label: "Mes convoyages",
      shortLabel: "Convoyages",
      href: "/client/missions",
      icon: "missions",
      tab: true,
    },
    { id: "account", label: "Compte", href: "/client/account", icon: "account", tab: true },
  ],
  pro: [
    { id: "dashboard", label: "Dashboard", href: "/pro", icon: "home", tab: true },
    { id: "missions", label: "Missions", href: "/pro/missions", icon: "missions", tab: true },
    {
      id: "new",
      label: "Nouvelle mission",
      href: "/pro/missions/new",
      icon: "plus",
      primary: true,
      permission: "missions.create",
    },
    { id: "billing", label: "Facturation", href: "/pro/billing", icon: "billing", permission: "billing.read" },
    {
      id: "analytics",
      label: "Analytics",
      href: "/pro/analytics",
      icon: "analytics",
      permission: "analytics.read",
      feature: "analytics_basic",
    },
    {
      id: "team",
      label: "Équipe",
      href: "/pro/team",
      icon: "team",
      permission: "team.read",
      feature: "team_management",
    },
  ],
  admin: [
    { id: "dashboard", label: "Dashboard", href: "/admin", icon: "home", tab: true },
    { id: "missions", label: "Missions", href: "/admin/missions", icon: "missions", tab: true },
    {
      id: "new",
      label: "Nouvelle mission",
      href: "/admin/missions/new",
      icon: "plus",
      primary: true,
      permission: "missions.manage",
    },
    { id: "customers", label: "Clients", href: "/admin/customers", icon: "customers", permission: "accounts.read" },
    {
      id: "businesses",
      label: "Professionnels",
      href: "/admin/businesses",
      icon: "businesses",
      permission: "accounts.read",
    },
    { id: "drivers", label: "Convoyeurs", href: "/admin/drivers", icon: "drivers", permission: "drivers.read" },
    { id: "quotes", label: "Devis", href: "/admin/quotes", icon: "quotes", permission: "missions.manage" },
    { id: "finance", label: "Finance", href: "/admin/finance", icon: "finance", permission: "finance.read" },
    { id: "settings", label: "Paramètres", href: "/admin/settings", icon: "settings", permission: "settings.manage" },
  ],
  driver: [
    { id: "missions", label: "Missions", href: "/driver", icon: "missions", tab: true },
    { id: "account", label: "Compte", href: "/driver/account", icon: "account", tab: true },
  ],
};

/** Éléments visibles pour cet acteur : rôle ET plan. Aucun test de plan dans les composants. */
export function buildNavigation(
  portal: Portal,
  actor: Actor,
  account: { entitlements: Entitlements } | null,
): NavItem[] {
  return PORTAL_NAVIGATION[portal].filter(
    (item) =>
      (item.permission === undefined || can(actor, item.permission)) &&
      (item.feature === undefined || hasFeature(account, item.feature)),
  );
}

/** Élément actif : le lien le plus spécifique correspondant au chemin courant. */
export function activeNavItem(items: readonly NavItem[], pathname: string): NavItem | null {
  return (
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null
  );
}
