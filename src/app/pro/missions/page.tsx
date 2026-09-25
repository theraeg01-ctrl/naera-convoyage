import { FileUp, ListChecks, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { MissionRowList } from "@/components/mission/mission-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClassName } from "@/components/ui/field";
import { FilterChips } from "@/components/ui/filter-chips";
import { can } from "@/core/access/permissions";
import {
  MISSION_FILTER_LABELS,
  MISSION_FILTER_SLUGS,
  MISSION_FILTERS,
  missionFilterFromSlug,
} from "@/core/mission/filters";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { toProMissionRow } from "@/features/pro/mission-rows";
import { listProMissions } from "@/services/portals/pro-portal";
import { cn } from "@/utils/cn";

export const metadata: Metadata = { title: "Missions" };

export default async function ProMissionsPage(props: PageProps<"/pro/missions">) {
  await connection();
  const actor = await requirePortal("pro");
  const { filtre, q } = await props.searchParams;
  const active = missionFilterFromSlug(filtre);
  const search = typeof q === "string" ? q.slice(0, 80) : "";
  const { missions, counts } = await withAccess(() => listProMissions(actor, { filter: active, search }));
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

      <form role="search" action="/pro/missions" className="relative mb-3">
        {active !== "ALL" ? <input type="hidden" name="filtre" value={MISSION_FILTER_SLUGS[active]} /> : null}
        <label htmlFor="q" className="sr-only">
          Rechercher une mission
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Réf., ville, plaque…"
          title="Référence, ville, immatriculation, n° de commande"
          className={cn(inputClassName, "h-11 pl-11")}
        />
      </form>

      <FilterChips
        label="Filtrer les missions"
        className="mb-5"
        items={MISSION_FILTERS.map((filter) => ({
          id: filter,
          label: MISSION_FILTER_LABELS[filter],
          href: hrefFor(filter === "ALL" ? null : MISSION_FILTER_SLUGS[filter]),
          count: counts[filter],
          current: filter === active,
        }))}
      />

      {missions.length > 0 ? (
        <MissionRowList missions={missions.map(toProMissionRow)} today={today} />
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
