import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      className="mt-10"
      icon={<SearchX />}
      title="Page introuvable"
      description="Cette mission ou cette page n'existe pas (ou plus)."
      action={<ButtonLink href="/missions">Voir les missions</ButtonLink>}
    />
  );
}
