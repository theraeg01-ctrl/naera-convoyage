import { FileUp, ListChecks, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { MissionViewCard, shortPlace } from "@/components/mission/mission-view-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClassName } from "@/components/ui/field";
import { ScrollActiveIntoView } from "@/components/ui/scroll-active-into-view";
import { can } from "@/core/access/permissions";
import {
  MISSION_FILTER_LABELS,
  MISSION_FILTER_SLUGS,
  MISSION_FILTERS,
  missionFilterFromSlug,
} from "@/core/mission/filters";
import { vehicleDisplayName } from "@/core/mission/types";
import { formatEuro } from "@/core/shared/format";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { listProMissions } from "@/services/portals/pro-portal";
import { cn } from "@/utils/cn";

export const metadata: Metadata = { title: "Missions" };

export default async function ProMissionsPage(props: PageProps<"/pro/missions">) {
  await connection();
  const actor = await requirePortal("pro");
  const { filtre, q } = await props.searchParams;
  const active = missionFilterFromSlug(filtre);
  const search = typeof q === "string" ? q.slice(0, 80) : "";
  const { missions, counts, authors } = await withAccess(() => listProMissions(actor, { filter: active, search }));
  const today = todayInZone();
  const hrefFor = (slug: string | null) => {
    const params = new URLSearchParams();
    if (slug) params.set("filtre", slug);
    if (search) params.set("q", search);
    const query = params.toString();
    return query ? `/pro/missions?${query}` : "/pro/missions";
  };

  return (
    <div>
      <PageHeader
        title="Missions"
        description={`${counts.ALL} mission${counts.ALL > 1 ? "s" : ""} pour votre entreprise`}
        actions={
          can(actor, "missions.create") ? (
            <>
              <span className="hidden items-center gap-2 text-sm text-faint sm:inline-flex">
                <FileUp className="size-4" aria-hidden />
                Import CSV
                <Badge tone="outline">Bientôt</Badge>
              </span>
              <ButtonLink href="/pro/missions/new" size="sm" className="hidden sm:inline-flex lg:hidden">
                <Plus aria-hidden />
                Nouvelle
              </ButtonLink>
            </>
          ) : null
        }
      />

      <form role="search" action="/pro/missions" className="relative mb-4">
        {active !== "ALL" ? <input type="hidden" name="filtre" value={MISSION_FILTER_SLUGS[active]} /> : null}
        <label htmlFor="q" className="sr-only">
          Rechercher une mission
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Référence, ville, immatriculation, n° de commande…"
          className={cn(inputClassName, "h-12 pl-12")}
        />
      </form>

      <nav aria-label="Filtrer les missions" className="-mx-4 mb-6 sm:mx-0">
        <ScrollActiveIntoView className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:flex-wrap sm:px-0">
          {MISSION_FILTERS.map((filter) => {
            const current = filter === active;
            return (
              <Link
                key={filter}
                href={hrefFor(filter === "ALL" ? null : MISSION_FILTER_SLUGS[filter])}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                  current
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted hover:text-foreground",
                )}
              >
                {MISSION_FILTER_LABELS[filter]}
                <span className={cn("tabular", current ? "opacity-70" : "text-faint")}>{counts[filter]}</span>
              </Link>
            );
          })}
        </ScrollActiveIntoView>
      </nav>

      {missions.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {missions.map((mission) => (
            <MissionViewCard
              key={mission.id}
              href={`/pro/missions/${mission.id}`}
              reference={mission.reference}
              isDemo={mission.isDemo}
              status={mission.status}
              from={shortPlace(mission.pickup)}
              to={shortPlace(mission.dropoff)}
              subtitle={[
                vehicleDisplayName(mission.vehicle),
                mission.customerReference,
                mission.createdByUserId ? authors[mission.createdByUserId] : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              scheduledDate={mission.scheduledDate}
              scheduledTime={mission.scheduledTime}
              today={today}
              amount={formatEuro(mission.totals.ht)}
              amountHint="HT"
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListChecks />}
          title={search ? "Aucun résultat" : "Aucune mission ici"}
          description={
            search ? `Aucune mission ne correspond à « ${search} ».` : "Change de filtre ou crée une mission."
          }
        />
      )}
    </div>
  );
}
