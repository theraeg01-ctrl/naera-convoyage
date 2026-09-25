import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FEATURE_LABELS } from "@/core/plans/features";
import { formatEuro, formatPercent } from "@/core/shared/format";
import { requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { listBusinessAccountsAdmin } from "@/services/portals/admin-portal";

export const metadata: Metadata = { title: "Professionnels" };

export default async function AdminBusinessesPage() {
  await connection();
  const actor = await requirePortal("admin");
  requirePermission(actor, "accounts.read");
  const accounts = await withAccess(() => listBusinessAccountsAdmin(actor));
  return (
    <div>
      <PageHeader title="Professionnels" description={`${accounts.length} comptes entreprise`} />
      <div className="grid gap-3 lg:grid-cols-2">
        {accounts.map((account) => (
          <Card key={account.id} className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{account.name}</p>
                <p className="text-sm text-muted">
                  {[account.segment, account.city].filter(Boolean).join(" · ")} · {account.memberCount} membre
                  {account.memberCount > 1 ? "s" : ""}
                </p>
              </div>
              <Badge tone={account.planLabel ? "accent" : "outline"}>{account.planLabel ?? "Sans abonnement"}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-faint">Missions</dt>
                <dd className="font-semibold tabular">{account.missionCount}</dd>
              </div>
              <div>
                <dt className="text-faint">Actives</dt>
                <dd className="font-semibold tabular">{account.activeMissions}</dd>
              </div>
              <div>
                <dt className="text-faint">CA HT</dt>
                <dd className="font-semibold tabular">{formatEuro(account.revenueHT)}</dd>
              </div>
              <div>
                <dt className="text-faint">Marge brute</dt>
                <dd className="font-semibold tabular">
                  {formatEuro(account.grossMarginHT)}
                  {account.grossMarginRate !== null ? (
                    <span className="ml-1 text-xs font-normal text-faint">
                      {formatPercent(account.grossMarginRate)}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
            {account.entitlements.features.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {account.entitlements.features.map((feature) => (
                  <Badge key={feature} tone="neutral">
                    {FEATURE_LABELS[feature]}
                  </Badge>
                ))}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
