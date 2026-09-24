import { ListChecks, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { MissionCard } from "@/components/mission/mission-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollActiveIntoView } from "@/components/ui/scroll-active-into-view";
import {
  MISSION_FILTER_LABELS,
  MISSION_FILTER_SLUGS,
  MISSION_FILTERS,
  matchesMissionFilter,
  missionFilterFromSlug,
  sortMissionsBySchedule,
  type MissionFilter,
} from "@/core/mission/filters";
import { todayInZone } from "@/core/shared/timezone";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { listAdminMissions } from "@/services/portals/admin-portal";
import { cn } from "@/utils/cn";

export const metadata: Metadata = { title: "Missions" };

export default async function AdminMissionsPage(props: PageProps<"/admin/missions">) {
  await connection();
  const actor = await requirePortal("admin");
  const { filtre } = await props.searchParams;
  const active = missionFilterFromSlug(filtre);
  const today = todayInZone();
  const missions = await withAccess(() => listAdminMissions(actor));
  const counts = Object.fromEntries(
    MISSION_FILTERS.map((filter) => [
      filter,
      missions.filter((mission) => matchesMissionFilter(mission, filter, today)).length,
    ]),
  ) as Record<MissionFilter, number>;
  const visible = sortMissionsBySchedule(
    missions.filter((mission) => matchesMissionFilter(mission, active, today)),
    active === "UPCOMING" || active === "TODAY" ? "asc" : "desc",
  );

  return (
    <div>
      <PageHeader
        title="Missions"
        description={`${missions.length} mission${missions.length > 1 ? "s" : ""}`}
        actions={
          <ButtonLink href="/admin/missions/new" size="sm" className="hidden sm:inline-flex lg:hidden">
            <Plus aria-hidden />
            Nouvelle
          </ButtonLink>
        }
      />
      <nav aria-label="Filtrer les missions">
        <ScrollActiveIntoView className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-2">
            {MISSION_FILTERS.map((filter) => {
              const selected = filter === active;
              return (
                <li key={filter}>
                  <Link
                    href={
                      filter === "ALL" ? "/admin/missions" : `/admin/missions?filtre=${MISSION_FILTER_SLUGS[filter]}`
                    }
                    aria-current={selected ? "page" : undefined}
                    scroll={false}
                    className={cn(
                      "flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {MISSION_FILTER_LABELS[filter]}
                    <span className={cn("tabular text-xs", selected ? "opacity-70" : "text-faint")}>
                      {counts[filter]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ScrollActiveIntoView>
      </nav>
      {visible.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((mission) => (
            <MissionCard key={mission.id} mission={mission} today={today} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListChecks />}
          title="Aucune mission ici"
          description="Change de filtre ou crée une nouvelle estimation."
          action={
            <ButtonLink href="/admin/missions/new" variant="secondary" size="sm">
              <Plus aria-hidden />
              Nouvelle mission
            </ButtonLink>
          }
        />
      )}
    </div>
  );
}
