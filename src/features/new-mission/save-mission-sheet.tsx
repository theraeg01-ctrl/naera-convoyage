"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { CustomerType } from "@/core/mission/types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/choice";
import { Field, Input, Textarea } from "@/components/ui/field";

export interface SaveDetails {
  customer: {
    type: CustomerType;
    firstName: string;
    lastName: string;
    companyName: string;
    phone: string;
    email: string;
  } | null;
  vehicle: { make: string; model: string; plate: string };
  /** Consignes visibles du convoyeur. */
  notes: string;
  /** Note interne Naera (jamais visible hors back-office). */
  internalNotes: string;
}

interface SaveMissionSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (details: SaveDetails) => void;
  pending: boolean;
  error: string | null;
}

/** Étape 3 : informations mission (toutes facultatives) puis enregistrement. */
export function SaveMissionSheet({ open, onClose, onSave, pending, error }: SaveMissionSheetProps) {
  const [type, setType] = useState<CustomerType>("INDIVIDUAL");
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    phone: "",
    email: "",
    make: "",
    model: "",
    plate: "",
    notes: "",
    internalNotes: "",
  });
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues({ ...values, [key]: event.target.value });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const hasCustomer = [values.firstName, values.lastName, values.companyName, values.phone, values.email].some((v) =>
      v.trim(),
    );
    onSave({
      customer: hasCustomer
        ? {
            type,
            firstName: values.firstName,
            lastName: values.lastName,
            companyName: values.companyName,
            phone: values.phone,
            email: values.email,
          }
        : null,
      vehicle: { make: values.make, model: values.model, plate: values.plate.toUpperCase() },
      notes: values.notes,
      internalNotes: values.internalNotes,
    });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Enregistrer la mission"
      description="Tout est facultatif : tu pourras compléter plus tard."
      footer={
        <Button type="submit" form="save-mission-form" size="lg" block disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          {pending ? "Enregistrement…" : "Enregistrer la mission"}
        </Button>
      }
    >
      <form id="save-mission-form" onSubmit={submit} className="space-y-6 pt-2">
        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold tracking-[0.1em] text-faint uppercase">Client</legend>
          <Segmented
            name="customer-type"
            legend="Type de client"
            hideLegend
            value={type}
            onChange={setType}
            options={[
              { value: "INDIVIDUAL", label: "Particulier" },
              { value: "PROFESSIONAL", label: "Professionnel" },
            ]}
          />
          {type === "PROFESSIONAL" ? (
            <Field label="Société" htmlFor="companyName">
              <Input
                id="companyName"
                autoComplete="organization"
                value={values.companyName}
                onChange={set("companyName")}
              />
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" htmlFor="firstName">
              <Input id="firstName" autoComplete="given-name" value={values.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Nom" htmlFor="lastName">
              <Input id="lastName" autoComplete="family-name" value={values.lastName} onChange={set("lastName")} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Téléphone" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={values.phone}
                onChange={set("phone")}
              />
            </Field>
            <Field label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={values.email}
                onChange={set("email")}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-3 text-xs font-semibold tracking-[0.1em] text-faint uppercase">Véhicule</legend>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marque" htmlFor="make">
              <Input id="make" value={values.make} onChange={set("make")} />
            </Field>
            <Field label="Modèle" htmlFor="model">
              <Input id="model" value={values.model} onChange={set("model")} />
            </Field>
          </div>
          <Field label="Immatriculation" htmlFor="plate">
            <Input
              id="plate"
              autoCapitalize="characters"
              placeholder="AB-123-CD"
              value={values.plate}
              onChange={set("plate")}
              className="font-mono uppercase"
            />
          </Field>
        </fieldset>

        <Field label="Consignes pour le convoyeur" htmlFor="notes" hint="Visibles du convoyeur (accès, clés…)">
          <Textarea id="notes" rows={2} value={values.notes} onChange={set("notes")} />
        </Field>
        <Field
          label="Note interne"
          htmlFor="internal-notes"
          hint="Naera uniquement : jamais visible du client ni du convoyeur"
        >
          <Textarea id="internal-notes" rows={2} value={values.internalNotes} onChange={set("internalNotes")} />
        </Field>

        {error ? (
          <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </BottomSheet>
  );
}
