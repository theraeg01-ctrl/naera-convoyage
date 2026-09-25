import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { can } from "@/core/access/permissions";
import { BUSINESS_ROLE_DESCRIPTIONS, BUSINESS_ROLE_LABELS, BUSINESS_ROLES } from "@/core/accounts/types";
import { requireFeature, requirePermission, requirePortal, withAccess } from "@/services/auth/guards";
import { getProContext, getProTeam } from "@/services/portals/pro-portal";

export const metadata: Metadata = { title: "Équipe" };

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
        className="mb-0"
        actions={
          can(actor, "team.manage") ? (
            <Button variant="secondary" size="sm" disabled title="Invitations bientôt disponibles">
              <UserPlus aria-hidden />
              Inviter
            </Button>
          ) : null
        }
      />
      <Section title="Membres">
        <Card className="divide-y divide-border px-5">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 py-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
                {member.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {member.name}
                  {member.isCurrentUser ? <span className="ml-2 text-sm font-normal text-faint">(vous)</span> : null}
                </p>
                <p className="truncate text-sm text-muted">{member.email}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone="accent">{BUSINESS_ROLE_LABELS[member.role]}</Badge>
                {member.status !== "ACTIVE" ? (
                  <Badge tone="warning">{member.status === "INVITED" ? "Invitation envoyée" : "Désactivé"}</Badge>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      </Section>
      <Section title="Rôles">
        <Card className="divide-y divide-border px-5">
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
