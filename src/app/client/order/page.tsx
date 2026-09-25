import type { Metadata } from "next";
import { connection } from "next/server";
import { todayInZone } from "@/core/shared/timezone";
import { OrderFlow } from "@/features/order/order-flow";
import { orderFormDefaults, toOptionChoices } from "@/features/order/order-defaults";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { listCustomerOptions } from "@/services/portals/orders";

export const metadata: Metadata = { title: "Commander" };

export default async function ClientOrderPage() {
  await connection();
  const actor = await requirePortal("client");
  requirePermission(actor, "missions.create");
  const options = await withAccess(() => listCustomerOptions(actor));
  const today = todayInZone();
  return (
    <OrderFlow
      variant="client"
      basePath="/client"
      title="Commander"
      options={toOptionChoices(options)}
      initial={orderFormDefaults(today)}
      minDate={today}
      cancelHref="/client"
    />
  );
}
