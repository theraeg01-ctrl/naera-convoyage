"use client";

import { ErrorView } from "@/components/layout/error-view";
import { PageContainer } from "@/components/layout/page-container";

export default function ErrorPage(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <PageContainer>
      <ErrorView {...props} />
    </PageContainer>
  );
}
