import { LockKeyhole, ShieldX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "./page-container";

/** Pages 401 / 403 : message clair, jamais de détail technique. */
export function AccessView({ kind }: { kind: "unauthorized" | "forbidden" }) {
  return (
    <PageContainer>
      {kind === "unauthorized" ? (
        <EmptyState
          className="mx-auto mt-16 max-w-md"
          icon={<LockKeyhole />}
          title="Connexion requise"
          description="Choisis un profil pour accéder à cet espace."
          action={<ButtonLink href="/">Se connecter</ButtonLink>}
        />
      ) : (
        <EmptyState
          className="mx-auto mt-16 max-w-md"
          icon={<ShieldX />}
          title="Accès non autorisé"
          description="Ton profil ne donne pas accès à cette page. Si tu penses que c'est une erreur, contacte ton administrateur."
          action={<ButtonLink href="/">Changer de profil</ButtonLink>}
        />
      )}
    </PageContainer>
  );
}
