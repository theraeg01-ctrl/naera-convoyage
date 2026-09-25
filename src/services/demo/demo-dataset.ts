import type { BusinessMember, DriverProfile, PersonalCustomer, UserAccount } from "@/core/accounts/types";
import type {
  ContactPerson,
  CustomerSnapshot,
  MissionOwnership,
  MissionProgress,
  MissionStatus,
  VehicleInfo,
} from "@/core/mission/types";
import { DEFAULT_PLAN_FEATURES, PLAN_CODES, PLAN_LABELS } from "@/core/plans/features";
import { addDays, addMinutesToTime } from "@/core/shared/calendar";
import { nowTimeInZone, todayInZone, zonedLocalToUtcIso } from "@/core/shared/timezone";
import type { SelectableOptionId } from "@/core/settings/types";
import type { MissionRequest } from "@/core/simulation/types";
import type { DirectorySeed } from "@/repositories/types";

/**
 * Jeu de démonstration multi-portails. Identifiants fixes (idempotent),
 * dates calculées par rapport à aujourd'hui. Incrémenter la version force
 * la réinjection (les missions réelles ne sont jamais touchées).
 */
export const DEMO_DATASET_VERSION = 4;

const uuid = (group: number, n: number) => `d${group}000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const DEMO_IDS = {
  users: {
    admin: uuid(1, 1),
    dispatcher: uuid(1, 2),
    martinOwner: uuid(1, 10),
    martinOperator: uuid(1, 11),
    martinBilling: uuid(1, 12),
    martinInvited: uuid(1, 13),
    locautoOwner: uuid(1, 20),
    sophie: uuid(1, 30),
    driverMarc: uuid(1, 40),
    driverYanis: uuid(1, 41),
    driverClaire: uuid(1, 42),
    driverHugo: uuid(1, 43),
  },
  customers: { sophie: uuid(2, 1), camille: uuid(2, 2), lucas: uuid(2, 3) },
  businesses: { garageMartin: uuid(3, 1), locAutoNord: uuid(3, 2), autoPrestige: uuid(3, 3) },
  members: {
    martinOwner: uuid(4, 1),
    martinOperator: uuid(4, 2),
    martinBilling: uuid(4, 3),
    martinInvited: uuid(4, 4),
    locautoOwner: uuid(4, 10),
  },
  drivers: { marc: uuid(5, 1), yanis: uuid(5, 2), claire: uuid(5, 3), hugo: uuid(5, 4) },
} as const;

const U = DEMO_IDS.users;
const B = DEMO_IDS.businesses;
const D = DEMO_IDS.drivers;
const C = DEMO_IDS.customers;

const users: UserAccount[] = [
  { id: U.admin, email: "ines.moreau@naera.demo", name: "Inès Moreau", phone: null, staffRole: "ADMIN" },
  { id: U.dispatcher, email: "karim.haddad@naera.demo", name: "Karim Haddad", phone: null, staffRole: "DISPATCHER" },
  {
    id: U.martinOwner,
    email: "julien@garage-martin.demo",
    name: "Julien Martin",
    phone: "03 20 55 12 40",
    staffRole: null,
  },
  {
    id: U.martinOperator,
    email: "lea@garage-martin.demo",
    name: "Léa Petit",
    phone: "03 20 55 12 41",
    staffRole: null,
  },
  { id: U.martinBilling, email: "compta@garage-martin.demo", name: "Nadia Roux", phone: null, staffRole: null },
  { id: U.martinInvited, email: "paul@garage-martin.demo", name: "Paul Garnier", phone: null, staffRole: null },
  { id: U.locautoOwner, email: "thomas@locauto-nord.demo", name: "Thomas Lefèvre", phone: null, staffRole: null },
  {
    id: U.sophie,
    email: "sophie.durand@exemple.demo",
    name: "Sophie Durand",
    phone: "06 12 34 56 78",
    staffRole: null,
  },
  { id: U.driverMarc, email: "marc.dubois@naera.demo", name: "Marc Dubois", phone: "06 40 11 22 33", staffRole: null },
  {
    id: U.driverYanis,
    email: "yanis.benali@naera.demo",
    name: "Yanis Benali",
    phone: "06 40 44 55 66",
    staffRole: null,
  },
  {
    id: U.driverClaire,
    email: "claire.fontaine@naera.demo",
    name: "Claire Fontaine",
    phone: "06 40 77 88 99",
    staffRole: null,
  },
  {
    id: U.driverHugo,
    email: "hugo.lambert@naera.demo",
    name: "Hugo Lambert",
    phone: "06 41 00 11 22",
    staffRole: null,
  },
];

const personalCustomers: PersonalCustomer[] = [
  {
    id: C.sophie,
    userId: U.sophie,
    firstName: "Sophie",
    lastName: "Durand",
    email: "sophie.durand@exemple.demo",
    phone: "06 12 34 56 78",
    address: "Place de la Nation, 75011 Paris",
  },
  {
    id: C.camille,
    userId: null,
    firstName: "Camille",
    lastName: "Leroy",
    email: null,
    phone: "06 98 76 54 32",
    address: null,
  },
  { id: C.lucas, userId: null, firstName: "Lucas", lastName: "Bernard", email: null, phone: null, address: null },
];

const members: BusinessMember[] = [
  {
    id: DEMO_IDS.members.martinOwner,
    businessAccountId: B.garageMartin,
    userId: U.martinOwner,
    role: "OWNER",
    status: "ACTIVE",
  },
  {
    id: DEMO_IDS.members.martinOperator,
    businessAccountId: B.garageMartin,
    userId: U.martinOperator,
    role: "OPERATOR",
    status: "ACTIVE",
  },
  {
    id: DEMO_IDS.members.martinBilling,
    businessAccountId: B.garageMartin,
    userId: U.martinBilling,
    role: "BILLING",
    status: "ACTIVE",
  },
  {
    id: DEMO_IDS.members.martinInvited,
    businessAccountId: B.garageMartin,
    userId: U.martinInvited,
    role: "MANAGER",
    status: "INVITED",
  },
  {
    id: DEMO_IDS.members.locautoOwner,
    businessAccountId: B.locAutoNord,
    userId: U.locautoOwner,
    role: "OWNER",
    status: "ACTIVE",
  },
];

const drivers: DriverProfile[] = [
  {
    id: D.marc,
    userId: U.driverMarc,
    firstName: "Marc",
    lastName: "Dubois",
    phone: "06 40 11 22 33",
    homeCity: "Lille",
    status: "ACTIVE",
  },
  {
    id: D.yanis,
    userId: U.driverYanis,
    firstName: "Yanis",
    lastName: "Benali",
    phone: "06 40 44 55 66",
    homeCity: "Paris",
    status: "ACTIVE",
  },
  {
    id: D.claire,
    userId: U.driverClaire,
    firstName: "Claire",
    lastName: "Fontaine",
    phone: "06 40 77 88 99",
    homeCity: "Lille",
    status: "ACTIVE",
  },
  {
    id: D.hugo,
    userId: U.driverHugo,
    firstName: "Hugo",
    lastName: "Lambert",
    phone: "06 41 00 11 22",
    homeCity: "Arras",
    status: "ACTIVE",
  },
];

export function buildDemoDirectory(): DirectorySeed {
  return {
    users,
    personalCustomers,
    businessAccounts: [
      {
        id: B.garageMartin,
        name: "Garage Martin",
        segment: "GARAGE",
        billingEmail: "compta@garage-martin.demo",
        city: "Lille",
        pricingProfileId: null,
      },
      {
        id: B.locAutoNord,
        name: "Loc'Auto Nord",
        segment: "RENTAL",
        billingEmail: "factures@locauto-nord.demo",
        city: "Lille",
        pricingProfileId: null,
      },
      {
        id: B.autoPrestige,
        name: "Auto Prestige 76",
        segment: "DEALERSHIP",
        billingEmail: "contact@autoprestige76.demo",
        city: "Rouen",
        pricingProfileId: null,
      },
    ],
    members,
    drivers,
    plans: PLAN_CODES.map((code) => ({ code, name: PLAN_LABELS[code], features: [...DEFAULT_PLAN_FEATURES[code]] })),
    subscriptions: [
      { businessAccountId: B.garageMartin, planCode: "PRO_PLUS", status: "ACTIVE" },
      { businessAccountId: B.locAutoNord, planCode: "PRO_ESSENTIAL", status: "ACTIVE" },
    ],
    overrides: [],
  };
}

export interface DemoMissionSeed {
  request: MissionRequest;
  customer: CustomerSnapshot;
  vehicle: Pick<VehicleInfo, "make" | "model" | "plate">;
  status: MissionStatus;
  progress: MissionProgress;
  ownership: MissionOwnership;
  driverProfileId: string | null;
  contacts: { pickup: ContactPerson | null; dropoff: ContactPerson | null };
  /** Consignes (visibles du convoyeur et du client). */
  notes?: string;
  /** Note interne Naera. */
  internalNotes?: string;
}

type Vehicle = MissionRequest["vehicle"];

interface Leg {
  from: string;
  to: string;
}

const GARAGE = "12 rue Nationale, 59000 Lille";
const LEGS = {
  lilleArras: { from: GARAGE, to: "Place des Héros, 62000 Arras" },
  lilleValenciennes: { from: GARAGE, to: "Avenue de Liège, 59300 Valenciennes" },
  lilleParis: { from: GARAGE, to: "18 avenue de la Grande Armée, 75017 Paris" },
  lilleAmiens: { from: GARAGE, to: "Boulevard d'Alsace-Lorraine, 80000 Amiens" },
  dunkerqueLille: { from: "Quai des Hollandais, 59140 Dunkerque", to: GARAGE },
  lilleLens: { from: GARAGE, to: "Route de Béthune, 62300 Lens" },
  calaisLille: { from: "Boulevard Jacquard, 62100 Calais", to: GARAGE },
  lilleRouen: { from: GARAGE, to: "Quai du Havre, 76000 Rouen" },
  valenciennesLille: { from: "Rue de Famars, 59300 Valenciennes", to: GARAGE },
  lilleReims: { from: GARAGE, to: "Boulevard Lundy, 51100 Reims" },
} satisfies Record<string, Leg>;

const V = {
  sedanDiesel: { category: "SEDAN", fuelType: "DIESEL" },
  sedanPetrol: { category: "SEDAN", fuelType: "PETROL" },
  cityPetrol: { category: "CITY", fuelType: "PETROL" },
  suvDiesel: { category: "SUV", fuelType: "DIESEL" },
  suvHybrid: { category: "SUV", fuelType: "HYBRID" },
  vanDiesel: { category: "VAN", fuelType: "DIESEL" },
  premiumPetrol: { category: "PREMIUM", fuelType: "PETROL" },
  sedanElectric: { category: "SEDAN", fuelType: "ELECTRIC" },
  cityElectric: { category: "CITY", fuelType: "ELECTRIC" },
} satisfies Record<string, Vehicle>;

function request(leg: Leg, date: string, time: string, vehicle: Vehicle, optionIds: SelectableOptionId[] = []) {
  return {
    pickupAddress: leg.from,
    dropoffAddress: leg.to,
    date,
    time,
    vehicle,
    accessMode: "AUTO",
    returnMode: "AUTO",
    strategy: "BALANCED",
    waitingMin: 0,
    optionIds,
  } satisfies MissionRequest;
}

const GARAGE_MARTIN_CUSTOMER: CustomerSnapshot = {
  type: "PROFESSIONAL",
  companyName: "Garage Martin",
  phone: "03 20 55 12 40",
  email: "contact@garage-martin.demo",
};

const ATELIER: ContactPerson = { name: "Atelier Garage Martin", phone: "03 20 55 12 40" };

function ownership(input: Partial<MissionOwnership> & Pick<MissionOwnership, "channel">): MissionOwnership {
  return {
    businessAccountId: null,
    personalCustomerId: null,
    createdByUserId: null,
    customerReference: null,
    ...input,
  };
}

/** Jalons terrain d'une mission terminée, cohérents avec sa date et son heure. */
function completedProgress(date: string, time: string, durationMin: number): MissionProgress {
  const start = new Date(zonedLocalToUtcIso(date, time)).getTime();
  const at = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
  return {
    startedAt: at(-50),
    inspectedAt: at(15),
    drivingAt: at(25),
    deliveredAt: at(25 + durationMin),
    completedAt: at(40 + durationMin),
  };
}

interface MartinMission {
  leg: Leg;
  vehicle: Vehicle;
  model: Pick<VehicleInfo, "make" | "model" | "plate">;
  optionIds?: SelectableOptionId[];
  durationMin: number;
  dropoffContact: ContactPerson;
}

const MARTIN_COMPLETED: MartinMission[] = [
  {
    leg: LEGS.lilleArras,
    vehicle: V.sedanDiesel,
    model: { make: "Peugeot", model: "308", plate: "GF-104-KA" },
    durationMin: 55,
    dropoffContact: { name: "M. Caron", phone: "06 21 30 40 50" },
  },
  {
    leg: LEGS.lilleValenciennes,
    vehicle: V.cityPetrol,
    model: { make: "Renault", model: "Clio", plate: "GD-771-PL" },
    durationMin: 50,
    dropoffContact: { name: "Mme Lemaire", phone: "06 22 31 41 51" },
  },
  {
    leg: LEGS.lilleParis,
    vehicle: V.suvDiesel,
    model: { make: "Peugeot", model: "3008", plate: "FZ-208-JM" },
    optionIds: ["PHOTO_REPORT"],
    durationMin: 150,
    dropoffContact: { name: "Accueil Grande Armée Automobiles", phone: "01 45 00 12 12" },
  },
  {
    leg: LEGS.lilleAmiens,
    vehicle: V.sedanPetrol,
    model: { make: "Skoda", model: "Octavia", plate: "GB-390-TR" },
    durationMin: 95,
    dropoffContact: { name: "M. Dupuis", phone: "06 23 32 42 52" },
  },
  {
    leg: LEGS.dunkerqueLille,
    vehicle: V.vanDiesel,
    model: { make: "Renault", model: "Master", plate: "FX-612-DM" },
    durationMin: 60,
    dropoffContact: ATELIER,
  },
  {
    leg: LEGS.lilleLens,
    vehicle: V.cityPetrol,
    model: { make: "Citroën", model: "C3", plate: "GC-455-LN" },
    durationMin: 40,
    dropoffContact: { name: "Mme Vasseur", phone: "06 24 33 43 53" },
  },
  {
    leg: LEGS.calaisLille,
    vehicle: V.sedanPetrol,
    model: { make: "Volkswagen", model: "Golf", plate: "GA-908-CL" },
    optionIds: ["REINFORCED_CHECK"],
    durationMin: 75,
    dropoffContact: ATELIER,
  },
  {
    leg: LEGS.lilleRouen,
    vehicle: V.suvHybrid,
    model: { make: "Toyota", model: "RAV4", plate: "GE-127-RN" },
    durationMin: 175,
    dropoffContact: { name: "Rouen Occasions", phone: "02 35 00 45 45" },
  },
];

/** Préfixe « AAAA-MM- » du mois décalé de `delta` mois. */
function shiftMonth(date: string, delta: number): string {
  const index = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-`;
}

/**
 * Missions de démonstration. Garage Martin : 12 missions ce mois-ci
 * (8 terminées, 3 en cours, 1 à confirmer) + historique des mois précédents.
 */
export function buildDemoMissions(now: Date): DemoMissionSeed[] {
  const today = todayInZone(now);
  const monthStart = `${today.slice(0, 8)}01`;
  const monthEnd = addDays(`${shiftMonth(today, 1)}01`, -1);
  const clampToMonth = (date: string) => (date < monthStart ? monthStart : date > monthEnd ? monthEnd : date);
  const day = (offset: number) => addDays(today, offset);
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  /** Heure de départ d'une mission démarrée il y a `minutes` (arrondie à 5 min, dans la journée). */
  const startedTime = (minutes: number) => {
    const { time, dayOffset } = addMinutesToTime(nowTimeInZone(now), -minutes);
    if (dayOffset < 0) return "00:00";
    const [hh, mm] = time.split(":");
    return `${hh}:${String(Math.floor(Number(mm) / 5) * 5).padStart(2, "0")}`;
  };
  const martin = (createdByUserId: string, customerReference: string) =>
    ownership({ channel: "PRO_PORTAL", businessAccountId: B.garageMartin, createdByUserId, customerReference });

  const seeds: DemoMissionSeed[] = [];

  // Garage Martin — 8 missions terminées ce mois-ci.
  const completedOffsets = [-1, -2, -3, -5, -6, -8, -10, -13];
  MARTIN_COMPLETED.forEach((mission, index) => {
    const date = clampToMonth(day(completedOffsets[index]));
    const time = ["08:30", "09:00", "10:00", "14:00", "08:00", "15:30", "09:30", "11:00"][index];
    seeds.push({
      request: request(mission.leg, date, time, mission.vehicle, mission.optionIds),
      customer: GARAGE_MARTIN_CUSTOMER,
      vehicle: mission.model,
      status: "COMPLETED",
      progress: completedProgress(date, time, mission.durationMin),
      ownership: martin(index % 3 === 0 ? U.martinOwner : U.martinOperator, `BC-${4100 + index}`),
      driverProfileId: [D.marc, D.claire, D.hugo][index % 3],
      contacts: {
        pickup: mission.leg.from === GARAGE ? ATELIER : { name: "Point de collecte" },
        dropoff: mission.dropoffContact,
      },
    });
  });

  // Garage Martin — 3 missions en cours aujourd'hui, à des étapes différentes.
  seeds.push(
    {
      request: request(LEGS.lilleParis, today, startedTime(95), V.sedanDiesel),
      customer: GARAGE_MARTIN_CUSTOMER,
      vehicle: { make: "Peugeot", model: "308 SW", plate: "GH-482-TK" },
      status: "IN_PROGRESS",
      progress: { startedAt: ago(95), inspectedAt: ago(70), drivingAt: ago(55) },
      ownership: martin(U.martinOperator, "BC-4120"),
      driverProfileId: D.marc,
      contacts: { pickup: ATELIER, dropoff: { name: "Accueil Grande Armée Automobiles", phone: "01 45 00 12 12" } },
      notes: "Véhicule vendu, livraison au nouveau propriétaire.",
      // Note interne témoin : les tests vérifient qu'elle n'apparaît jamais hors back-office.
      internalNotes: "Marge serrée sur ce trajet : valider toute attente avec l'exploitation.",
    },
    {
      request: request(LEGS.lilleArras, today, startedTime(40), V.vanDiesel, ["PHOTO_REPORT"]),
      customer: GARAGE_MARTIN_CUSTOMER,
      vehicle: { make: "Citroën", model: "Berlingo", plate: "GJ-310-BV" },
      status: "IN_PROGRESS",
      progress: { startedAt: ago(40), inspectedAt: ago(10) },
      ownership: martin(U.martinOwner, "BC-4121"),
      driverProfileId: D.hugo,
      contacts: { pickup: ATELIER, dropoff: { name: "M. Caron", phone: "06 21 30 40 50" } },
    },
    {
      request: request(LEGS.valenciennesLille, today, startedTime(15), V.suvHybrid),
      customer: GARAGE_MARTIN_CUSTOMER,
      vehicle: { make: "Renault", model: "Captur", plate: "GK-044-VC" },
      status: "IN_PROGRESS",
      progress: { startedAt: ago(15) },
      ownership: martin(U.martinOperator, "BC-4122"),
      driverProfileId: D.claire,
      contacts: { pickup: { name: "Mme Lemaire", phone: "06 22 31 41 51" }, dropoff: ATELIER },
    },
  );

  // Garage Martin — 1 devis à confirmer.
  seeds.push({
    request: request(LEGS.lilleReims, clampToMonth(day(2)), "09:00", V.premiumPetrol, ["REINFORCED_CHECK"]),
    customer: GARAGE_MARTIN_CUSTOMER,
    vehicle: { make: "BMW", model: "Série 1", plate: "GL-770-BM" },
    status: "QUOTED",
    progress: {},
    ownership: martin(U.martinOperator, "BC-4123"),
    driverProfileId: null,
    contacts: { pickup: ATELIER, dropoff: { name: "Reims Premium Cars", phone: "03 26 00 77 77" } },
  });

  // Garage Martin — historique des 5 mois précédents (analytics).
  const history = [3, 2, 3, 2, 2];
  history.forEach((count, monthIndex) => {
    const monthDate = shiftMonth(monthStart, -(monthIndex + 1));
    for (let n = 0; n < count; n += 1) {
      const mission = MARTIN_COMPLETED[(monthIndex * 3 + n) % MARTIN_COMPLETED.length];
      const date = `${monthDate}${String(6 + n * 8).padStart(2, "0")}`;
      seeds.push({
        request: request(mission.leg, date, "09:00", mission.vehicle, mission.optionIds),
        customer: GARAGE_MARTIN_CUSTOMER,
        vehicle: mission.model,
        status: "COMPLETED",
        progress: completedProgress(date, "09:00", mission.durationMin),
        ownership: martin(n % 2 === 0 ? U.martinOwner : U.martinOperator, `BC-${3900 + monthIndex * 10 + n}`),
        driverProfileId: [D.marc, D.claire, D.hugo][n % 3],
        contacts: { pickup: ATELIER, dropoff: mission.dropoffContact },
      });
    }
  });

  // Loc'Auto Nord — second compte professionnel (isolation des données).
  const locauto = (customerReference: string) =>
    ownership({
      channel: "PRO_PORTAL",
      businessAccountId: B.locAutoNord,
      createdByUserId: U.locautoOwner,
      customerReference,
    });
  const locautoCustomer: CustomerSnapshot = {
    type: "PROFESSIONAL",
    companyName: "Loc'Auto Nord",
    phone: "03 20 90 00 00",
  };
  const locautoCompleted = day(-2);
  seeds.push(
    {
      request: request(
        { from: "Porte Maillot, 75017 Paris", to: "Gare Lille-Europe, 59000 Lille" },
        locautoCompleted,
        "07:30",
        V.vanDiesel,
      ),
      customer: locautoCustomer,
      vehicle: { make: "Renault", model: "Trafic", plate: "FD-350-RN" },
      status: "COMPLETED",
      progress: completedProgress(locautoCompleted, "07:30", 150),
      ownership: locauto("LAN-2291"),
      driverProfileId: D.claire,
      contacts: {
        pickup: { name: "Agence Porte Maillot" },
        dropoff: { name: "Agence Lille-Europe", phone: "03 20 90 00 01" },
      },
    },
    {
      request: request(
        { from: "Gare Lille-Europe, 59000 Lille", to: "Quai des Hollandais, 59140 Dunkerque" },
        day(1),
        "08:30",
        V.sedanPetrol,
      ),
      customer: locautoCustomer,
      vehicle: { make: "Peugeot", model: "508", plate: "GH-902-LA" },
      status: "ASSIGNED",
      progress: {},
      ownership: locauto("LAN-2295"),
      driverProfileId: D.marc,
      contacts: {
        pickup: { name: "Agence Lille-Europe", phone: "03 20 90 00 01" },
        dropoff: { name: "Agence Dunkerque" },
      },
    },
    {
      request: request(
        { from: "Gare Lille-Europe, 59000 Lille", to: "Aéroport Charles-de-Gaulle, 95700 Roissy-en-France" },
        day(3),
        "06:30",
        V.cityElectric,
      ),
      customer: locautoCustomer,
      vehicle: { make: "Renault", model: "Zoé", plate: "GF-510-ZE" },
      status: "CONFIRMED",
      progress: {},
      ownership: locauto("LAN-2298"),
      driverProfileId: null,
      contacts: {
        pickup: { name: "Agence Lille-Europe", phone: "03 20 90 00 01" },
        dropoff: { name: "Agence CDG T2" },
      },
    },
  );

  // Sophie Durand — particulier : une commande en cours, une commande passée.
  const sophie = ownership({ channel: "CLIENT_PORTAL", personalCustomerId: C.sophie, createdByUserId: U.sophie });
  const sophieCustomer: CustomerSnapshot = {
    type: "INDIVIDUAL",
    firstName: "Sophie",
    lastName: "Durand",
    phone: "06 12 34 56 78",
    email: "sophie.durand@exemple.demo",
  };
  const sophiePast = addDays(monthStart, -40);
  seeds.push(
    {
      request: request(
        { from: "Place de la Nation, 75011 Paris", to: "Cours Lafayette, 69003 Lyon" },
        today,
        startedTime(130),
        V.sedanElectric,
        ["PHOTO_INSPECTION", "KEY_HANDOVER"],
      ),
      customer: sophieCustomer,
      vehicle: { make: "Tesla", model: "Model 3", plate: "FR-221-EV" },
      status: "IN_PROGRESS",
      progress: { startedAt: ago(130), inspectedAt: ago(100), drivingAt: ago(85) },
      ownership: sophie,
      driverProfileId: D.yanis,
      contacts: {
        pickup: { name: "Sophie Durand", phone: "06 12 34 56 78" },
        dropoff: { name: "Marc Durand", phone: "06 55 44 33 22" },
      },
      notes: "Clés à remettre en main propre.",
    },
    {
      request: request(
        { from: "Place de la Nation, 75011 Paris", to: "Rue Jeanne d'Arc, 76000 Rouen" },
        sophiePast,
        "10:00",
        V.cityElectric,
      ),
      customer: sophieCustomer,
      vehicle: { make: "Renault", model: "Zoé", plate: "FB-118-SD" },
      status: "COMPLETED",
      progress: completedProgress(sophiePast, "10:00", 105),
      ownership: sophie,
      driverProfileId: D.yanis,
      contacts: {
        pickup: { name: "Sophie Durand", phone: "06 12 34 56 78" },
        dropoff: { name: "Sophie Durand", phone: "06 12 34 56 78" },
      },
    },
  );

  // Missions gérées par Naera (clients sans espace en ligne).
  const camilleDate = day(-5);
  seeds.push(
    {
      request: request(
        { from: "Avenue d'Italie, 75013 Paris", to: "Rue Jeanne d'Arc, 76000 Rouen" },
        camilleDate,
        "09:30",
        V.suvHybrid,
      ),
      customer: { type: "INDIVIDUAL", firstName: "Camille", lastName: "Leroy", phone: "06 98 76 54 32" },
      vehicle: { make: "Toyota", model: "C-HR", plate: "GK-808-HY" },
      status: "COMPLETED",
      progress: completedProgress(camilleDate, "09:30", 110),
      ownership: ownership({ channel: "BACKOFFICE", personalCustomerId: C.camille, createdByUserId: U.dispatcher }),
      driverProfileId: D.yanis,
      contacts: { pickup: { name: "Camille Leroy", phone: "06 98 76 54 32" }, dropoff: { name: "Camille Leroy" } },
    },
    {
      request: request(
        { from: "Rue de Rivoli, 75004 Paris", to: "Quai des Chartrons, 33000 Bordeaux" },
        day(3),
        "08:00",
        V.cityPetrol,
      ),
      customer: { type: "INDIVIDUAL", firstName: "Lucas", lastName: "Bernard" },
      vehicle: { make: "Renault", model: "Clio", plate: "GA-117-LM" },
      status: "DRAFT",
      progress: {},
      ownership: ownership({ channel: "BACKOFFICE", personalCustomerId: C.lucas, createdByUserId: U.dispatcher }),
      driverProfileId: null,
      contacts: { pickup: null, dropoff: null },
      internalNotes: "Client flexible sur l'horaire de livraison.",
    },
    {
      request: request(
        { from: "Boulevard Haussmann, 75009 Paris", to: "Quai du Havre, 76000 Rouen" },
        day(1),
        "10:00",
        V.premiumPetrol,
        ["PHOTO_REPORT"],
      ),
      customer: { type: "PROFESSIONAL", companyName: "Auto Prestige 76", email: "contact@autoprestige76.demo" },
      vehicle: { make: "BMW", model: "Série 3", plate: "EZ-904-QB" },
      status: "QUOTED",
      progress: {},
      ownership: ownership({ channel: "BACKOFFICE", businessAccountId: B.autoPrestige, createdByUserId: U.dispatcher }),
      driverProfileId: null,
      contacts: {
        pickup: { name: "Showroom Haussmann" },
        dropoff: { name: "Auto Prestige 76", phone: "02 35 11 22 33" },
      },
    },
    {
      request: request(
        { from: "Rue de Vaugirard, 75015 Paris", to: "Place Bellecour, 69002 Lyon" },
        day(-1),
        "11:00",
        V.sedanPetrol,
      ),
      customer: { type: "PROFESSIONAL", companyName: "Concession Lyon Sud" },
      vehicle: { make: "Volkswagen", model: "Passat" },
      status: "CANCELLED",
      progress: {},
      ownership: ownership({ channel: "BACKOFFICE", createdByUserId: U.dispatcher }),
      driverProfileId: null,
      contacts: { pickup: null, dropoff: null },
      internalNotes: "Annulée par le client (véhicule vendu sur place).",
    },
  );

  return seeds;
}
