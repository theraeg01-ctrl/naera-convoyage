import type { MissionScope } from "@/core/access/scope";
import { formatMissionReference } from "@/core/mission/reference";
import type { Mission } from "@/core/mission/types";
import { zonedLocalToUtcIso } from "@/core/shared/timezone";
import type { AppSettings } from "@/core/settings/types";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { MissionRepository, NewMission, Repositories, SettingsRepository } from "../types";
import { getPrismaClient } from "./client";
import { PrismaDemoStore, PrismaDirectoryRepository } from "./directory-repository";
import { ACTIVE_ASSIGNMENT_STATUSES, MISSION_INCLUDE, toDomainMission, toMissionCreateInput } from "./mission-mapper";
import { settingsToRows, toAppSettings, DEFAULT_PROFILE_NAME } from "./settings-mapper";

/** Isolation multi-tenant : le périmètre devient une clause WHERE de la requête. */
export function missionScopeWhere(scope: MissionScope): Prisma.MissionWhereInput {
  switch (scope.kind) {
    case "ALL":
      return {};
    case "BUSINESS":
      return { businessAccountId: scope.businessAccountId };
    case "PERSONAL":
      return { personalCustomerId: scope.personalCustomerId };
    case "DRIVER":
      return {
        assignments: {
          some: { driverProfileId: scope.driverProfileId, status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] } },
        },
      };
  }
}

class PrismaMissionRepository implements MissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(scope: MissionScope): Promise<Mission[]> {
    const rows = await this.prisma.mission.findMany({
      where: missionScopeWhere(scope),
      include: MISSION_INCLUDE,
      orderBy: { scheduledAt: "desc" },
    });
    return rows.map(toDomainMission);
  }

  async findById(id: string, scope: MissionScope): Promise<Mission | null> {
    const row = await this.prisma.mission.findFirst({
      where: { id, ...missionScopeWhere(scope) },
      include: MISSION_INCLUDE,
    });
    return row ? toDomainMission(row) : null;
  }

  async create(mission: NewMission, now: Date): Promise<Mission> {
    const year = now.getUTCFullYear();
    const row = await this.prisma.$transaction(async (tx) => {
      const sequence = await tx.sequence.upsert({
        where: { key: `mission-${year}` },
        create: { key: `mission-${year}`, value: 1 },
        update: { value: { increment: 1 } },
      });
      const scheduledAt = new Date(zonedLocalToUtcIso(mission.scheduledDate, mission.scheduledTime));
      return tx.mission.create({
        data: toMissionCreateInput(mission, formatMissionReference(year, sequence.value), scheduledAt),
        include: MISSION_INCLUDE,
      });
    });
    return toDomainMission(row);
  }

  async save(mission: Mission): Promise<Mission> {
    const date = (iso: string | undefined) => (iso ? new Date(iso) : null);
    const assignment = mission.assignment;
    await this.prisma.$transaction([
      // Une seule affectation active : les autres sont annulées.
      this.prisma.missionAssignment.updateMany({
        where: {
          missionId: mission.id,
          status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
          ...(assignment ? { driverProfileId: { not: assignment.driverProfileId } } : {}),
        },
        data: { status: "CANCELLED" },
      }),
      ...(assignment
        ? [
            this.prisma.missionAssignment.upsert({
              where: {
                missionId_driverProfileId: { missionId: mission.id, driverProfileId: assignment.driverProfileId },
              },
              create: {
                missionId: mission.id,
                driverProfileId: assignment.driverProfileId,
                status: assignment.status,
                assignedAt: new Date(assignment.assignedAt),
              },
              update: { status: assignment.status },
            }),
          ]
        : []),
      this.prisma.mission.update({
        where: { id: mission.id },
        data: {
          status: mission.status,
          notes: mission.notes,
          startedAt: date(mission.progress.startedAt),
          inspectedAt: date(mission.progress.inspectedAt),
          drivingAt: date(mission.progress.drivingAt),
          deliveredAt: date(mission.progress.deliveredAt),
          completedAt: date(mission.progress.completedAt),
        },
      }),
      this.prisma.missionEvent.createMany({
        data: mission.events.map((event) => ({
          id: event.id,
          missionId: mission.id,
          type: event.type,
          label: event.label,
          at: new Date(event.at),
        })),
        skipDuplicates: true,
      }),
    ]);
    const saved = await this.findById(mission.id, { kind: "ALL" });
    if (!saved) throw new Error(`Mission introuvable après enregistrement : ${mission.id}`);
    return saved;
  }

  count(): Promise<number> {
    return this.prisma.mission.count();
  }
}

class PrismaSettingsRepository implements SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<AppSettings | null> {
    const [row, profile] = await Promise.all([
      this.prisma.pricingSettings.findUnique({ where: { id: "default" } }),
      this.prisma.pricingProfile.findFirst({
        where: { isDefault: true },
        include: { packages: { orderBy: { sortOrder: "asc" } }, serviceOptions: { orderBy: { sortOrder: "asc" } } },
      }),
    ]);
    if (!row || !profile) return null;
    return toAppSettings(row, profile.packages, profile.serviceOptions);
  }

  async save(settings: AppSettings): Promise<AppSettings> {
    const rows = settingsToRows(settings);
    await this.prisma.$transaction(async (tx) => {
      await tx.pricingSettings.upsert({ where: { id: "default" }, create: rows.settings, update: rows.settings });
      const profile =
        (await tx.pricingProfile.findFirst({ where: { isDefault: true } })) ??
        (await tx.pricingProfile.create({ data: { name: DEFAULT_PROFILE_NAME, isDefault: true } }));
      for (const pkg of rows.packages) {
        await tx.package.upsert({
          where: { pricingProfileId_code: { pricingProfileId: profile.id, code: pkg.code } },
          create: { ...pkg, pricingProfileId: profile.id },
          update: pkg,
        });
      }
      for (const option of rows.options) {
        await tx.serviceOption.upsert({
          where: { pricingProfileId_code: { pricingProfileId: profile.id, code: option.code } },
          create: { ...option, pricingProfileId: profile.id },
          update: option,
        });
      }
    });
    return settings;
  }
}

export function createPrismaRepositories(connectionString: string): Repositories {
  const prisma = getPrismaClient(connectionString);
  return {
    kind: "postgres",
    missions: new PrismaMissionRepository(prisma),
    settings: new PrismaSettingsRepository(prisma),
    directory: new PrismaDirectoryRepository(prisma),
    // Les données de démonstration ne s'injectent qu'explicitement (`npm run db:seed`).
    demo: new PrismaDemoStore(prisma),
  };
}
