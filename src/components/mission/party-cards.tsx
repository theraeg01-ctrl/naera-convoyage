import { Building2, Car, Mail, Phone, User } from "lucide-react";
import {
  CUSTOMER_TYPE_LABELS,
  FUEL_TYPE_LABELS,
  VEHICLE_CATEGORY_LABELS,
  customerDisplayName,
  vehicleDisplayName,
  type CustomerInfo,
  type VehicleInfo,
} from "@/core/mission/types";
import { Card } from "@/components/ui/card";

export function CustomerCard({ customer }: { customer: CustomerInfo | null }) {
  const Icon = customer?.type === "PROFESSIONAL" ? Building2 : User;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{customerDisplayName(customer)}</p>
          <p className="text-sm text-faint">
            {customer ? CUSTOMER_TYPE_LABELS[customer.type] : "Aucun client associé"}
          </p>
        </div>
      </div>
      {customer?.phone || customer?.email ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {customer.phone ? (
            <a
              href={`tel:${customer.phone.replace(/\s/g, "")}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface-2 px-3 text-sm font-medium hover:bg-surface-3"
            >
              <Phone className="size-4" aria-hidden />
              {customer.phone}
            </a>
          ) : null}
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="inline-flex h-10 min-w-0 items-center gap-2 rounded-xl bg-surface-2 px-3 text-sm font-medium hover:bg-surface-3"
            >
              <Mail className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{customer.email}</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function VehicleCard({ vehicle }: { vehicle: VehicleInfo }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Car className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{vehicleDisplayName(vehicle)}</p>
        <p className="text-sm text-faint">
          {VEHICLE_CATEGORY_LABELS[vehicle.category]} · {FUEL_TYPE_LABELS[vehicle.fuelType]}
        </p>
      </div>
      {vehicle.plate ? (
        <span className="rounded-lg border border-border-strong px-2 py-1 font-mono text-sm font-semibold tracking-wider">
          {vehicle.plate}
        </span>
      ) : null}
    </Card>
  );
}
