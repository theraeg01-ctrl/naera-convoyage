import type { ReactNode } from "react";
import { PORTAL_LABELS, type Actor, type Portal } from "@/core/access/actor";
import { BUSINESS_ROLE_LABELS, STAFF_ROLE_LABELS } from "@/core/accounts/types";
import { buildNavigation } from "@/core/navigation/portal-navigation";
import { requirePortal } from "@/services/auth/guards";
import { getProContext } from "@/services/portals/pro-portal";
import { PortalBottomNav, PortalSidebar, type PortalIdentity } from "./navigation";
import { PageContainer } from "./page-container";

function describeActor(actor: Actor): string {
  switch (actor.kind) {
    case "STAFF":
      return STAFF_ROLE_LABELS[actor.staffRole];
    case "BUSINESS":
      return `${actor.businessName} · ${BUSINESS_ROLE_LABELS[actor.role]}`;
    case "PERSONAL":
      return "Particulier";
    case "DRIVER":
      return "Convoyeur Naera";
  }
}

/**
 * Coquille d'un portail : navigation propre au portail, filtrée par rôle et
 * par plan. Le contrôle d'accès ici sert à répondre 401/403 dès le premier
 * octet (avant le streaming des pages) ; il ne suffit pas : un layout ne se
 * ré-exécute pas à chaque navigation, donc chaque page appelle aussi
 * requirePortal() et chaque service revérifie les droits.
 */
export async function PortalLayout({ portal, children }: { portal: Portal; children: ReactNode }) {
  const actor = await requirePortal(portal);
  const account = actor.kind === "BUSINESS" ? (await getProContext(actor)).account : null;
  const items = buildNavigation(portal, actor, account);
  const identity: PortalIdentity = {
    portalLabel: PORTAL_LABELS[portal],
    name: actor.name,
    detail: describeActor(actor),
  };
  return (
    <div className="flex min-h-dvh">
      <PortalSidebar items={items} identity={identity} />
      <div className="min-w-0 flex-1">
        <PageContainer>{children}</PageContainer>
      </div>
      <PortalBottomNav items={items} identity={identity} />
    </div>
  );
}
