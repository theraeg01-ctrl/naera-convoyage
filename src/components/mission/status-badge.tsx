import { MISSION_STATUS_LABELS, type MissionStatus } from "@/core/mission/types";
import { Badge } from "@/components/ui/badge";

const TONES = {
  DRAFT: "neutral",
  QUOTED: "warning",
  CONFIRMED: "accent",
  ASSIGNED: "accent",
  IN_PROGRESS: "accent",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
} as const satisfies Record<MissionStatus, string>;

export function StatusBadge({ status, size = "sm" }: { status: MissionStatus; size?: "sm" | "md" }) {
  return (
    <Badge tone={TONES[status]} size={size}>
      {status === "IN_PROGRESS" ? (
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {MISSION_STATUS_LABELS[status]}
    </Badge>
  );
}
