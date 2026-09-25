import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/mission/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatEuro } from "@/core/shared/format";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { listDriversAdmin } from "@/services/portals/admin-portal";

export const metadata: Metadata = { title: "Convoyeurs" };

export default async function AdminDriversPage() {
  await connection();
  const actor = await requirePortal("admin");
  requirePermission(actor, "drivers.read");
  const rows = await withAccess(() => listDriversAdmin(actor));
  return (
    <div>
      <PageHeader title="Convoyeurs" description={`${rows.length} convoyeurs`} />
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map(({ driver, current, upcoming, completedThisMonth, driverCostThisMonth }) => (
          <Card key={driver.id} className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {driver.firstName} {driver.lastName}
                </p>
                <p className="text-sm text-muted">{[driver.homeCity, driver.phone].filter(Boolean).join(" · ")}</p>
              </div>
              <Badge tone={driver.status === "ACTIVE" ? "success" : "outline"}>
                {driver.status === "ACTIVE" ? "Actif" : "Inactif"}
              </Badge>
            </div>
            {current ? (
              <Link
                href={`/admin/missions/${current.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm hover:bg-surface-3"
              >
                <span className="font-mono">{current.reference}</span>
                <StatusBadge status={current.status} />
              </Link>
            ) : (
              <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm text-muted">Disponible</p>
            )}
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-faint">À venir</dt>
                <dd className="font-semibold tabular">{upcoming}</dd>
              </div>
              <div>
                <dt className="text-faint">Terminées (mois)</dt>
                <dd className="font-semibold tabular">{completedThisMonth}</dd>
              </div>
              <div>
                <dt className="text-faint">Rémunération</dt>
                <dd className="font-semibold tabular">{formatEuro(driverCostThisMonth)}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
