"use client";

import { Ban, Check, Ellipsis, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { missionStepAction } from "@/actions/missions";
import { ACTION_DONE_LABELS, canCancel, nextMissionAction, type MissionActionId } from "@/core/mission/progress";
import type { MissionProgress, MissionStatus } from "@/core/mission/types";
import { ActionBar } from "@/components/ui/action-bar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

interface MissionActionBarProps {
  missionId: string;
  status: MissionStatus;
  progress: MissionProgress;
}

/** Action principale selon l'état (Démarrer, Confirmer l'inspection…), au pouce. */
export function MissionActionBar({ missionId, status, progress }: MissionActionBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<MissionActionId | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const action = nextMissionAction({ status, progress });
  const cancellable = canCancel(status);

  if (!action && !cancellable) return null;

  const run = (id: MissionActionId) => {
    setRunning(id);
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await missionStepAction(missionId, id);
        setFeedback(
          result.ok ? { tone: "success", message: ACTION_DONE_LABELS[id] } : { tone: "error", message: result.message },
        );
        if (result.ok) router.refresh();
      } catch {
        setFeedback({ tone: "error", message: "Connexion impossible. L'action sera à relancer." });
      } finally {
        setRunning(null);
        setMenuOpen(false);
      }
    });
  };

  return (
    <>
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4 lg:bottom-8"
      >
        {feedback ? (
          <p
            key={feedback.message}
            className={
              feedback.tone === "success"
                ? "flex animate-pop items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-float"
                : "animate-pop rounded-full bg-danger px-4 py-2.5 text-sm font-semibold text-white shadow-float"
            }
            onAnimationEnd={() => window.setTimeout(() => setFeedback(null), 1800)}
          >
            {feedback.tone === "success" ? <Check className="size-4" aria-hidden /> : null}
            {feedback.message}
          </p>
        ) : null}
      </div>
      <ActionBar>
        {cancellable ? (
          <Button variant="secondary" size="lg" onClick={() => setMenuOpen(true)} aria-label="Autres actions">
            <Ellipsis aria-hidden />
          </Button>
        ) : null}
        {action ? (
          <Button size="lg" block disabled={pending} onClick={() => run(action.id)}>
            {running === action.id ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            {action.label}
          </Button>
        ) : null}
      </ActionBar>
      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Autres actions">
        <div className="space-y-2 pb-2">
          {action ? <p className="text-sm text-muted">Étape suivante : {action.hint.toLowerCase()}.</p> : null}
          <Button
            variant="danger"
            size="lg"
            block
            disabled={pending}
            onClick={() => run("CANCEL")}
            className="justify-start"
          >
            {running === "CANCEL" ? <LoaderCircle className="animate-spin" aria-hidden /> : <Ban aria-hidden />}
            Annuler la mission
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
