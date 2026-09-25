import { LockKeyhole, ShieldX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "./page-container";

/**
 * Messages 401 / 403 : clairs, sans détail technique. Le statut HTTP est
 * posé par le serveur (unauthorized() / forbidden()), pas par ce composant.
 */
export function AccessMessage({ kind, homeHref }: { kind: "unauthorized" | "forbidden"; homeHref?: string }) {
  if (kind === "unauthorized") {
    return (
      <EmptyState
        className="mx-auto mt-16 max-w-md"
        icon={<LockKeyhole />}
        title="Connexion requise"
        description="Connectez-vous pour accéder à cet espace."
        action={<ButtonLink href="/">Se connecter</ButtonLink>}
      />
    );
  }
  return (
    <EmptyState
      className="mx-auto mt-16 max-w-md"
      icon={<ShieldX />}
      title="Accès non autorisé"
      description={
        homeHref
          ? "Cette page n'est pas disponible avec votre rôle ou votre offre actuelle."
          : "Votre profil ne donne pas accès à cet espace."
      }
      action={
        homeHref ? (
          <ButtonLink href={homeHref}>Retour à l&apos;accueil</ButtonLink>
        ) : (
          <ButtonLink href="/">Changer de profil</ButtonLink>
        )
      }
    />
  );
}

/** Pages 401 / 403 hors portail (sans navigation). */
export function AccessView({ kind }: { kind: "unauthorized" | "forbidden" }) {
  return (
    <PageContainer>
      <AccessMessage kind={kind} />
    </PageContainer>
  );
}
