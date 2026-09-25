import { AccessMessage } from "@/components/layout/access-view";

/** 403 dans le portail : la navigation reste disponible. */
export default function Forbidden() {
  return <AccessMessage kind="forbidden" homeHref="/pro" />;
}
