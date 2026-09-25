"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { assignDriverAction } from "@/actions/missions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { ASSIGNMENT_STATUS_LABELS } from "@/core/accounts/types";
import type { MissionAssignment } from "@/core/mission/types";

interface AssignDriverFormProps {
  missionId: string;
  current: MissionAssignment | null;
  drivers: { id: string; name: string; city: string | null }[];
  /** L'affectation n'est possible qu'avant le départ. */
  assignable: boolean;
}

/** Affectation d'un convoyeur (back-office). Le serveur revérifie droits et statut. */
export function AssignDriverForm({ missionId, current, drivers, assignable }: AssignDriverFormProps) {
  const router = useRouter();
  const [driverId, setDriverId] = useState(current?.driverProfileId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const summary = current ? (
    <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
      {current.driverName}
      <Badge tone={current.status === "ACCEPTED" ? "success" : "warning"}>
        {ASSIGNMENT_STATUS_LABELS[current.status]}
      </Badge>
    </p>
  ) : (
    <p className="text-[15px] text-muted">Aucun convoyeur affecté</p>
  );

  if (!assignable || drivers.length === 0) return summary;

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await assignDriverAction(missionId, driverId);
          if (result.ok) router.refresh();
          else setMessage(result.message);
        });
      }}
    >
      {summary}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="driver">
          Convoyeur
        </label>
        <Select id="driver" value={driverId} onChange={(event) => setDriverId(event.target.value)} className="flex-1">
          <option value="" disabled>
            Choisir un convoyeur
          </option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
              {driver.city ? ` · ${driver.city}` : ""}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending || !driverId || driverId === current?.driverProfileId}
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          Affecter
        </Button>
      </div>
      {message ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
    </form>
  );
}
