import { BusFront, Car, CarTaxiFront, PenLine, TrainFront, Users, type LucideIcon } from "lucide-react";
import type { TransportMode } from "@/core/transport/types";

const ICONS: Record<TransportMode, LucideIcon> = {
  TRAIN: TrainFront,
  PUBLIC_TRANSIT: BusFront,
  VTC: Car,
  TAXI: CarTaxiFront,
  COMPANION: Users,
  PERSONAL_VEHICLE: Car,
  OTHER: PenLine,
};

export function TransportIcon({ mode, className }: { mode: TransportMode; className?: string }) {
  const Icon = ICONS[mode];
  return <Icon className={className} aria-hidden />;
}
