"use client";

import { Controller, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { FUEL_TYPE_LABELS, VEHICLE_CATEGORY_LABELS } from "@/core/mission/types";
import { FUEL_TYPES, VEHICLE_CATEGORIES } from "@/core/settings/types";
import { STRATEGY_LABELS } from "@/core/transport/score";
import { TRANSPORT_MODE_LABELS, type TransportMode } from "@/core/transport/types";
import { ChipCheckboxGroup, ChipRadioGroup, Segmented } from "@/components/ui/choice";
import { AffixInput, Field } from "@/components/ui/field";
import type { NewMissionConfig } from "./config";
import type { NewMissionFormValues } from "./form-schema";

interface AdvancedOptionsProps {
  control: Control<NewMissionFormValues>;
  register: UseFormRegister<NewMissionFormValues>;
  errors: FieldErrors<NewMissionFormValues>;
  config: NewMissionConfig;
}

const ACCESS_MODES: TransportMode[] = ["TRAIN", "PUBLIC_TRANSIT", "VTC", "TAXI", "PERSONAL_VEHICLE", "OTHER"];
const RETURN_MODES: TransportMode[] = ["TRAIN", "PUBLIC_TRANSIT", "VTC", "TAXI", "COMPANION", "OTHER"];
const WAITING_CHOICES = [0, 30, 60, 120] as const;

function modeOptions(modes: TransportMode[]) {
  return [
    { value: "AUTO" as const, label: "Automatique", hint: "Meilleur choix" },
    ...modes.map((mode) => ({ value: mode, label: TRANSPORT_MODE_LABELS[mode] })),
  ];
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold tracking-[0.1em] text-faint uppercase">{title}</h3>
      {children}
    </div>
  );
}

/** Paramètres secondaires, masqués par défaut (divulgation progressive). */
export function AdvancedOptions({ control, register, errors, config }: AdvancedOptionsProps) {
  const [fuelType, accessMode, returnMode, marginMode] = useWatch({
    control,
    name: ["fuelType", "accessMode", "returnMode", "marginMode"],
  });
  const consumptionUnit = fuelType === "ELECTRIC" ? "kWh/100" : "L/100";

  return (
    <div className="space-y-8">
      <Group title="Véhicule">
        <Controller
          control={control}
          name="vehicleCategory"
          render={({ field }) => (
            <ChipRadioGroup
              legend="Type de véhicule"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              options={VEHICLE_CATEGORIES.map((value) => ({ value, label: VEHICLE_CATEGORY_LABELS[value] }))}
            />
          )}
        />
        <Controller
          control={control}
          name="fuelType"
          render={({ field }) => (
            <Segmented
              legend="Énergie"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              size="sm"
              options={FUEL_TYPES.map((value) => ({ value, label: FUEL_TYPE_LABELS[value] }))}
            />
          )}
        />
        <Field
          label="Consommation"
          htmlFor="consumption"
          hint={`Par défaut : ${String(config.consumption[fuelType]).replace(".", ",")} ${consumptionUnit} km`}
          error={errors.consumption?.message}
        >
          <AffixInput
            id="consumption"
            inputMode="decimal"
            placeholder={String(config.consumption[fuelType]).replace(".", ",")}
            suffix={consumptionUnit}
            aria-invalid={errors.consumption ? true : undefined}
            {...register("consumption")}
          />
        </Field>
      </Group>

      <Group title="Convoyeur">
        <Controller
          control={control}
          name="accessMode"
          render={({ field }) => (
            <ChipRadioGroup
              legend={`Rejoindre le véhicule (depuis ${config.baseCity})`}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              options={modeOptions(ACCESS_MODES)}
            />
          )}
        />
        {accessMode === "OTHER" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix aller" htmlFor="manualAccessPrice" error={errors.manualAccessPrice?.message}>
              <AffixInput id="manualAccessPrice" inputMode="decimal" suffix="€" {...register("manualAccessPrice")} />
            </Field>
            <Field label="Durée aller" htmlFor="manualAccessDuration" error={errors.manualAccessDuration?.message}>
              <AffixInput
                id="manualAccessDuration"
                inputMode="numeric"
                suffix="min"
                {...register("manualAccessDuration")}
              />
            </Field>
          </div>
        ) : null}
        <Controller
          control={control}
          name="returnMode"
          render={({ field }) => (
            <ChipRadioGroup
              legend="Retour du convoyeur"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              options={modeOptions(RETURN_MODES)}
            />
          )}
        />
        {returnMode === "OTHER" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prix retour" htmlFor="manualReturnPrice" error={errors.manualReturnPrice?.message}>
              <AffixInput id="manualReturnPrice" inputMode="decimal" suffix="€" {...register("manualReturnPrice")} />
            </Field>
            <Field label="Durée retour" htmlFor="manualReturnDuration" error={errors.manualReturnDuration?.message}>
              <AffixInput
                id="manualReturnDuration"
                inputMode="numeric"
                suffix="min"
                {...register("manualReturnDuration")}
              />
            </Field>
          </div>
        ) : null}
        <Controller
          control={control}
          name="strategy"
          render={({ field }) => (
            <Segmented
              legend="Priorité pour le transport"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              size="sm"
              options={(["CHEAPEST", "FASTEST", "BALANCED"] as const).map((value) => ({
                value,
                label: value === "BALANCED" ? "Compromis" : STRATEGY_LABELS[value],
              }))}
            />
          )}
        />
      </Group>

      <Group title="Tarif">
        <Controller
          control={control}
          name="marginMode"
          render={({ field }) => (
            <Segmented
              legend="Marge"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              size="sm"
              options={[
                { value: "SETTINGS", label: `Standard · ${config.marginSummary}` },
                { value: "PERCENT", label: "%" },
                { value: "FIXED", label: "€" },
              ]}
            />
          )}
        />
        {marginMode !== "SETTINGS" ? (
          <Field label="Marge personnalisée" htmlFor="marginValue" error={errors.marginValue?.message}>
            <AffixInput
              id="marginValue"
              inputMode="decimal"
              suffix={marginMode === "PERCENT" ? "%" : "€"}
              placeholder={marginMode === "PERCENT" ? "30" : "80"}
              {...register("marginValue")}
            />
          </Field>
        ) : null}
        <Controller
          control={control}
          name="waitingMin"
          render={({ field }) => (
            <ChipRadioGroup
              legend={`Attente prévue sur place (${config.waitingPriceLabel})`}
              name={field.name}
              value={String(field.value)}
              onChange={(value) => field.onChange(Number(value))}
              options={WAITING_CHOICES.map((minutes) => ({
                value: String(minutes),
                label: minutes === 0 ? "Aucune" : minutes < 60 ? `${minutes} min` : `${minutes / 60} h`,
              }))}
            />
          )}
        />
        <Controller
          control={control}
          name="optionIds"
          render={({ field }) => (
            <ChipCheckboxGroup
              legend="Options client"
              values={field.value}
              onChange={field.onChange}
              options={config.options.map((option) => ({
                value: option.id,
                label: option.label,
                hint: option.priceLabel,
              }))}
            />
          )}
        />
      </Group>
    </div>
  );
}
