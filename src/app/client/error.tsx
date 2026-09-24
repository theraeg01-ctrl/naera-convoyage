"use client";

import { ErrorView } from "@/components/layout/error-view";

/** Erreur dans une page du portail : la navigation reste disponible. */
export default function PortalError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView {...props} />;
}
