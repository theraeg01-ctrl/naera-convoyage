import { getSettings } from "@/services/settings/settings-service";

/** GET /api/v1/settings — paramètres de tarification en vigueur. */
export async function GET() {
  return Response.json({ data: await getSettings() });
}
