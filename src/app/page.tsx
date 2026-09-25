import { ArrowRight, FlaskConical, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Logo } from "@/components/brand/logo";
import { PageContainer } from "@/components/layout/page-container";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PORTAL_HOME, PORTAL_LABELS, portalOf, type Actor, type Portal } from "@/core/access/actor";
import { BUSINESS_ROLE_LABELS, STAFF_ROLE_LABELS } from "@/core/accounts/types";
import { PLAN_LABELS } from "@/core/plans/features";
import { PersonaPicker, type PersonaGroup } from "@/features/home/persona-picker";
import { getActor, isDemoAuthEnabled, listDemoPersonas } from "@/services/auth/session";
import { getAppRepositories } from "@/services/container";

export const metadata: Metadata = { title: "Connexion" };

const GROUPS: { portal: Portal; title: string; description: string }[] = [
  { portal: "admin", title: "Naera · back-office", description: "Vue complète : missions, coûts, marges, finance." },
  { portal: "pro", title: "Espace professionnel", description: "Garages, loueurs, concessions : missions et équipe." },
  { portal: "client", title: "Espace particulier", description: "Commander un convoyage et suivre sa commande." },
  { portal: "driver", title: "Espace convoyeur", description: "Missions affectées, étapes terrain." },
];

function detailOf(actor: Actor): string {
  switch (actor.kind) {
    case "STAFF":
      return STAFF_ROLE_LABELS[actor.staffRole];
    case "BUSINESS":
      return `${actor.businessName} · ${BUSINESS_ROLE_LABELS[actor.role]}`;
    case "PERSONAL":
      return "Une commande en cours";
    case "DRIVER":
      return "Convoyeur · missions du jour";
  }
}

export default async function HomePage(props: PageProps<"/">) {
  await connection();
  const [actor, personas, searchParams] = await Promise.all([getActor(), listDemoPersonas(), props.searchParams]);
  const demo = isDemoAuthEnabled();
  const plans = new Map<string, string>();
  if (demo) {
    const { directory } = await getAppRepositories();
    for (const view of await directory.listBusinessAccounts()) {
      if (view.entitlements.planCode) plans.set(view.account.id, PLAN_LABELS[view.entitlements.planCode]);
    }
  }
  const currentKey = actor
    ? personas.find((persona) => persona.actor.userId === actor.userId && portalOf(persona.actor) === portalOf(actor))
        ?.key
    : null;
  const groups: PersonaGroup[] = GROUPS.map((group) => ({
    id: group.portal,
    title: group.title,
    description: group.description,
    personas: personas
      .filter((persona) => portalOf(persona.actor) === group.portal)
      .map((persona) => ({
        key: persona.key,
        name: persona.actor.name,
        detail: detailOf(persona.actor),
        badge: persona.actor.kind === "BUSINESS" ? plans.get(persona.actor.businessAccountId) : undefined,
        current: persona.key === currentKey,
      })),
  })).filter((group) => group.personas.length > 0);

  return (
    <PageContainer className="max-w-4xl pb-16">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Logo />
      </header>
      <div className="mb-8 space-y-2">
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight">Plateforme de convoyage</h1>
        <p className="text-[15px] text-muted">
          Un espace par métier : Naera, professionnels, particuliers et convoyeurs. Chacun ne voit que ses données.
        </p>
      </div>

      {actor ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <div className="min-w-0">
            <p className="text-sm text-muted">Connecté en tant que</p>
            <p className="truncate font-semibold">
              {actor.name} · {PORTAL_LABELS[portalOf(actor)]}
            </p>
          </div>
          <ButtonLink href={PORTAL_HOME[portalOf(actor)]}>
            Continuer
            <ArrowRight aria-hidden />
          </ButtonLink>
        </div>
      ) : null}

      {searchParams.erreur === "profil" ? (
        <p role="alert" className="mb-6 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          Ce profil n&apos;est plus disponible. Choisis-en un autre.
        </p>
      ) : null}

      {demo ? (
        <>
          <div
            role="note"
            className="mb-8 flex items-start gap-2.5 rounded-2xl border border-dashed border-border-strong bg-surface-2/60 px-4 py-3 text-sm text-muted"
          >
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
            <p>
              <span className="font-semibold text-foreground">Connexion de démonstration.</span> Choisis un profil : les
              droits et l&apos;isolation des données sont appliqués par le serveur, comme en production.
            </p>
          </div>
          {groups.length > 0 ? (
            <PersonaPicker groups={groups} />
          ) : (
            <EmptyState
              title="Aucun profil disponible"
              description="Initialise les données de démonstration : npm run db:seed (base PostgreSQL)."
            />
          )}
        </>
      ) : (
        <EmptyState
          icon={<KeyRound />}
          title="Connexion bientôt disponible"
          description="L'authentification n'est pas encore configurée sur cet environnement."
        />
      )}
    </PageContainer>
  );
}
