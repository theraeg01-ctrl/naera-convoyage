"use client";

import { Plus, UserRound } from "lucide-react";
import { useId, useState } from "react";
import { Field, Input } from "@/components/ui/field";

export interface ContactValue {
  name: string;
  phone: string;
}

interface ContactDisclosureProps {
  id: "pickup" | "dropoff";
  /** « Contact au départ », « Contact à l'arrivée ». */
  title: string;
  /** « Ajouter un contact au départ »… */
  addLabel: string;
  value: ContactValue;
  onChange: (value: ContactValue) => void;
  errors?: { name?: string; phone?: string };
}

/**
 * Contact facultatif d'une étape de trajet : replié derrière « + Ajouter… »,
 * résumé compact et modifiable une fois saisi. Les adresses restent
 * l'information dominante de l'étape.
 */
export function ContactDisclosure({ id, title, addLabel, value, onChange, errors }: ContactDisclosureProps) {
  const titleId = useId();
  const filled = Boolean(value.name.trim() || value.phone.trim());
  const hasError = Boolean(errors?.name || errors?.phone);
  const [editing, setEditing] = useState(false);
  const open = editing || hasError;

  if (!open && !filled) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-2"
      >
        <Plus className="size-4 text-muted" aria-hidden />
        {addLabel}
      </button>
    );
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5">
        <UserRound className="size-4 shrink-0 text-faint" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-faint">{title}</p>
          <p className="truncate text-[15px] font-medium">
            {value.name.trim() || <span className="text-warning">Nom à compléter</span>}
            {value.phone.trim() ? <span className="font-normal text-muted tabular"> · {value.phone}</span> : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Modifier : ${title.toLowerCase()}`}
          className="-mr-1.5 h-9 shrink-0 rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-foreground"
        >
          Modifier
        </button>
      </div>
    );
  }

  return (
    <div role="group" aria-labelledby={titleId} className="space-y-3 rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p id={titleId} className="text-[15px] font-semibold">
          {title}
        </p>
        <button
          type="button"
          onClick={() => {
            onChange({ name: "", phone: "" });
            setEditing(false);
          }}
          className="-mr-1.5 h-8 rounded-lg px-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
        >
          Retirer
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom" htmlFor={`${id}-contact-name`} error={errors?.name}>
          <Input
            id={`${id}-contact-name`}
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            autoComplete="off"
            autoFocus={editing && !filled}
          />
        </Field>
        <Field label="Téléphone" htmlFor={`${id}-contact-phone`} error={errors?.phone}>
          <Input
            id={`${id}-contact-phone`}
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(event) => onChange({ ...value, phone: event.target.value })}
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={!value.name.trim()}
          className="h-9 rounded-lg bg-surface-2 px-3.5 text-sm font-semibold transition-colors hover:bg-surface-3 disabled:opacity-50"
        >
          Valider le contact
        </button>
      </div>
    </div>
  );
}
