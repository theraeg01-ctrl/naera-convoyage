"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { saveMissionAction } from "@/actions/missions";
import { runSimulationAction } from "@/actions/simulation";
import type { AppSettings } from "@/core/settings/types";
import { defaultSelections, resolveSimulation } from "@/core/simulation/resolve";
import type { MissionRequest, SimulationResult, SimulationSelections } from "@/core/simulation/types";
import { Stepper } from "@/components/ui/stepper";
import { useViewMode } from "@/hooks/use-view-mode";
import { AdjustSheet } from "./adjust-sheet";
import type { NewMissionConfig } from "./config";
import { defaultFormValues, newMissionFormSchema, toMissionRequest, type NewMissionFormValues } from "./form-schema";
import { ManualRouteCard } from "./manual-route-card";
import { ResultView } from "./result-view";
import { RouteStep } from "./route-step";
import { SaveMissionSheet, type SaveDetails } from "./save-mission-sheet";
import { SimulationLoading } from "./simulation-loading";

const RESULT_STEP = "resultat";
const MIN_LOADING_MS = 650;
const NETWORK_ERROR = "Connexion impossible pour le moment. Vérifie le réseau puis réessaie.";

interface Payload {
  simulation: SimulationResult;
  settings: AppSettings;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Parcours « Nouvelle mission » : Trajet → Résultat → Mission.
 * Le calcul du tarif est refait instantanément côté client (moteur pur)
 * à chaque choix, puis recalculé côté serveur à l'enregistrement.
 */
export function NewMissionFlow({ config }: { config: NewMissionConfig }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useViewMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [selections, setSelections] = useState<SimulationSelections | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm<NewMissionFormValues>({
    resolver: zodResolver(newMissionFormSchema),
    defaultValues: defaultFormValues({
      date: config.defaultDate,
      time: config.defaultTime,
      strategy: config.defaultStrategy,
    }),
    mode: "onTouched",
  });

  const showResult = searchParams.get("etape") === RESULT_STEP && payload !== null && selections !== null;

  const resolved = useMemo(() => {
    if (!payload || !selections) return null;
    try {
      return resolveSimulation(payload.simulation, selections, payload.settings);
    } catch {
      return null;
    }
  }, [payload, selections]);

  const simulate = async (request: MissionRequest) => {
    setLoading(true);
    setError(null);
    try {
      const [result] = await Promise.all([runSimulationAction(request), wait(MIN_LOADING_MS)]);
      if (!result.ok) {
        for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
          if (path === "pickupAddress" || path === "dropoffAddress" || path === "date" || path === "time") {
            form.setError(path, { message });
          }
        }
        setError(result.message);
        return;
      }
      setPayload(result.data);
      setSelections(defaultSelections(result.data.simulation));
      if (searchParams.get("etape") !== RESULT_STEP) window.history.pushState(null, "", `?etape=${RESULT_STEP}`);
      window.scrollTo({ top: 0 });
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const onCalculate = (values: NewMissionFormValues) => simulate(toMissionRequest(values));

  const onEdit = () => {
    if (searchParams.get("etape") === RESULT_STEP) window.history.back();
  };

  const onSave = async (details: SaveDetails) => {
    if (!payload || !selections) return;
    setSavePending(true);
    setSaveError(null);
    try {
      const result = await saveMissionAction({
        simulation: payload.simulation,
        selections,
        customer: details.customer,
        vehicle: details.vehicle,
        notes: details.notes,
      });
      if (!result.ok) {
        setSaveError(result.message);
        setSavePending(false);
        return;
      }
      router.push(`/missions/${result.id}?nouvelle=1`);
    } catch {
      setSaveError(NETWORK_ERROR);
      setSavePending(false);
    }
  };

  const step = showResult ? 1 : 0;

  return (
    <div className="mx-auto max-w-xl lg:max-w-none">
      <header className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Nouvelle mission</h1>
          <Link
            href="/"
            aria-label="Annuler et revenir à l'accueil"
            className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </Link>
        </div>
        <Stepper steps={["Trajet", "Résultat", "Mission"]} current={saveOpen ? 2 : step} />
      </header>

      {error && !loading ? (
        <p role="alert" className="mb-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}

      {loading ? (
        <SimulationLoading />
      ) : showResult && payload && selections ? (
        resolved ? (
          <>
            <ResultView
              simulation={payload.simulation}
              settings={payload.settings}
              selections={selections}
              resolved={resolved}
              mode={mode}
              onModeChange={setMode}
              onSelectionsChange={(patch) => setSelections({ ...selections, ...patch })}
              onEdit={onEdit}
              onAdjust={() => setAdjustOpen(true)}
              onSave={() => setSaveOpen(true)}
            />
            {adjustOpen ? (
              <AdjustSheet
                open
                onClose={() => setAdjustOpen(false)}
                overrides={selections.overrides}
                current={{
                  distanceKm: resolved.route.distanceKm,
                  durationMin: resolved.route.trafficDurationMin,
                  tollsEur: resolved.route.tollsEur,
                  returnPrice: resolved.return.selected?.price ?? null,
                }}
                onApply={(overrides) => setSelections({ ...selections, overrides })}
              />
            ) : null}
            <SaveMissionSheet
              open={saveOpen}
              onClose={() => setSaveOpen(false)}
              onSave={onSave}
              pending={savePending}
              error={saveError}
            />
          </>
        ) : (
          <ManualRouteCard
            pending={loading}
            message={
              payload.simulation.notices.find((notice) => notice.level === "warning")?.message ??
              "Impossible de récupérer l'itinéraire actuellement. Tu peux entrer les kilomètres manuellement."
            }
            onSubmit={(manualRoute) => simulate(toMissionRequest(form.getValues(), manualRoute))}
          />
        )
      ) : (
        <RouteStep form={form} config={config} onSubmit={onCalculate} submitting={loading} advancedOpen={false} />
      )}
    </div>
  );
}
