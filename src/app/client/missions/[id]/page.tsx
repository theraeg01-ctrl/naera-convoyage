import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { todayInZone } from "@/core/shared/timezone";
import { CustomerMissionDetail } from "@/features/customer-mission/customer-mission-detail";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getClientMission } from "@/services/portals/client-portal";

export const metadata: Metadata = { title: "Mon convoyage" };

export default async function ClientMissionPage(props: PageProps<"/client/missions/[id]">) {
  await connection();
  const actor = await requirePortal("client");
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const detail = await withAccess(() => getClientMission(actor, id));
  if (!detail) notFound();
  return (
    <CustomerMissionDetail
      mission={detail.mission}
      tracking={detail.tracking}
      actions={detail.actions}
      invoice={detail.invoice}
      today={todayInZone()}
      backHref="/client/missions"
      backLabel="Mes convoyages"
      justCreated={searchParams.nouvelle === "1"}
    />
  );
}
