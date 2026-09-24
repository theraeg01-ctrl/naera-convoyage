import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Libellé + champ + aide/erreur, reliés pour les lecteurs d'écran. */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={htmlFor} className="block text-[15px] font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClassName = cn(
  "block h-14 w-full rounded-2xl border border-border bg-surface px-4 text-foreground shadow-card",
  "placeholder:text-faint transition-[border-color,box-shadow] duration-150",
  "hover:border-border-strong focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger-soft",
  "disabled:opacity-60",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClassName, className)} {...props} />;
}

interface AffixInputProps extends Omit<ComponentProps<"input">, "prefix"> {
  prefix?: ReactNode;
  suffix?: ReactNode;
}

/** Champ avec icône ou unité (€, km, min). */
export function AffixInput({ prefix, suffix, className, ...props }: AffixInputProps) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-faint [&_svg]:size-5">
          {prefix}
        </span>
      ) : null}
      <input className={cn(inputClassName, prefix && "pl-12", suffix && "pr-14", className)} {...props} />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-faint">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClassName, "h-auto min-h-24 py-3", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClassName, "appearance-none bg-surface pr-11", className)} {...props} />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-faint"
        aria-hidden
      />
    </div>
  );
}
