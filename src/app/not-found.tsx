import { NotFoundView } from "@/components/layout/not-found-view";
import { PageContainer } from "@/components/layout/page-container";

export default function NotFound() {
  return (
    <PageContainer>
      <NotFoundView href="/" label="Retour à l'accueil" />
    </PageContainer>
  );
}
