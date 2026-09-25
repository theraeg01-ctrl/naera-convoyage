import type { Metadata } from "next";
import { connection } from "next/server";
import { AccountActions } from "@/components/layout/account-actions";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme";
import { Card, Section } from "@/components/ui/card";
import { BUSINESS_ROLE_DESCRIPTIONS, BUSINESS_ROLE_LABELS, BUSINESS_SEGMENT_LABELS } from "@/core/accounts/types";
import { PLAN_LABELS } from "@/core/plans/features";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getProAccount } from "@/services/portals/pro-portal";

export const metadata: Metadata = { title: "Compte" };

function Rows({ rows }: { rows: { label: string; value: string | null; hint?: string }[] }) {
  return (
    <Card>
      <dl className="divide-y divide-border px-5">
        {rows
          .filter((row) => row.value)
          .map((row) => (
            <div key={row.label} className="grid grid-cols-[7.5rem_1fr] gap-3 py-3 text-[15px]">
              <dt className="text-muted">{row.label}</dt>
              <dd className="min-w-0 font-medium [overflow-wrap:anywhere]">
                {row.value}
                {row.hint ? <span className="mt-0.5 block text-[13px] font-normal text-faint">{row.hint}</span> : null}
              </dd>
            </div>
          ))}
      </dl>
    </Card>
  );
}

/** Compte pro : profil du membre connecté, entreprise et offre, session. */
export default async function ProAccountPage() {
  await connection();
  const actor = await requirePortal("pro");
  const { account, member } = await withAccess(() => getProAccount(actor));
  const plan = account.entitlements.planCode;
  return (
    <div className="space-y-8">
      <PageHeader title="Compte" />
      <Section title="Mon profil">
        <Rows
          rows={[
            { label: "Nom", value: member.name },
            { label: "E-mail", value: member.email },
            {
              label: "Rôle",
              value: BUSINESS_ROLE_LABELS[member.role],
              hint: BUSINESS_ROLE_DESCRIPTIONS[member.role],
            },
          ]}
        />
      </Section>
      <Section title="Entreprise">
        <Rows
          rows={[
            { label: "Raison sociale", value: account.name },
            { label: "Activité", value: account.segment ? BUSINESS_SEGMENT_LABELS[account.segment] : null },
            { label: "Ville", value: account.city },
            {
              label: "Offre",
              value: plan ? PLAN_LABELS[plan] : null,
              hint: "Changement d'offre : votre interlocuteur Naera",
            },
            { label: "Membres", value: String(account.memberCount) },
          ]}
        />
      </Section>
      <Section title="Apparence">
        <ThemeToggle name="theme-account" />
      </Section>
      <Section title="Session">
        <AccountActions />
      </Section>
    </div>
  );
}
