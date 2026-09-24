import type { AppSettings } from "@/core/settings/types";
import type { ManualLeg, TransportPreference } from "@/core/simulation/types";
import type { TransportOption } from "@/core/transport/types";
import { TrainService } from "./train-service";
import { TransitService } from "./transit-service";
import { derivedSource, type LegRequest } from "./types";
import { VtcService } from "./vtc-service";

const COMPANION_MIN_KM = 15;
const PERSONAL_VEHICLE_MAX_KM = 30;

/**
 * ReturnTransportService : rassemble toutes les solutions possibles pour
 * un trajet convoyeur (retour ou aller). Le classement et la recommandation
 * sont faits par le moteur métier (calculateTransportScore), pas ici.
 */
export class ReturnTransportService {
  private readonly train = new TrainService();
  private readonly transit = new TransitService();
  private readonly vtc: VtcService;

  constructor(private readonly settings: AppSettings) {
    this.vtc = new VtcService(settings.transport);
  }

  private companion(leg: LegRequest): TransportOption | null {
    if (leg.direction !== "RETURN" || leg.isLocal || leg.distanceKm === null || leg.distanceKm < COMPANION_MIN_KM) {
      return null;
    }
    const roundTripKm = leg.distanceKm * 2;
    return {
      id: "return-companion",
      mode: "COMPANION",
      direction: "RETURN",
      price: Math.round(this.settings.transport.companionCostPerKm * roundTripKm),
      durationMin: leg.roadDurationMin ?? Math.round((leg.distanceKm / 90) * 60),
      connections: 0,
      simplicity: 0.9,
      detail: `Second véhicule · ${Math.round(roundTripKm)} km aller-retour`,
      distanceKm: roundTripKm,
      source: derivedSource(leg.roadSource),
    };
  }

  /** Uniquement sur demande : le véhicule du convoyeur resterait garé au point de départ. */
  private personalVehicle(leg: LegRequest, preference: TransportPreference): TransportOption | null {
    if (leg.direction !== "ACCESS" || preference !== "PERSONAL_VEHICLE") return null;
    const distanceKm = leg.isLocal ? 8 : leg.distanceKm;
    if (distanceKm === null || distanceKm > PERSONAL_VEHICLE_MAX_KM) return null;
    return {
      id: "access-personal",
      mode: "PERSONAL_VEHICLE",
      direction: "ACCESS",
      price: Math.round(this.settings.transport.personalVehicleCostPerKm * distanceKm * 100) / 100,
      durationMin: leg.isLocal ? 25 : (leg.roadDurationMin ?? Math.round((distanceKm / 40) * 60)),
      connections: 0,
      simplicity: 0.9,
      detail: "Indemnité kilométrique",
      distanceKm,
      source: leg.isLocal ? "SIMULATED" : derivedSource(leg.roadSource),
    };
  }

  private manual(leg: LegRequest, manual: ManualLeg | undefined): TransportOption | null {
    if (!manual) return null;
    return {
      id: `${leg.direction.toLowerCase()}-other`,
      mode: "OTHER",
      direction: leg.direction,
      price: manual.price,
      durationMin: manual.durationMin,
      connections: 0,
      simplicity: 0.7,
      detail: manual.label || "Saisie manuelle",
      source: "MANUAL",
    };
  }

  compare(leg: LegRequest, preference: TransportPreference = "AUTO", manual?: ManualLeg): TransportOption[] {
    return [
      this.train.estimate(leg),
      this.transit.estimate(leg),
      this.vtc.estimateVtc(leg),
      this.vtc.estimateTaxi(leg),
      this.companion(leg),
      this.personalVehicle(leg, preference),
      this.manual(leg, manual),
    ].filter((option): option is TransportOption => option !== null);
  }
}
