import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, Section } from "@/components/ui/card";
import { can } from "@/core/access/permissions";
import { BUSINESS_ROLE_DESCRIPTIONS, BUSINESS_ROLE_LABELS, BUSINESS_ROLES } from "@/core/accounts/types";
import { requireFeature, requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { getProContext, getProTeam } from "@/services/portals/pro-portal";

export const metadata: Metadata = { title: "Équipe" };

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export default async function ProTeamPage() {
  await connection();
  const actor = await requirePortal("pro");
  requirePermission(actor, "team.read");
  const { account } = await withAccess(() => getProContext(actor));

  requireFeature(account, "team_management");

  const members = await withAccess(() => getProTeam(actor));
  return (
    <div className="space-y-8">
      <PageHeader
        title="Équipe"
        description={`${members.length} membre${members.length > 1 ? "s" : ""} · ${account.name}`}
      />
      <Section title="Membres">
        <Card className="divide-y divide-border px-4 sm:px-5">
          {members.map((member) => (
            <div key={member.id} className="flex items-start gap-3 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold">
                {initials(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-semibold">
                    {member.name}
                    {member.isCurrentUser ? (
                      <span className="ml-1.5 text-sm font-normal text-faint">(vous)</span>
                    ) : null}
                  </p>
                  <Badge tone="neutral">{BUSINESS_ROLE_LABELS[member.role]}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted [overflow-wrap:anywhere]">{member.email}</p>
                {member.status === "INVITED" ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-warning">
                    <span aria-hidden className="size-1.5 rounded-full bg-current" />
                    Invitation en attente
                  </p>
                ) : member.status === "DISABLED" ? (
                  <p className="mt-1 text-xs font-semibold text-faint">Accès désactivé</p>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
        {can(actor, "team.manage") ? (
          <p className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border-strong px-4 py-3 text-sm text-muted">
            <UserPlus className="size-4 shrink-0 text-faint" aria-hidden />
            Invitation d&apos;équipe — bientôt disponible
          </p>
        ) : null}
      </Section>
      <Section title="Rôles">
        <Card className="divide-y divide-border px-4 sm:px-5">
          {BUSINESS_ROLES.map((role) => (
            <div key={role} className="py-3">
              <p className="font-semibold">{BUSINESS_ROLE_LABELS[role]}</p>
              <p className="text-sm text-muted">{BUSINESS_ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </Card>
      </Section>
    </div>
  );
}
