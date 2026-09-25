import { MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AccountActions } from "@/components/layout/account-actions";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme";
import { Card, Section } from "@/components/ui/card";
import { requirePortal, withAccess } from "@/services/auth/guards";
import { getDriverProfile } from "@/services/portals/driver-portal";

export const metadata: Metadata = { title: "Compte" };

export default async function DriverAccountPage() {
  await connection();
  const actor = await requirePortal("driver");
  const profile = await withAccess(() => getDriverProfile(actor));
  return (
    <div className="space-y-8">
      <PageHeader title="Compte" className="mb-0" />
      <Section title="Profil">
        <Card className="space-y-3 p-5">
          <p className="text-lg font-semibold">
            {profile.firstName} {profile.lastName}
          </p>
          {profile.phone ? (
            <p className="flex items-center gap-3 text-[15px] text-muted">
              <Phone className="size-4" aria-hidden />
              {profile.phone}
            </p>
          ) : null}
          {profile.homeCity ? (
            <p className="flex items-center gap-3 text-[15px] text-muted">
              <MapPin className="size-4" aria-hidden />
              Basé à {profile.homeCity}
            </p>
          ) : null}
        </Card>
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
