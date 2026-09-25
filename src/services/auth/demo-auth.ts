/**
 * Règle d'activation de la connexion de démonstration (fonction pure, testée).
 *
 * - Développement / test : active par défaut (désactivable avec NAERA_DEMO_AUTH="false").
 * - Production : DÉSACTIVÉE, sauf si NAERA_DEMO_AUTH vaut explicitement "true"
 *   ET qu'un secret de session NAERA_SESSION_SECRET est fourni. Aucune autre
 *   valeur (« 1 », « yes », vide…) ne l'active.
 */
export interface DemoAuthDecision {
  enabled: boolean;
  /** Secret de signature des sessions (null si la connexion de démo est coupée). */
  secret: string | null;
}

export const DEV_SESSION_SECRET = "naera-dev-only-session-secret";

export function resolveDemoAuth(env: {
  nodeEnv: string | undefined;
  flag: string | undefined;
  secret: string | undefined;
}): DemoAuthDecision {
  const flag = env.flag?.trim().toLowerCase();
  const secret = env.secret?.trim() || null;
  if (env.nodeEnv === "production") {
    return flag === "true" && secret ? { enabled: true, secret } : { enabled: false, secret: null };
  }
  if (flag === "false") return { enabled: false, secret: null };
  return { enabled: true, secret: secret ?? DEV_SESSION_SECRET };
}
