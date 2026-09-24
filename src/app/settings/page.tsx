import { CircleCheck, Database, KeyRound, PlugZap } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme";
import { Badge } from "@/components/ui/badge";
import { Card, Section } from "@/components/ui/card";
import { buildSettingsSections } from "@/features/settings/sections";
import { SettingsSectionForm } from "@/features/settings/settings-section-form";
import { getIntegrationStatuses, serverConfig, type IntegrationState } from "@/services/config";
import { getSettings } from "@/services/settings/settings-service";
import { getPath } from "@/utils/object-path";

export const metadata: Metadata = { title: "Paramètres" };

const STATE_BADGES: Record<IntegrationState, { label: string; tone: "success" | "warning" | "outline" }> = {
  CONNECTED: { label: "Connectée", tone: "success" },
  KEY_ONLY: { label: "Clé présente · adaptateur à venir", tone: "warning" },
  SIMULATED: { label: "Simulée", tone: "outline" },
};

function displayValue(value: unknown, scale?: number): string {
  if (typeof value === "number") return String(Math.round(value * (scale ?? 1) * 1000) / 1000).replace(".", ",");
  return typeof value === "string" ? value : "";
}

export default async function SettingsPage() {
  await connection();
  const settings = await getSettings();
  const sections = buildSettingsSections(settings);
  const integrations = getIntegrationStatuses();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Paramètres" description="Source unique de vérité : chaque calcul utilise ces valeurs." />
      <div className="space-y-8">
        <Section title="Tarifs & règles de calcul">
          <div className="space-y-3">
            {sections.map((section, index) => (
              <SettingsSectionForm
                key={section.id}
                section={section}
                defaultOpen={index === 0}
                values={Object.fromEntries(
                  section.fields.map((field) => [
                    field.path,
                    displayValue(getPath(settings, field.path), field.kind === "number" ? field.scale : undefined),
                  ]),
                )}
              />
            ))}
          </div>
        </Section>

        <Section title="Apparence">
          <Card className="p-5">
            <ThemeToggle name="theme-settings" />
          </Card>
        </Section>

        <Section title="Connexions" icon={<PlugZap className="size-3.5" aria-hidden />}>
          <Card className="divide-y divide-border px-5">
            <div className="flex items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <Database className="size-5 text-faint" aria-hidden />
                <div>
                  <p className="font-medium">Stockage des données</p>
                  <p className="text-sm text-faint">
                    {serverConfig.databaseUrl
                      ? "PostgreSQL (Prisma)"
                      : "Fichier local de démonstration — définir DATABASE_URL pour PostgreSQL"}
                  </p>
                </div>
              </div>
              {serverConfig.databaseUrl ? (
                <Badge tone="success">
                  <CircleCheck aria-hidden />
                  Actif
                </Badge>
              ) : (
                <Badge tone="outline">Démo</Badge>
              )}
            </div>
            {integrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between gap-3 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <KeyRound className="size-5 shrink-0 text-faint" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium">{integration.label}</p>
                    <p className="text-sm text-faint">{integration.description}</p>
                  </div>
                </div>
                <Badge
                  tone={STATE_BADGES[integration.state].tone}
                  className="h-auto min-h-6 max-w-36 py-0.5 text-center whitespace-normal"
                >
                  {STATE_BADGES[integration.state].label}
                </Badge>
              </div>
            ))}
          </Card>
          <p className="px-1 text-sm text-faint">
            Les clés API restent côté serveur (variables d&apos;environnement), jamais dans le navigateur.
          </p>
        </Section>
      </div>
    </div>
  );
}
