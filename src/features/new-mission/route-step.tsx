"use client";

import { ArrowUpDown, CircleDot, Flag, FlaskConical, SlidersHorizontal } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { ActionBar } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, Input } from "@/components/ui/field";
import { AdvancedOptions } from "./advanced-options";
import { AddressAutocomplete } from "./address-autocomplete";
import type { NewMissionConfig } from "./config";
import type { NewMissionFormValues } from "./form-schema";

interface RouteStepProps {
  form: UseFormReturn<NewMissionFormValues>;
  config: NewMissionConfig;
  onSubmit: (values: NewMissionFormValues) => void;
  submitting: boolean;
  advancedOpen: boolean;
}

/** Étape 1 : où est le véhicule, où le livrer, quand. Le reste est optionnel. */
export function RouteStep({ form, config, onSubmit, submitting, advancedOpen }: RouteStepProps) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  const swap = () => {
    const { pickupAddress, dropoffAddress } = getValues();
    setValue("pickupAddress", dropoffAddress);
    setValue("dropoffAddress", pickupAddress);
  };

  const fillScenario = (from: string, to: string) => {
    setValue("pickupAddress", from, { shouldValidate: true });
    setValue("dropoffAddress", to, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="relative rounded-3xl border border-border bg-surface p-4 shadow-card sm:p-5">
        <div className="space-y-4">
          <Controller
            control={control}
            name="pickupAddress"
            render={({ field }) => (
              <Field label="Où est le véhicule ?" htmlFor="pickupAddress" error={errors.pickupAddress?.message}>
                <AddressAutocomplete
                  id="pickupAddress"
                  inputRef={field.ref}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Adresse de départ"
                  icon={<CircleDot />}
                  invalid={Boolean(errors.pickupAddress)}
                  describedBy={errors.pickupAddress ? "pickupAddress-error" : undefined}
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="dropoffAddress"
            render={({ field }) => (
              <Field label="Où doit-il être livré ?" htmlFor="dropoffAddress" error={errors.dropoffAddress?.message}>
                <AddressAutocomplete
                  id="dropoffAddress"
                  inputRef={field.ref}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Adresse d'arrivée"
                  icon={<Flag />}
                  invalid={Boolean(errors.dropoffAddress)}
                  describedBy={errors.dropoffAddress ? "dropoffAddress-error" : undefined}
                />
              </Field>
            )}
          />
        </div>
        <button
          type="button"
          onClick={swap}
          aria-label="Inverser départ et arrivée"
          className="absolute top-1/2 right-6 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-card hover:text-foreground"
        >
          <ArrowUpDown className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="date" error={errors.date?.message}>
          <Input id="date" type="date" className="px-3.5" {...register("date")} />
        </Field>
        <Field label="Heure souhaitée" htmlFor="time" error={errors.time?.message}>
          <Input id="time" type="time" step={300} className="px-3.5" {...register("time")} />
        </Field>
      </div>

      <Disclosure
        summary="Options avancées"
        hint="Véhicule, convoyeur, marge, options client"
        icon={<SlidersHorizontal />}
        defaultOpen={advancedOpen}
      >
        <AdvancedOptions control={control} register={register} errors={errors} config={config} />
      </Disclosure>

      <div className="space-y-2.5 pt-1">
        <p className="flex items-center gap-2 px-1 text-sm font-medium text-muted">
          <FlaskConical className="size-4 text-faint" aria-hidden />
          Scénarios de démonstration
        </p>
        <div className="flex flex-wrap gap-2">
          {config.demoScenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              onClick={() => fillScenario(scenario.from, scenario.to)}
              className="h-10 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-muted shadow-card hover:border-border-strong hover:text-foreground"
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      <ActionBar>
        <Button type="submit" size="lg" block disabled={submitting}>
          Calculer le convoyage
        </Button>
      </ActionBar>
    </form>
  );
}
