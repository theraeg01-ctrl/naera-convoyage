import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function NotFoundView({ href, label }: { href: string; label: string }) {
  return (
    <EmptyState
      className="mt-10"
      icon={<SearchX />}
      title="Page introuvable"
      description="Cette mission ou cette page n'existe pas, ou n'est pas accessible avec ce profil."
      action={<ButtonLink href={href}>{label}</ButtonLink>}
    />
  );
}
