import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface DisclosureProps {
  summary: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

/** Divulgation progressive : détails masqués par défaut (élément natif <details>). */
export function Disclosure({ summary, hint, icon, defaultOpen, className, children }: DisclosureProps) {
  return (
    <details
      open={defaultOpen}
      className={cn("group rounded-2xl border border-border bg-surface shadow-card", className)}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
        {icon ? <span className="text-faint [&_svg]:size-5">{icon}</span> : null}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{summary}</span>
          {hint ? <span className="block text-sm text-faint">{hint}</span> : null}
        </span>
        <ChevronDown
          className="size-5 text-faint transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border px-5 py-5">{children}</div>
    </details>
  );
}
