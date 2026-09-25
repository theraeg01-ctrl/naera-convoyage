import { randomUUID } from "node:crypto";
import { personName, type Invoice } from "@/core/accounts/types";
import type { Actor, ActorContextRef } from "@/core/access/actor";
import { isInScope, type MissionScope } from "@/core/access/scope";
import { nextMissionReference } from "@/core/mission/reference";
import type { Mission } from "@/core/mission/types";
import { NO_ENTITLEMENTS, resolveEntitlements } from "@/core/plans/features";
import type { AppSettings } from "@/core/settings/types";
import type {
  BusinessAccountView,
  DemoStore,
  DirectoryRepository,
  DirectorySeed,
  InvoiceScope,
  MissionRepository,
  NewMission,
  Repositories,
  SettingsRepository,
} from "../types";
import { EMPTY_DIRECTORY, LocalFileStore } from "./file-store";

class FileMissionRepository implements MissionRepository {
  constructor(private readonly store: LocalFileStore) {}

  async list(scope: MissionScope): Promise<Mission[]> {
    return (await this.store.read()).missions.filter((mission) => isInScope(mission, scope));
  }

  async findById(id: string, scope: MissionScope): Promise<Mission | null> {
    const mission = (await this.store.read()).missions.find((candidate) => candidate.id === id);
    return mission && isInScope(mission, scope) ? mission : null;
  }

  create(input: NewMission, now: Date): Promise<Mission> {
    return this.store.update((data) => {
      const iso = now.toISOString();
      const reference = nextMissionReference(
        data.missions.map((mission) => mission.reference),
        now.getUTCFullYear(),
      );
      const mission: Mission = { ...input, id: randomUUID(), reference, createdAt: iso, updatedAt: iso };
      data.missions.push(mission);
      return mission;
    });
  }

  save(mission: Mission): Promise<Mission> {
    return this.store.update((data) => {
      const index = data.missions.findIndex((candidate) => candidate.id === mission.id);
      if (index === -1) throw new Error(`Mission introuvable : ${mission.id}`);
      data.missions[index] = mission;
      return mission;
    });
  }

  async count(): Promise<number> {
    return (await this.store.read()).missions.length;
  }
}

class FileSettingsRepository implements SettingsRepository {
  constructor(private readonly store: LocalFileStore) {}

  async get(): Promise<AppSettings | null> {
    return (await this.store.read()).settings;
  }

  save(settings: AppSettings): Promise<AppSettings> {
    return this.store.update((data) => {
      data.settings = settings;
      return settings;
    });
  }
}

function businessView(directory: DirectorySeed, id: string): BusinessAccountView | null {
  const account = directory.businessAccounts.find((candidate) => candidate.id === id);
  if (!account) return null;
  const subscription = directory.subscriptions.find((candidate) => candidate.businessAccountId === id);
  const plan = subscription ? directory.plans.find((candidate) => candidate.code === subscription.planCode) : undefined;
  const entitlements = subscription
    ? resolveEntitlements({
        planCode: subscription.planCode,
        status: subscription.status,
        planFeatures: plan?.features ?? [],
        overrides: directory.overrides.find((entry) => entry.businessAccountId === id)?.overrides,
      })
    : NO_ENTITLEMENTS;
  const memberCount = directory.members.filter(
    (member) => member.businessAccountId === id && member.status !== "DISABLED",
  ).length;
  return { account, entitlements, memberCount };
}

/** Résolution d'un contexte : l'appartenance est revérifiée à chaque requête. */
function resolveActorIn(directory: DirectorySeed, userId: string, context: ActorContextRef): Actor | null {
  const user = directory.users.find((candidate) => candidate.id === userId);
  if (!user) return null;
  switch (context.kind) {
    case "STAFF":
      return user.staffRole ? { kind: "STAFF", userId, name: user.name, staffRole: user.staffRole } : null;
    case "BUSINESS": {
      const member = directory.members.find(
        (candidate) =>
          candidate.id === context.memberId && candidate.userId === userId && candidate.status === "ACTIVE",
      );
      const account =
        member && directory.businessAccounts.find((candidate) => candidate.id === member.businessAccountId);
      if (!member || !account) return null;
      return {
        kind: "BUSINESS",
        userId,
        name: user.name,
        memberId: member.id,
        businessAccountId: account.id,
        businessName: account.name,
        role: member.role,
      };
    }
    case "PERSONAL": {
      const customer = directory.personalCustomers.find(
        (candidate) => candidate.id === context.personalCustomerId && candidate.userId === userId,
      );
      return customer
        ? { kind: "PERSONAL", userId, name: personName(customer), personalCustomerId: customer.id }
        : null;
    }
    case "DRIVER": {
      const driver = directory.drivers.find(
        (candidate) =>
          candidate.id === context.driverProfileId && candidate.userId === userId && candidate.status === "ACTIVE",
      );
      return driver ? { kind: "DRIVER", userId, name: personName(driver), driverProfileId: driver.id } : null;
    }
  }
}

function contextsOf(directory: DirectorySeed, userId: string): ActorContextRef[] {
  const user = directory.users.find((candidate) => candidate.id === userId);
  const contexts: ActorContextRef[] = [];
  if (user?.staffRole) contexts.push({ kind: "STAFF" });
  for (const member of directory.members) {
    if (member.userId === userId && member.status === "ACTIVE")
      contexts.push({ kind: "BUSINESS", memberId: member.id });
  }
  for (const customer of directory.personalCustomers) {
    if (customer.userId === userId) contexts.push({ kind: "PERSONAL", personalCustomerId: customer.id });
  }
  for (const driver of directory.drivers) {
    if (driver.userId === userId && driver.status === "ACTIVE")
      contexts.push({ kind: "DRIVER", driverProfileId: driver.id });
  }
  return contexts;
}

function invoiceInScope(invoice: Invoice, scope: InvoiceScope): boolean {
  if (scope.kind === "ALL") return true;
  if (scope.kind === "BUSINESS") return invoice.businessAccountId === scope.businessAccountId;
  return invoice.personalCustomerId === scope.personalCustomerId;
}

class FileDirectoryRepository implements DirectoryRepository {
  constructor(private readonly store: LocalFileStore) {}

  private async directory(): Promise<DirectorySeed> {
    return (await this.store.read()).directory;
  }

  async listActors(): Promise<Actor[]> {
    const directory = await this.directory();
    return directory.users.flatMap((user) =>
      contextsOf(directory, user.id)
        .map((context) => resolveActorIn(directory, user.id, context))
        .filter((actor): actor is Actor => actor !== null),
    );
  }

  async resolveActor(userId: string, context: ActorContextRef): Promise<Actor | null> {
    return resolveActorIn(await this.directory(), userId, context);
  }

  async getUser(id: string) {
    return (await this.directory()).users.find((user) => user.id === id) ?? null;
  }

  async getBusinessAccount(id: string) {
    return businessView(await this.directory(), id);
  }

  async listBusinessAccounts() {
    const directory = await this.directory();
    return directory.businessAccounts
      .map((account) => businessView(directory, account.id))
      .filter((view): view is BusinessAccountView => view !== null);
  }

  async listMembers(businessAccountId: string) {
    const directory = await this.directory();
    return directory.members
      .filter((member) => member.businessAccountId === businessAccountId)
      .flatMap((member) => {
        const user = directory.users.find((candidate) => candidate.id === member.userId);
        return user ? [{ member, user }] : [];
      });
  }

  async getPersonalCustomer(id: string) {
    return (await this.directory()).personalCustomers.find((customer) => customer.id === id) ?? null;
  }

  async listPersonalCustomers() {
    return (await this.directory()).personalCustomers;
  }

  async listDriverProfiles() {
    return (await this.directory()).drivers;
  }

  async getDriverProfile(id: string) {
    return (await this.directory()).drivers.find((driver) => driver.id === id) ?? null;
  }

  async listInvoices(scope: InvoiceScope) {
    return (await this.store.read()).invoices.filter((invoice) => invoiceInScope(invoice, scope));
  }

  async listPlans() {
    return (await this.directory()).plans;
  }
}

class FileDemoStore implements DemoStore {
  constructor(private readonly store: LocalFileStore) {}

  async currentVersion(): Promise<number> {
    return (await this.store.read()).demoVersion;
  }

  clearDemoData(): Promise<void> {
    return this.store.update((data) => {
      const demoIds = new Set(data.missions.filter((mission) => mission.isDemo).map((mission) => mission.id));
      data.missions = data.missions.filter((mission) => !mission.isDemo);
      data.invoices = data.invoices.filter((invoice) => !invoice.missionId || !demoIds.has(invoice.missionId));
      data.directory = structuredClone(EMPTY_DIRECTORY);
    });
  }

  writeDirectory(seed: DirectorySeed): Promise<void> {
    return this.store.update((data) => {
      data.directory = structuredClone(seed);
    });
  }

  writeInvoices(invoices: Invoice[]): Promise<void> {
    return this.store.update((data) => {
      const known = new Set(invoices.map((invoice) => invoice.id));
      data.invoices = [...data.invoices.filter((invoice) => !known.has(invoice.id)), ...invoices];
    });
  }

  markVersion(version: number): Promise<void> {
    return this.store.update((data) => {
      data.demoVersion = version;
    });
  }
}

export function createFileRepositories(directory: string): Repositories {
  const store = new LocalFileStore(directory);
  return {
    kind: "local-file",
    missions: new FileMissionRepository(store),
    settings: new FileSettingsRepository(store),
    directory: new FileDirectoryRepository(store),
    demo: new FileDemoStore(store),
  };
}
