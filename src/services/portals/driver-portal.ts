import "server-only";
import type { Actor } from "@/core/access/actor";
import { allowedMissionActions, canPerformMissionAction } from "@/core/access/mission-actions";
import { AccessDeniedError } from "@/core/access/permissions";
import { toDriverMissionView, type DriverMissionView } from "@/core/access/projections";
import { missionScopeFor } from "@/core/access/scope";
import type { DriverProfile } from "@/core/accounts/types";
import { sortMissionsBySchedule } from "@/core/mission/filters";
import { fieldStepsView, type FieldStepView, type MissionActionId } from "@/core/mission/progress";
import type { MissionStatus } from "@/core/mission/types";
import { run, type UseCaseResult } from "../result";
import { assertDriver, getAppRepositories, getMissionService, today, type DriverActor } from "./common";

/**
 * Portail convoyeur : uniquement les missions qui lui sont affectées, en vue
 * terrain (contacts, trajet, étapes). Aucun prix, coût, marge ni KPI Naera.
 */

const ACTIVE: readonly MissionStatus[] = ["IN_PROGRESS", "DELIVERED"];
const UPCOMING: readonly MissionStatus[] = ["CONFIRMED", "ASSIGNED"];
const DONE: readonly MissionStatus[] = ["COMPLETED"];

async function assignedMissions(actor: DriverActor) {
  const service = await getMissionService();
  return service.list(missionScopeFor(actor));
}

export interface DriverMissionList {
  current: DriverMissionView[];
  upcoming: DriverMissionView[];
  done: DriverMissionView[];
  completedThisMonth: number;
}

export async function listDriverMissions(actor: Actor | null): Promise<DriverMissionList> {
  assertDriver(actor, "missions.read");
  const views = (await assignedMissions(actor)).map(toDriverMissionView);
  const month = today().slice(0, 7);
  const byStatus = (statuses: readonly MissionStatus[]) => views.filter((view) => statuses.includes(view.status));
  const done = byStatus(DONE);
  return {
    current: sortMissionsBySchedule(byStatus(ACTIVE), "asc"),
    upcoming: sortMissionsBySchedule(byStatus(UPCOMING), "asc"),
    done: sortMissionsBySchedule(done, "desc").slice(0, 10),
    completedThisMonth: done.filter((view) => view.scheduledDate.startsWith(month)).length,
  };
}

export interface DriverMissionDetail {
  mission: DriverMissionView;
  steps: FieldStepView[];
  actions: MissionActionId[];
}

export async function getDriverMission(actor: Actor | null, id: string): Promise<DriverMissionDetail | null> {
  assertDriver(actor, "missions.read");
  const service = await getMissionService();
  const mission = await service.get(id, missionScopeFor(actor));
  if (!mission) return null;
  return {
    mission: toDriverMissionView(mission),
    steps: fieldStepsView(mission),
    actions: allowedMissionActions(actor, mission),
  };
}

export async function performDriverAction(
  actor: Actor | null,
  id: string,
  action: MissionActionId,
): Promise<UseCaseResult<{ id: string }>> {
  return run("performDriverAction", async () => {
    assertDriver(actor, "missions.progress");
    const service = await getMissionService();
    const mission = await service.applyAction(id, action, missionScopeFor(actor), (candidate) =>
      canPerformMissionAction(actor, candidate, action),
    );
    return { id: mission.id };
  });
}

export async function getDriverProfile(actor: Actor | null): Promise<DriverProfile> {
  assertDriver(actor, "missions.read");
  const { directory } = await getAppRepositories();
  const profile = await directory.getDriverProfile(actor.driverProfileId);
  if (!profile) throw new AccessDeniedError("FORBIDDEN");
  return profile;
}
