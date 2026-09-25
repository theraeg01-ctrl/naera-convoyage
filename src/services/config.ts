import "server-only";
import { resolveDemoAuth } from "./auth/demo-auth";

/**
 * Lecture centralisée des variables d'environnement côté serveur.
 * Aucune clé n'est exposée au navigateur (pas de préfixe NEXT_PUBLIC_).
 */
function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const serverConfig = {
  get databaseUrl() {
    return readEnv("DATABASE_URL");
  },
  get googleMapsApiKey() {
    return readEnv("GOOGLE_MAPS_API_KEY");
  },
  get navitiaApiKey() {
    return readEnv("NAVITIA_API_KEY");
  },
  get sncfApiKey() {
    return readEnv("SNCF_API_KEY");
  },
  get uberClientId() {
    return readEnv("UBER_CLIENT_ID");
  },
  get uberClientSecret() {
    return readEnv("UBER_CLIENT_SECRET");
  },
  get localDataDir() {
    return readEnv("LOCAL_DATA_DIR");
  },
  /** Connexion de démonstration : voir resolveDemoAuth (désactivée par défaut en production). */
  get demoAuth() {
    return resolveDemoAuth({
      nodeEnv: process.env.NODE_ENV,
      flag: readEnv("NAERA_DEMO_AUTH"),
      secret: readEnv("NAERA_SESSION_SECRET"),
    });
  },
};

export type IntegrationState = "CONNECTED" | "KEY_ONLY" | "SIMULATED";

export interface IntegrationStatus {
  id: string;
  label: string;
  description: string;
  state: IntegrationState;
}

/** État des connexions externes, affiché dans les paramètres. */
export function getIntegrationStatuses(): IntegrationStatus[] {
  const hasGoogle = Boolean(serverConfig.googleMapsApiKey);
  const keyOnly = (configured: boolean): IntegrationState => (configured ? "KEY_ONLY" : "SIMULATED");
  return [
    {
      id: "google-routes",
      label: "Google Routes",
      description: "Distance, durée avec trafic, péages, itinéraires alternatifs",
      state: hasGoogle ? "CONNECTED" : "SIMULATED",
    },
    {
      id: "google-places",
      label: "Autocomplétion d'adresses",
      description: "Suggestions d'adresses (Google Places)",
      state: keyOnly(hasGoogle),
    },
    {
      id: "sncf",
      label: "SNCF",
      description: "Horaires et prix des trains",
      state: keyOnly(Boolean(serverConfig.sncfApiKey)),
    },
    {
      id: "navitia",
      label: "Navitia",
      description: "Transports publics (RER, métro, bus, car)",
      state: keyOnly(Boolean(serverConfig.navitiaApiKey)),
    },
    {
      id: "uber",
      label: "Uber",
      description: "Estimation de prix VTC",
      state: keyOnly(Boolean(serverConfig.uberClientId && serverConfig.uberClientSecret)),
    },
  ];
}
