"use client";

import { ArrowLeft, LoaderCircle, MapPin, Navigation, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { placeOrderAction, quoteOrderAction } from "@/actions/orders";
import { QuoteSummary } from "@/components/pricing/quote-summary";
import { DataSourceBadge } from "@/components/ui/badge";
import { ActionBar } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipCheckboxGroup, ChipRadioGroup } from "@/components/ui/choice";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FUEL_TYPE_LABELS, VEHICLE_CATEGORY_LABELS } from "@/core/mission/types";
import type { DataSource } from "@/core/routing/types";
import { formatKm, formatMinutes } from "@/core/shared/format";
import { FUEL_TYPES, VEHICLE_CATEGORIES, type SelectableOptionId } from "@/core/settings/types";
import type { DataMode } from "@/core/simulation/types";
import { AddressAutocomplete } from "@/features/new-mission/address-autocomplete";
import { ContactDisclosure } from "./contact-disclosure";
import type { CustomerOrderInput, CustomerQuoteView } from "@/services/portals/orders";
import { formatLongDay } from "@/utils/dates";
import { cn } from "@/utils/cn";

export interface OrderFormState {
  pickupAddress: string;
  dropoffAddress: string;
  date: string;
  time: string;
  category: (typeof VEHICLE_CATEGORIES)[number];
  fuelType: (typeof FUEL_TYPES)[number];
  make: string;
  model: string;
  plate: string;
  optionIds: SelectableOptionId[];
  pickupContactName: string;
  pickupContactPhone: string;
  dropoffContactName: string;
  dropoffContactPhone: string;
  customerReference: string;
  notes: string;
}

export interface OrderOptionChoice {
  id: SelectableOptionId;
  label: string;
  priceLabel: string;
}

type StepId = "pickup" | "dropoff" | "route" | "vehicle" | "date" | "options" | "schedule" | "quote";

const STEP_TITLES: Record<StepId, string> = {
  pickup: "Départ",
  dropoff: "Destination",
  route: "Trajet",
  vehicle: "Véhicule",
  date: "Date",
  options: "Options",
  schedule: "Date & options",
  quote: "Tarif",
};

/** Particulier : une question par écran. Professionnel : formulaire compact. */
const STEPS: Record<"client" | "pro", StepId[]> = {
  client: ["pickup", "dropoff", "vehicle", "date", "options", "quote"],
  pro: ["route", "vehicle", "schedule", "quote"],
};

/** Étape où corriger un champ refusé par le serveur. */
function stepOfField(field: string, steps: StepId[]): StepId | undefined {
  const candidates: StepId[] = field.startsWith("pickup")
    ? ["pickup", "route"]
    : field.startsWith("dropoff")
      ? ["dropoff", "route"]
      : field.startsWith("vehicle") || field === "customerReference"
        ? ["vehicle"]
        : field === "date" || field === "time"
          ? ["date", "schedule"]
          : ["options", "schedule"];
  return candidates.find((candidate) => steps.includes(candidate));
}

function toInput(form: OrderFormState): CustomerOrderInput {
  return {
    pickupAddress: form.pickupAddress,
    dropoffAddress: form.dropoffAddress,
    date: form.date,
    time: form.time,
    vehicle: {
      category: form.category,
      fuelType: form.fuelType,
      make: form.make,
      model: form.model,
      plate: form.plate,
    },
    optionIds: form.optionIds,
    pickupContact: { name: form.pickupContactName, phone: form.pickupContactPhone },
    dropoffContact: { name: form.dropoffContactName, phone: form.dropoffContactPhone },
    customerReference: form.customerReference,
    notes: form.notes,
  };
}

const DATA_SOURCE_BY_MODE: Record<DataMode, DataSource> = { LIVE: "LIVE", MIXED: "ESTIMATED", DEMO: "SIMULATED" };

interface OrderFlowProps {
  variant: "client" | "pro";
  basePath: "/client" | "/pro";
  options: OrderOptionChoice[];
  initial: OrderFormState;
  minDate: string;
  cancelHref: string;
  title: string;
}

export function OrderFlow({ variant, basePath, options, initial, minDate, cancelHref, title }: OrderFlowProps) {
  const router = useRouter();
  const steps = STEPS[variant];
  const [form, setForm] = useState(initial);
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<CustomerQuoteView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const step = steps[index];
  const set = <K extends keyof OrderFormState>(key: K, value: OrderFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setQuote(null);
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  /** Contrôle léger avant de passer à l'étape suivante (le serveur revalide tout). */
  const localErrors = (id: StepId): Record<string, string> => {
    const found: Record<string, string> = {};
    if ((id === "pickup" || id === "route") && form.pickupAddress.trim().length < 3)
      found.pickupAddress = "Indique l'adresse de départ.";
    if ((id === "dropoff" || id === "route") && form.dropoffAddress.trim().length < 3)
      found.dropoffAddress = "Indique l'adresse de destination.";
    if ((id === "date" || id === "schedule") && (!form.date || form.date < minDate))
      found.date = "Choisis une date à partir d'aujourd'hui.";
    if ((id === "date" || id === "schedule") && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.time))
      found.time = "Indique une heure.";
    return found;
  };

  const requestQuote = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await quoteOrderAction(toInput(form));
        if (result.ok) {
          setQuote(result.data);
          return;
        }
        setMessage(result.message);
        const fieldErrors = result.fieldErrors ?? {};
        setErrors(fieldErrors);
        const target = Object.keys(fieldErrors)
          .map((field) => stepOfField(field, steps))
          .find(Boolean);
        if (target) setIndex(steps.indexOf(target));
      } catch {
        setMessage("Connexion impossible. Réessaie dans un instant.");
      }
    });
  };

  const next = () => {
    const found = localErrors(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const nextStep = steps[index + 1];
    setIndex(index + 1);
    if (nextStep === "quote" && !quote) requestQuote();
  };

  const order = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await placeOrderAction(toInput(form));
        if (result.ok) {
          router.push(`${basePath}/missions/${result.data.id}?nouvelle=1`);
          return;
        }
        setMessage(result.message);
        setErrors(result.fieldErrors ?? {});
      } catch {
        setMessage("Connexion impossible. Ta commande n'a pas été envoyée.");
      }
    });
  };

  const contactFields = (prefix: "pickup" | "dropoff", legend: string) => (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-2 text-[15px] font-semibold">{legend}</legend>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom" htmlFor={`${prefix}-contact-name`}>
          <Input
            id={`${prefix}-contact-name`}
            value={prefix === "pickup" ? form.pickupContactName : form.dropoffContactName}
            onChange={(event) =>
              set(prefix === "pickup" ? "pickupContactName" : "dropoffContactName", event.target.value)
            }
            autoComplete="off"
          />
        </Field>
        <Field label="Téléphone" htmlFor={`${prefix}-contact-phone`}>
          <Input
            id={`${prefix}-contact-phone`}
            type="tel"
            inputMode="tel"
            value={prefix === "pickup" ? form.pickupContactPhone : form.dropoffContactPhone}
            onChange={(event) =>
              set(prefix === "pickup" ? "pickupContactPhone" : "dropoffContactPhone", event.target.value)
            }
          />
        </Field>
      </div>
    </fieldset>
  );

  const contactDisclosure = (prefix: "pickup" | "dropoff", title: string, addLabel: string) => {
    const nameKey = prefix === "pickup" ? "pickupContactName" : "dropoffContactName";
    const phoneKey = prefix === "pickup" ? "pickupContactPhone" : "dropoffContactPhone";
    return (
      <ContactDisclosure
        id={prefix}
        title={title}
        addLabel={addLabel}
        value={{ name: form[nameKey], phone: form[phoneKey] }}
        onChange={(value) => {
          setForm((current) => ({ ...current, [nameKey]: value.name, [phoneKey]: value.phone }));
          setQuote(null);
        }}
        errors={{ name: errors[`${prefix}Contact.name`], phone: errors[`${prefix}Contact.phone`] }}
      />
    );
  };

  const addressField = (key: "pickupAddress" | "dropoffAddress", label: string) => (
    <Field label={label} htmlFor={key} error={errors[key]}>
      <AddressAutocomplete
        id={key}
        name={key}
        value={form[key]}
        onChange={(value) => set(key, value)}
        placeholder="Adresse, ville…"
        icon={key === "pickupAddress" ? <Navigation className="size-5" /> : <MapPin className="size-5" />}
        invalid={Boolean(errors[key])}
      />
    </Field>
  );

  const vehicleFields = (
    <div className="space-y-6">
      <ChipRadioGroup
        legend="Type de véhicule"
        name="category"
        options={VEHICLE_CATEGORIES.map((value) => ({ value, label: VEHICLE_CATEGORY_LABELS[value] }))}
        value={form.category}
        onChange={(value) => set("category", value)}
      />
      <ChipRadioGroup
        legend="Énergie"
        name="fuel"
        options={FUEL_TYPES.map((value) => ({ value, label: FUEL_TYPE_LABELS[value] }))}
        value={form.fuelType}
        onChange={(value) => set("fuelType", value)}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Marque" htmlFor="make">
          <Input id="make" value={form.make} onChange={(event) => set("make", event.target.value)} />
        </Field>
        <Field label="Modèle" htmlFor="model">
          <Input id="model" value={form.model} onChange={(event) => set("model", event.target.value)} />
        </Field>
        <Field label="Immatriculation" htmlFor="plate">
          <Input
            id="plate"
            value={form.plate}
            onChange={(event) => set("plate", event.target.value.toUpperCase())}
            autoCapitalize="characters"
          />
        </Field>
      </div>
      {variant === "pro" ? (
        <Field label="Votre référence" htmlFor="customer-reference" hint="Bon de commande, dossier… (facultatif)">
          <Input
            id="customer-reference"
            value={form.customerReference}
            onChange={(event) => set("customerReference", event.target.value)}
          />
        </Field>
      ) : null}
    </div>
  );

  const dateFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Date" htmlFor="date" error={errors.date}>
        <Input
          id="date"
          type="date"
          min={minDate}
          value={form.date}
          onChange={(event) => set("date", event.target.value)}
          aria-invalid={Boolean(errors.date)}
        />
      </Field>
      <Field label="Heure de prise en charge" htmlFor="time" error={errors.time}>
        <Input
          id="time"
          type="time"
          step={300}
          value={form.time}
          onChange={(event) => set("time", event.target.value)}
          aria-invalid={Boolean(errors.time)}
        />
      </Field>
    </div>
  );

  const optionFields = (
    <ChipCheckboxGroup
      legend="Options de la mission"
      options={options.map((option) => ({ value: option.id, label: option.label, hint: option.priceLabel }))}
      values={form.optionIds}
      onChange={(values) => set("optionIds", values)}
    />
  );

  const body: Record<StepId, React.ReactNode> = {
    pickup: (
      <div className="space-y-6">
        {addressField("pickupAddress", "Où récupérer le véhicule ?")}
        {contactFields("pickup", "Personne sur place (facultatif)")}
      </div>
    ),
    dropoff: (
      <div className="space-y-6">
        {addressField("dropoffAddress", "Où livrer le véhicule ?")}
        {contactFields("dropoff", "Personne qui réceptionne (facultatif)")}
      </div>
    ),
    route: (
      <div className="space-y-6">
        {addressField("pickupAddress", "Départ")}
        {addressField("dropoffAddress", "Destination")}
        <div className="space-y-2 border-t border-border pt-4">
          {contactDisclosure("pickup", "Contact au départ", "Ajouter un contact au départ")}
          {contactDisclosure("dropoff", "Contact à l'arrivée", "Ajouter un contact à l'arrivée")}
        </div>
      </div>
    ),
    vehicle: vehicleFields,
    date: dateFields,
    options: (
      <div className="space-y-3">
        {optionFields}
        <p className="text-sm text-faint">Week-end, jour férié et attente éventuelle sont calculés automatiquement.</p>
      </div>
    ),
    schedule: (
      <div className="space-y-6">
        {dateFields}
        {optionFields}
        <Field label="Consignes" htmlFor="notes" hint="Accès, horaires, clés… (facultatif)">
          <Textarea id="notes" rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
        </Field>
      </div>
    ),
    quote: quote ? (
      <div className="space-y-4">
        <Card className="space-y-2 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[17px] font-semibold tracking-tight">
              {quote.pickup.city ?? quote.pickup.label} <span className="text-faint">→</span>{" "}
              {quote.dropoff.city ?? quote.dropoff.label}
            </p>
            <DataSourceBadge source={DATA_SOURCE_BY_MODE[quote.dataMode]} />
          </div>
          <p className="text-sm text-muted">
            {formatKm(quote.route.distanceKm)} · environ {formatMinutes(quote.route.durationMin)} de route
          </p>
          <p className="text-sm text-muted first-letter:uppercase">
            {formatLongDay(quote.scheduledDate)} · {quote.scheduledTime}
          </p>
        </Card>
        <QuoteSummary pricing={quote} />
        {quote.dataMode !== "LIVE" ? (
          <p className="px-1 text-sm text-faint">
            {quote.dataMode === "DEMO"
              ? "Trajets simulés (démonstration) : ce tarif est indicatif."
              : "Certaines données de trajet sont estimées."}
          </p>
        ) : null}
      </div>
    ) : (
      <Card className="flex items-center justify-center gap-3 p-8 text-muted" aria-busy={pending}>
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
        {pending ? "Calcul du tarif…" : "Tarif indisponible"}
      </Card>
    ),
  };

  const isLast = step === "quote";
  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
          <Link
            href={cancelHref}
            aria-label="Annuler"
            className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </Link>
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-semibold">{STEP_TITLES[step]}</span>
            <span className="text-faint tabular">
              Étape {index + 1} sur {steps.length}
            </span>
          </div>
          <div className="flex gap-1" aria-hidden>
            {steps.map((id, position) => (
              <span key={id} className={cn("h-1 flex-1 rounded-full", position <= index ? "bg-accent" : "bg-border")} />
            ))}
          </div>
        </div>
      </header>

      {message ? (
        <p role="alert" className="mb-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {message}
        </p>
      ) : null}

      <div key={step} className="animate-rise">
        {body[step]}
      </div>

      <ActionBar>
        {index > 0 ? (
          <Button
            variant="secondary"
            size="lg"
            aria-label="Étape précédente"
            onClick={() => setIndex(index - 1)}
            disabled={pending}
          >
            <ArrowLeft aria-hidden />
          </Button>
        ) : null}
        {isLast ? (
          quote ? (
            <Button size="lg" block onClick={order} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              Commander ·{" "}
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(quote.totals.ttc)} TTC
            </Button>
          ) : (
            <Button size="lg" block onClick={requestQuote} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
              Calculer le tarif
            </Button>
          )
        ) : (
          <Button size="lg" block onClick={next} disabled={pending}>
            {steps[index + 1] === "quote" ? "Voir le tarif" : "Continuer"}
          </Button>
        )}
      </ActionBar>
    </div>
  );
}
