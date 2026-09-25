"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { saveSettingsSectionAction, type SettingsFormState } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { AffixInput, Field, Input, Select } from "@/components/ui/field";
import type { SettingsSection } from "./sections";

const INITIAL_STATE: SettingsFormState = { status: "idle", message: "" };

interface SettingsSectionFormProps {
  section: SettingsSection;
  /** Valeurs affichées, indexées par chemin (déjà mises à l'échelle). */
  values: Record<string, string>;
  defaultOpen?: boolean;
}

export function SettingsSectionForm({ section, values, defaultOpen }: SettingsSectionFormProps) {
  const [state, formAction, pending] = useActionState(saveSettingsSectionAction, INITIAL_STATE);

  return (
    <Disclosure summary={section.title} hint={section.description} defaultOpen={defaultOpen}>
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="sectionId" value={section.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          {section.fields.map((field) => {
            const id = `${section.id}-${field.path}`;
            if (field.kind === "select") {
              return (
                <Field key={field.path} label={field.label} htmlFor={id}>
                  <Select id={id} name={field.path} defaultValue={values[field.path]}>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              );
            }
            if (field.kind === "text") {
              return (
                <Field key={field.path} label={field.label} htmlFor={id} hint={field.hint}>
                  <Input id={id} name={field.path} defaultValue={values[field.path]} required />
                </Field>
              );
            }
            return (
              <Field key={field.path} label={field.label} htmlFor={id} hint={field.hint}>
                <AffixInput
                  id={id}
                  name={field.path}
                  inputMode="decimal"
                  defaultValue={values[field.path]}
                  suffix={field.unit}
                  required
                />
              </Field>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            Enregistrer
          </Button>
          <p aria-live="polite" className="text-sm font-medium">
            {state.status === "saved" ? (
              <span key={state.savedAt} className="inline-flex animate-pop items-center gap-1.5 text-success">
                <Check className="size-4" aria-hidden />
                {state.message}
              </span>
            ) : state.status === "error" ? (
              <span className="text-danger">{state.message}</span>
            ) : null}
          </p>
        </div>
      </form>
    </Disclosure>
  );
}
