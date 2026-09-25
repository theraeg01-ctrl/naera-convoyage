import { Download, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MissionProgress, MissionStatus } from "@/core/mission/types";

interface DocumentEntry {
  id: string;
  label: string;
  detail: string;
}

/**
 * Documents d'une mission. Les fichiers (PDF) ne sont pas encore générés :
 * la liste montre ce qui sera disponible, le téléchargement est désactivé.
 */
export function MissionDocuments({
  status,
  progress,
  invoiceNumber,
}: {
  status: MissionStatus;
  progress: MissionProgress;
  invoiceNumber?: string | null;
}) {
  const documents: DocumentEntry[] = [
    { id: "order", label: status === "QUOTED" ? "Devis" : "Bon de commande", detail: "Récapitulatif de la prestation" },
  ];
  if (progress.inspectedAt)
    documents.push({ id: "inspection", label: "PV de prise en charge", detail: "État du véhicule au départ" });
  if (progress.deliveredAt)
    documents.push({ id: "delivery", label: "PV de livraison", detail: "État à l'arrivée et signature" });
  if (invoiceNumber) documents.push({ id: "invoice", label: `Facture ${invoiceNumber}`, detail: "PDF" });

  return (
    <Card className="divide-y divide-border px-5">
      {documents.map((document) => (
        <div key={document.id} className="flex items-center gap-3 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <FileText className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{document.label}</span>
            <span className="block truncate text-sm text-faint">{document.detail}</span>
          </span>
          <button
            type="button"
            disabled
            aria-label={`Télécharger ${document.label} (bientôt disponible)`}
            className="flex size-10 items-center justify-center rounded-xl text-faint disabled:opacity-60"
          >
            <Download className="size-5" aria-hidden />
          </button>
        </div>
      ))}
      <p className="py-3 text-sm text-faint">Téléchargement des documents bientôt disponible.</p>
    </Card>
  );
}
