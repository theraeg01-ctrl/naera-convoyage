import { describe, expect, it } from "vitest";
import { DEV_SESSION_SECRET, resolveDemoAuth } from "../auth/demo-auth";

describe("connexion de démonstration", () => {
  it("production : désactivée par défaut", () => {
    expect(resolveDemoAuth({ nodeEnv: "production", flag: undefined, secret: "s3cret" })).toEqual({
      enabled: false,
      secret: null,
    });
  });

  it("production : seule la valeur explicite « true » l'active, et jamais sans secret", () => {
    for (const flag of ["1", "yes", "on", "", " ", "vrai", "false"]) {
      expect(resolveDemoAuth({ nodeEnv: "production", flag, secret: "s3cret" }).enabled, flag).toBe(false);
    }
    expect(resolveDemoAuth({ nodeEnv: "production", flag: "true", secret: undefined }).enabled).toBe(false);
    expect(resolveDemoAuth({ nodeEnv: "production", flag: "true", secret: "  " }).enabled).toBe(false);
    expect(resolveDemoAuth({ nodeEnv: "production", flag: "true", secret: "s3cret" })).toEqual({
      enabled: true,
      secret: "s3cret",
    });
  });

  it("production : jamais de secret de développement implicite", () => {
    expect(resolveDemoAuth({ nodeEnv: "production", flag: "true", secret: undefined }).secret).toBeNull();
  });

  it("développement : active par défaut, désactivable", () => {
    expect(resolveDemoAuth({ nodeEnv: "development", flag: undefined, secret: undefined })).toEqual({
      enabled: true,
      secret: DEV_SESSION_SECRET,
    });
    expect(resolveDemoAuth({ nodeEnv: "development", flag: "false", secret: undefined }).enabled).toBe(false);
    expect(resolveDemoAuth({ nodeEnv: "test", flag: undefined, secret: "custom" }).secret).toBe("custom");
  });
});
