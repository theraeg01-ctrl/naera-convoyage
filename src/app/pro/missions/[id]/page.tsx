import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Card, DetailRow } from "@/components/ui/card";
import { todayInZone } from "@/core/shared/timezone";
import { CustomerMissionDetail } from "@/features/customer-mission/customer-mission-detail";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getProMission } from "@/services/portals/pro-portal";

export const metadata: Metadata = { title: "Mission" };

export default async function ProMissionPage(props: PageProps<"/pro/missions/[id]">) {
  await connection();
  const actor = await requirePortal("pro");
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const detail = await withAccess(() => getProMission(actor, id));
  if (!detail) notFound();
  const { mission } = detail;
  return (
    <CustomerMissionDetail
      mission={mission}
      tracking={detail.tracking}
      actions={detail.actions}
      invoice={detail.invoice}
      today={todayInZone()}
      backHref="/pro/missions"
      backLabel="Missions"
      justCreated={searchParams.nouvelle === "1"}
      duplicateHref={detail.canDuplicate ? `/pro/missions/new?from=${mission.id}` : undefined}
      meta={
        <Card className="divide-y divide-border px-5">
          <DetailRow label="Commandée par" value={detail.authorName ?? "—"} />
          <DetailRow label="Votre référence" value={mission.customerReference ?? "—"} />
        </Card>
      }
    />
  );
}
