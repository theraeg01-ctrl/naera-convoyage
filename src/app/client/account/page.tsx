import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { InvoiceList } from "@/components/billing/invoice-list";
import { AccountActions } from "@/components/layout/account-actions";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme";
import { Card, Section } from "@/components/ui/card";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getClientAccount } from "@/services/portals/client-portal";

export const metadata: Metadata = { title: "Compte" };

export default async function ClientAccountPage() {
  await connection();
  const actor = await requirePortal("client");
  const { customer, invoices } = await withAccess(() => getClientAccount(actor));
  const rows = [
    { icon: Mail, value: customer.email },
    { icon: Phone, value: customer.phone },
    { icon: MapPin, value: customer.address },
  ].filter((row) => row.value);
  return (
    <div className="space-y-8">
      <PageHeader title="Compte" className="mb-0" />
      <Section title="Mes informations">
        <Card className="space-y-3 p-5">
          <p className="text-lg font-semibold">
            {customer.firstName} {customer.lastName}
          </p>
          {rows.map(({ icon: Icon, value }) => (
            <p key={value} className="flex items-center gap-3 text-[15px] text-muted">
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{value}</span>
            </p>
          ))}
        </Card>
      </Section>
      <Section title="Factures">
        <InvoiceList invoices={invoices} />
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
