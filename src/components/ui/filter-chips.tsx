import Link from "next/link";
import { ScrollActiveIntoView } from "@/components/ui/scroll-active-into-view";
import { cn } from "@/utils/cn";

export interface FilterChip {
  id: string;
  label: string;
  href: string;
  count?: number;
  current: boolean;
}

/**
 * Rangée de filtres (liens). Sur mobile : défilement horizontal assumé,
 * fondu à droite pour signaler la suite, filtre actif ramené dans la vue.
 * Sur grand écran : retour à la ligne.
 */
export function FilterChips({ label, items, className }: { label: string; items: FilterChip[]; className?: string }) {
  return (
    <nav aria-label={label} className={cn("-mx-4 sm:mx-0", className)}>
      <ScrollActiveIntoView className="flex [scroll-padding-inline:1rem] gap-1.5 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] sm:flex-wrap sm:px-0 sm:[mask-image:none]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors last:mr-6 sm:last:mr-0",
              item.current
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className={cn("tabular", item.current ? "opacity-70" : "text-faint")}>{item.count}</span>
            ) : null}
          </Link>
        ))}
      </ScrollActiveIntoView>
    </nav>
  );
}
