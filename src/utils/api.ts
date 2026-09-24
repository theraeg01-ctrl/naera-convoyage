import type { UseCaseResult } from "@/services/use-cases";

const STATUS_BY_CODE: Record<string, number> = {
  INVALID_INPUT: 400,
  ROUTE_REQUIRED: 422,
  INVALID_ACTION: 409,
  NOT_FOUND: 404,
};

/** Réponse JSON homogène pour l'API v1 : { data } ou { error: { code, message } }. */
export function jsonResult<T>(result: UseCaseResult<T>, successStatus = 200): Response {
  if (result.ok) return Response.json({ data: result.data }, { status: successStatus });
  return Response.json(
    { error: { code: result.code, message: result.message, fieldErrors: result.fieldErrors } },
    { status: STATUS_BY_CODE[result.code] ?? 500 },
  );
}

export function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
