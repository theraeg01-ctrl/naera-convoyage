import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { MissionCard } from "@/components/mission/mission-card";
import { Section } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { todayInZone } from "@/core/shared/timezone";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { listQuotesAdmin } from "@/services/portals/admin-portal";

export const metadata: Metadata = { title: "Devis" };

export default async function AdminQuotesPage() {
  await connection();
  const actor = await requirePortal("admin");
  requirePermission(actor, "missions.manage");
  const quotes = await withAccess(() => listQuotesAdmin(actor));
  const today = todayInZone();
  const sent = quotes.filter((mission) => mission.status === "QUOTED");
  const drafts = quotes.filter((mission) => mission.status === "DRAFT");
  const list = (missions: typeof quotes) => (
    <div className="grid gap-3 md:grid-cols-2">
      {missions.map((mission) => (
        <MissionCard key={mission.id} mission={mission} today={today} />
      ))}
    </div>
  );
  return (
    <div className="space-y-8">
      <PageHeader title="Devis" description="Devis envoyés en attente de réponse et brouillons." />
      <Section title={`En attente du client (${sent.length})`}>
        {sent.length > 0 ? list(sent) : <EmptyState icon={<FileText />} title="Aucun devis en attente" />}
      </Section>
      <Section title={`Brouillons (${drafts.length})`}>
        {drafts.length > 0 ? list(drafts) : <EmptyState icon={<FileText />} title="Aucun brouillon" />}
      </Section>
    </div>
  );
}
