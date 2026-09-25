import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  eyebrow,
  description,
  backHref,
  backLabel = "Retour",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("mb-6 space-y-3", className)}>
      {backHref ? (
        <Link
          href={backHref}
          className="-ml-2 inline-flex h-10 items-center gap-1 rounded-xl pr-3 pl-1 text-[15px] font-medium text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <ChevronLeft className="size-5" aria-hidden />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-1 text-[13px] font-semibold tracking-[0.08em] text-faint uppercase">{eyebrow}</div>
          ) : null}
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1.5 text-[15px] text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
