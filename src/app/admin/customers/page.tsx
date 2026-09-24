import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatEuro } from "@/core/shared/format";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { listPersonalCustomersAdmin } from "@/services/portals/admin-portal";
import { formatLongDay } from "@/utils/dates";

export const metadata: Metadata = { title: "Clients" };

export default async function AdminCustomersPage() {
  await connection();
  const actor = await requirePortal("admin");
  requirePermission(actor, "accounts.read");
  const rows = await withAccess(() => listPersonalCustomersAdmin(actor));
  return (
    <div>
      <PageHeader title="Clients particuliers" description={`${rows.length} clients`} />
      <Card className="divide-y divide-border px-5">
        {rows.map(({ customer, hasOnlineAccount, missionCount, lastMissionDate, revenueHT, marginHT }) => (
          <div key={customer.id} className="flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {customer.firstName} {customer.lastName}
                <Badge tone={hasOnlineAccount ? "success" : "outline"}>
                  {hasOnlineAccount ? "Espace en ligne" : "Géré par Naera"}
                </Badge>
              </p>
              <p className="text-sm text-muted">
                {[customer.phone, customer.email].filter(Boolean).join(" · ") || "Coordonnées à compléter"}
              </p>
            </div>
            <dl className="flex gap-5 text-sm">
              <div>
                <dt className="text-faint">Missions</dt>
                <dd className="font-semibold tabular">{missionCount}</dd>
              </div>
              <div>
                <dt className="text-faint">CA HT</dt>
                <dd className="font-semibold tabular">{formatEuro(revenueHT)}</dd>
              </div>
              <div>
                <dt className="text-faint">Marge</dt>
                <dd className="font-semibold tabular">{formatEuro(marginHT)}</dd>
              </div>
              <div className="hidden sm:block">
                <dt className="text-faint">Dernière</dt>
                <dd className="font-semibold first-letter:uppercase">
                  {lastMissionDate ? formatLongDay(lastMissionDate) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </Card>
    </div>
  );
}
