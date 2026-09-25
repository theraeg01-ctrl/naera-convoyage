import { describe, expect, it } from "vitest";
import { createSessionToken, parseContextKey, readSessionToken, SESSION_MAX_AGE_SECONDS } from "../auth/session-token";

const SECRET = "test-secret";
const USER = "d1000000-0000-4000-8000-000000000010";
const MEMBER = "d4000000-0000-4000-8000-000000000001";
const NOW = Date.UTC(2026, 8, 24, 12);

describe("jeton de session", () => {
  const token = createSessionToken({ userId: USER, context: { kind: "BUSINESS", memberId: MEMBER }, iat: NOW }, SECRET);

  it("se relit avec le bon secret", () => {
    expect(readSessionToken(token, SECRET, NOW + 1000)).toEqual({
      userId: USER,
      context: { kind: "BUSINESS", memberId: MEMBER },
      iat: NOW,
    });
  });

  it("refuse un autre secret, une signature ou un contenu modifiés", () => {
    expect(readSessionToken(token, "autre", NOW)).toBeNull();
    const [body, signature] = token.split(".");
    expect(readSessionToken(`${body}.${signature.slice(0, -2)}xx`, SECRET, NOW)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ u: USER, c: "staff", t: NOW })).toString("base64url");
    expect(readSessionToken(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("expire", () => {
    expect(readSessionToken(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS * 1000 + 1)).toBeNull();
  });

  it("refuse les formats invalides", () => {
    expect(readSessionToken(undefined, SECRET)).toBeNull();
    expect(readSessionToken("n'importe quoi", SECRET)).toBeNull();
    expect(parseContextKey("business:../../etc")).toBeNull();
    expect(parseContextKey("root")).toBeNull();
    expect(parseContextKey("staff")).toEqual({ kind: "STAFF" });
  });
});
