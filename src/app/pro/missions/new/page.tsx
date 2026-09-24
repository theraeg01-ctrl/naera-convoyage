import type { Metadata } from "next";
import { connection } from "next/server";
import { todayInZone } from "@/core/shared/timezone";
import { OrderFlow } from "@/features/order/order-flow";
import { orderFormDefaults, toOptionChoices } from "@/features/order/order-defaults";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { listCustomerOptions, orderPrefill } from "@/services/portals/orders";

export const metadata: Metadata = { title: "Nouvelle mission" };

export default async function ProNewMissionPage(props: PageProps<"/pro/missions/new">) {
  await connection();
  const actor = await requirePortal("pro");
  requirePermission(actor, "missions.create");
  const { from } = await props.searchParams;
  const today = todayInZone();
  const [options, prefill] = await withAccess(() =>
    Promise.all([
      listCustomerOptions(actor),
      typeof from === "string" && /^[0-9a-f-]{36}$/i.test(from) ? orderPrefill(actor, from) : Promise.resolve(null),
    ]),
  );
  return (
    <OrderFlow
      variant="pro"
      basePath="/pro"
      title={prefill ? "Dupliquer la mission" : "Nouvelle mission"}
      options={toOptionChoices(options)}
      initial={orderFormDefaults(today, prefill)}
      minDate={today}
      cancelHref="/pro/missions"
    />
  );
}
