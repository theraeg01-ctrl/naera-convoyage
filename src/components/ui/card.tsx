import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-surface shadow-card", className)} {...props} />;
}

interface SectionProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Section de page : titre discret + contenu. Structure les écrans mobiles en blocs simples. */
export function Section({ title, description, action, icon, className, children, ...props }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)} {...props}>
      <header className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-faint">
            {icon}
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Ligne libellé / valeur, pour les détails compacts. */
export function DetailRow({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-3", className)}>
      <div className="min-w-0">
        <p className="text-[15px] text-foreground">{label}</p>
        {hint ? <p className="mt-0.5 text-[13px] text-faint">{hint}</p> : null}
      </div>
      <div className="shrink-0 text-right text-[15px] font-medium text-foreground tabular">{value}</div>
    </div>
  );
}
