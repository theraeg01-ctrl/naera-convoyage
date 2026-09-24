import { cn } from "@/utils/cn";

/** Monogramme NAERA : un « N » tracé comme une route, avec le point d'arrivée. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M10 22.5V9.5l12 13V11"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="9.5" r="2.4" className="fill-accent" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-[0.26em]">NAERA</span>
          <span className="mt-1 text-[11px] font-medium tracking-[0.14em] text-faint uppercase">Convoyage</span>
        </span>
      )}
    </span>
  );
}
