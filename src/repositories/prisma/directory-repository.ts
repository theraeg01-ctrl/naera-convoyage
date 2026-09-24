import type {
  BusinessAccount,
  BusinessMember,
  DriverProfile,
  Invoice,
  PersonalCustomer,
  UserAccount,
} from "@/core/accounts/types";
import type { Actor, ActorContextRef } from "@/core/access/actor";
import {
  FEATURE_KEYS,
  NO_ENTITLEMENTS,
  PLAN_CODES,
  resolveEntitlements,
  type FeatureKey,
  type PlanCode,
} from "@/core/plans/features";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type {
  BusinessAccountView,
  DemoStore,
  DirectoryRepository,
  DirectorySeed,
  InvoiceScope,
  MemberView,
  PlanView,
} from "../types";

const DEMO_VERSION_KEY = "demo-dataset-version";

const isFeature = (key: string): key is FeatureKey => (FEATURE_KEYS as readonly string[]).includes(key);
const isPlan = (code: string): code is PlanCode => (PLAN_CODES as readonly string[]).includes(code);

type UserRow = Prisma.UserGetPayload<object>;
type DriverRow = Prisma.DriverProfileGetPayload<object>;
type PersonalRow = Prisma.PersonalCustomerGetPayload<object>;
type AccountRow = Prisma.BusinessAccountGetPayload<object>;

const toUser = (row: UserRow): UserAccount => ({
  id: row.id,
  email: row.email,
  name: row.name,
  phone: row.phone,
  staffRole: row.staffRole,
});

const toDriver = (row: DriverRow): DriverProfile => ({
  id: row.id,
  userId: row.userId,
  firstName: row.firstName,
  lastName: row.lastName,
  phone: row.phone,
  homeCity: row.homeCity,
  status: row.status,
});

const toPersonal = (row: PersonalRow): PersonalCustomer => ({
  id: row.id,
  userId: row.userId,
  firstName: row.firstName,
  lastName: row.lastName,
  email: row.email,
  phone: row.phone,
  address: row.address,
});

const toAccount = (row: AccountRow): BusinessAccount => ({
  id: row.id,
  name: row.name,
  segment: row.segment,
  billingEmail: row.billingEmail,
  city: row.city,
  pricingProfileId: row.pricingProfileId,
});

const ACCOUNT_INCLUDE = {
  subscription: { include: { plan: { include: { features: { include: { feature: true } } } } } },
  featureOverrides: { include: { feature: true } },
  _count: { select: { members: { where: { status: { not: "DISABLED" } } } } },
} as const satisfies Prisma.BusinessAccountInclude;

type AccountWithPlan = Prisma.BusinessAccountGetPayload<{ include: typeof ACCOUNT_INCLUDE }>;

function toAccountView(row: AccountWithPlan): BusinessAccountView {
  const subscription = row.subscription;
  const planCode = subscription && isPlan(subscription.plan.code) ? subscription.plan.code : null;
  const entitlements = subscription
    ? resolveEntitlements({
        planCode,
        status: subscription.status,
        planFeatures: subscription.plan.features.map((entry) => entry.feature.key),
        overrides: row.featureOverrides
          .filter((override) => isFeature(override.feature.key))
          .map((override) => ({ feature: override.feature.key as FeatureKey, enabled: override.enabled })),
      })
    : NO_ENTITLEMENTS;
  return { account: toAccount(row), entitlements, memberCount: row._count.members };
}

function toInvoice(row: Prisma.InvoiceGetPayload<object>): Invoice {
  return {
    id: row.id,
    number: row.number,
    missionId: row.missionId,
    businessAccountId: row.businessAccountId,
    personalCustomerId: row.personalCustomerId,
    status: row.status,
    issuedAt: row.issuedAt.toISOString(),
    dueAt: row.dueAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    amountHT: Number(row.amountHT),
    vatAmount: Number(row.vatAmount),
    amountTTC: Number(row.amountTTC),
  };
}

export class PrismaDirectoryRepository implements DirectoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listActors(): Promise<Actor[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { name: "asc" },
      include: {
        memberships: { where: { status: "ACTIVE" }, include: { businessAccount: true } },
        personalCustomer: true,
        driverProfile: true,
      },
    });
    return users.flatMap((user): Actor[] => [
      ...(user.staffRole
        ? [{ kind: "STAFF" as const, userId: user.id, name: user.name, staffRole: user.staffRole }]
        : []),
      ...user.memberships.map((member) => ({
        kind: "BUSINESS" as const,
        userId: user.id,
        name: user.name,
        memberId: member.id,
        businessAccountId: member.businessAccountId,
        businessName: member.businessAccount.name,
        role: member.role,
      })),
      ...(user.personalCustomer
        ? [
            {
              kind: "PERSONAL" as const,
              userId: user.id,
              name: `${user.personalCustomer.firstName} ${user.personalCustomer.lastName}`.trim(),
              personalCustomerId: user.personalCustomer.id,
            },
          ]
        : []),
      ...(user.driverProfile && user.driverProfile.status === "ACTIVE"
        ? [
            {
              kind: "DRIVER" as const,
              userId: user.id,
              name: `${user.driverProfile.firstName} ${user.driverProfile.lastName}`.trim(),
              driverProfileId: user.driverProfile.id,
            },
          ]
        : []),
    ]);
  }

  async resolveActor(userId: string, context: ActorContextRef): Promise<Actor | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    switch (context.kind) {
      case "STAFF":
        return user.staffRole ? { kind: "STAFF", userId, name: user.name, staffRole: user.staffRole } : null;
      case "BUSINESS": {
        const member = await this.prisma.businessMember.findFirst({
          where: { id: context.memberId, userId, status: "ACTIVE" },
          include: { businessAccount: true },
        });
        return member
          ? {
              kind: "BUSINESS",
              userId,
              name: user.name,
              memberId: member.id,
              businessAccountId: member.businessAccountId,
              businessName: member.businessAccount.name,
              role: member.role,
            }
          : null;
      }
      case "PERSONAL": {
        const customer = await this.prisma.personalCustomer.findFirst({
          where: { id: context.personalCustomerId, userId },
        });
        return customer
          ? {
              kind: "PERSONAL",
              userId,
              name: `${customer.firstName} ${customer.lastName}`.trim(),
              personalCustomerId: customer.id,
            }
          : null;
      }
      case "DRIVER": {
        const driver = await this.prisma.driverProfile.findFirst({
          where: { id: context.driverProfileId, userId, status: "ACTIVE" },
        });
        return driver
          ? {
              kind: "DRIVER",
              userId,
              name: `${driver.firstName} ${driver.lastName}`.trim(),
              driverProfileId: driver.id,
            }
          : null;
      }
    }
  }

  async getUser(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async getBusinessAccount(id: string) {
    const row = await this.prisma.businessAccount.findUnique({ where: { id }, include: ACCOUNT_INCLUDE });
    return row ? toAccountView(row) : null;
  }

  async listBusinessAccounts() {
    const rows = await this.prisma.businessAccount.findMany({ include: ACCOUNT_INCLUDE, orderBy: { name: "asc" } });
    return rows.map(toAccountView);
  }

  async listMembers(businessAccountId: string): Promise<MemberView[]> {
    const rows = await this.prisma.businessMember.findMany({
      where: { businessAccountId },
      include: { user: true },
      orderBy: { invitedAt: "asc" },
    });
    return rows.map((row) => ({
      member: {
        id: row.id,
        businessAccountId: row.businessAccountId,
        userId: row.userId,
        role: row.role,
        status: row.status,
      } satisfies BusinessMember,
      user: toUser(row.user),
    }));
  }

  async getPersonalCustomer(id: string) {
    const row = await this.prisma.personalCustomer.findUnique({ where: { id } });
    return row ? toPersonal(row) : null;
  }

  async listPersonalCustomers() {
    return (await this.prisma.personalCustomer.findMany({ orderBy: { lastName: "asc" } })).map(toPersonal);
  }

  async listDriverProfiles() {
    return (await this.prisma.driverProfile.findMany({ orderBy: { lastName: "asc" } })).map(toDriver);
  }

  async getDriverProfile(id: string) {
    const row = await this.prisma.driverProfile.findUnique({ where: { id } });
    return row ? toDriver(row) : null;
  }

  async listInvoices(scope: InvoiceScope) {
    const where: Prisma.InvoiceWhereInput =
      scope.kind === "ALL"
        ? {}
        : scope.kind === "BUSINESS"
          ? { businessAccountId: scope.businessAccountId }
          : { personalCustomerId: scope.personalCustomerId };
    return (await this.prisma.invoice.findMany({ where, orderBy: { issuedAt: "desc" } })).map(toInvoice);
  }

  async listPlans(): Promise<PlanView[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { features: { include: { feature: true } } },
    });
    return plans
      .filter((plan) => isPlan(plan.code))
      .map((plan) => ({
        code: plan.code as PlanCode,
        name: plan.name,
        features: plan.features.map((entry) => entry.feature.key).filter(isFeature),
      }));
  }
}

/** Injection idempotente (identifiants fixes) des données de démonstration dans PostgreSQL. */
export class PrismaDemoStore implements DemoStore {
  constructor(private readonly prisma: PrismaClient) {}

  async currentVersion(): Promise<number> {
    return (await this.prisma.sequence.findUnique({ where: { key: DEMO_VERSION_KEY } }))?.value ?? 0;
  }

  /**
   * Supprime missions et factures de démonstration, puis les comptes devenus
   * des coquilles vides qui n'existaient que par elles (ex. comptes créés par
   * la migration à partir des anciennes missions de démo). Un compte qui a
   * encore une mission, un membre, un abonnement, une facture ou un devis
   * n'est jamais supprimé.
   */
  async clearDemoData(): Promise<void> {
    const prisma = this.prisma;
    const demo = await prisma.mission.findMany({
      where: { isDemo: true },
      select: { businessAccountId: true, personalCustomerId: true },
    });
    const businessIds = [...new Set(demo.flatMap((row) => (row.businessAccountId ? [row.businessAccountId] : [])))];
    const personalIds = [...new Set(demo.flatMap((row) => (row.personalCustomerId ? [row.personalCustomerId] : [])))];
    await prisma.$transaction([
      prisma.invoice.deleteMany({ where: { mission: { isDemo: true } } }),
      prisma.mission.deleteMany({ where: { isDemo: true } }),
    ]);
    const quotedBusinesses = new Set(
      (
        await prisma.quote.findMany({
          where: { businessAccountId: { in: businessIds } },
          select: { businessAccountId: true },
        })
      ).map((quote) => quote.businessAccountId),
    );
    const quotedCustomers = new Set(
      (
        await prisma.quote.findMany({
          where: { personalCustomerId: { in: personalIds } },
          select: { personalCustomerId: true },
        })
      ).map((quote) => quote.personalCustomerId),
    );
    await prisma.businessAccount.deleteMany({
      where: {
        id: { in: businessIds.filter((id) => !quotedBusinesses.has(id)) },
        missions: { none: {} },
        members: { none: {} },
        invoices: { none: {} },
        subscription: { is: null },
        agencies: { none: {} },
        costCenters: { none: {} },
      },
    });
    await prisma.personalCustomer.deleteMany({
      where: {
        id: { in: personalIds.filter((id) => !quotedCustomers.has(id)) },
        userId: null,
        missions: { none: {} },
        invoices: { none: {} },
      },
    });
  }

  async writeDirectory(seed: DirectorySeed): Promise<void> {
    const prisma = this.prisma;
    for (const user of seed.users) {
      const data = { email: user.email, name: user.name, phone: user.phone, staffRole: user.staffRole };
      await prisma.user.upsert({ where: { id: user.id }, create: { id: user.id, ...data }, update: data });
    }
    for (const customer of seed.personalCustomers) {
      const { id, ...data } = customer;
      await prisma.personalCustomer.upsert({ where: { id }, create: customer, update: data });
    }
    for (const account of seed.businessAccounts) {
      const { id, ...data } = account;
      await prisma.businessAccount.upsert({ where: { id }, create: account, update: data });
    }
    for (const member of seed.members) {
      const { id, ...data } = member;
      await prisma.businessMember.upsert({ where: { id }, create: member, update: data });
    }
    for (const driver of seed.drivers) {
      const { id, ...data } = driver;
      await prisma.driverProfile.upsert({ where: { id }, create: driver, update: data });
    }
    for (const [index, plan] of seed.plans.entries()) {
      const saved = await prisma.plan.upsert({
        where: { code: plan.code },
        create: { code: plan.code, name: plan.name, sortOrder: index },
        update: { name: plan.name, sortOrder: index },
      });
      const features = [];
      for (const key of plan.features) {
        features.push(await prisma.feature.upsert({ where: { key }, create: { key, name: key }, update: {} }));
      }
      await prisma.planFeature.deleteMany({ where: { planId: saved.id } });
      await prisma.planFeature.createMany({
        data: features.map((feature) => ({ planId: saved.id, featureId: feature.id })),
      });
    }
    for (const subscription of seed.subscriptions) {
      const plan = await prisma.plan.findUniqueOrThrow({ where: { code: subscription.planCode } });
      await prisma.subscription.upsert({
        where: { businessAccountId: subscription.businessAccountId },
        create: { businessAccountId: subscription.businessAccountId, planId: plan.id, status: subscription.status },
        update: { planId: plan.id, status: subscription.status },
      });
    }
    for (const entry of seed.overrides) {
      for (const override of entry.overrides) {
        const feature = await prisma.feature.upsert({
          where: { key: override.feature },
          create: { key: override.feature, name: override.feature },
          update: {},
        });
        await prisma.featureOverride.upsert({
          where: { businessAccountId_featureId: { businessAccountId: entry.businessAccountId, featureId: feature.id } },
          create: { businessAccountId: entry.businessAccountId, featureId: feature.id, enabled: override.enabled },
          update: { enabled: override.enabled },
        });
      }
    }
  }

  async writeInvoices(invoices: Invoice[]): Promise<void> {
    for (const invoice of invoices) {
      const data = {
        number: invoice.number,
        missionId: invoice.missionId,
        businessAccountId: invoice.businessAccountId,
        personalCustomerId: invoice.personalCustomerId,
        status: invoice.status,
        issuedAt: new Date(invoice.issuedAt),
        dueAt: invoice.dueAt ? new Date(invoice.dueAt) : null,
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : null,
        amountHT: invoice.amountHT,
        vatAmount: invoice.vatAmount,
        amountTTC: invoice.amountTTC,
      };
      await this.prisma.invoice.upsert({
        where: { id: invoice.id },
        create: { id: invoice.id, ...data },
        update: data,
      });
    }
  }

  async markVersion(version: number): Promise<void> {
    await this.prisma.sequence.upsert({
      where: { key: DEMO_VERSION_KEY },
      create: { key: DEMO_VERSION_KEY, value: version },
      update: { value: version },
    });
  }
}
