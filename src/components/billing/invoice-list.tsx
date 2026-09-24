import { Download, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { INVOICE_STATUS_LABELS, type Invoice, type InvoiceStatus } from "@/core/accounts/types";
import { formatEuro } from "@/core/shared/format";
import { formatShortDate } from "@/utils/dates";

const TONES: Record<InvoiceStatus, "neutral" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  ISSUED: "warning",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "neutral",
};

/** Factures client (montants facturés uniquement). Téléchargement PDF à venir. */
export function InvoiceList({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={<Receipt />}
        title="Aucune facture"
        description="Les factures apparaissent ici une fois les missions terminées."
      />
    );
  }
  return (
    <Card className="divide-y divide-border px-5">
      {invoices.map((invoice) => (
        <div key={invoice.id} className="flex items-center gap-3 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
              <span className="font-mono text-sm">{invoice.number}</span>
              <Badge tone={TONES[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
            </p>
            <p className="text-sm text-faint">Émise le {formatShortDate(invoice.issuedAt)}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold tabular">{formatEuro(invoice.amountTTC, 2)}</p>
            <p className="text-xs text-faint">TTC</p>
          </div>
          <button
            type="button"
            disabled
            aria-label={`Télécharger la facture ${invoice.number} (bientôt disponible)`}
            className="flex size-10 items-center justify-center rounded-xl text-faint disabled:opacity-60"
          >
            <Download className="size-5" aria-hidden />
          </button>
        </div>
      ))}
    </Card>
  );
}
