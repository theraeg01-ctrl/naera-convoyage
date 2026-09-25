import { Phone, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ContactPerson } from "@/core/mission/types";

/** Contact sur place (départ ou arrivée), appel en un geste. */
export function ContactCard({ title, contact }: { title: string; contact: ContactPerson | null }) {
  return (
    <Card className="flex min-w-0 items-center gap-3 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <UserRound className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-faint">{title}</p>
        <p className="truncate font-semibold">{contact?.name ?? "Non renseigné"}</p>
      </div>
      {contact?.phone ? (
        <a
          href={`tel:${contact.phone.replace(/\s/g, "")}`}
          aria-label={`Appeler ${contact.name} (${contact.phone})`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent hover:opacity-90"
        >
          <Phone className="size-5" aria-hidden />
        </a>
      ) : null}
    </Card>
  );
}
