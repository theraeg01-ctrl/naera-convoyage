"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/utils/cn";

interface LinkSelectOption {
  value: string;
  label: string;
  href: string;
}

/** Filtre discret : une liste déroulante native dont chaque choix est une URL. */
export function LinkSelect({
  label,
  value,
  options,
  className,
}: {
  label: string;
  value: string;
  options: LinkSelectOption[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className={cn("relative inline-flex items-center", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          const option = options.find((candidate) => candidate.value === event.target.value);
          if (option) startTransition(() => router.replace(option.href, { scroll: false }));
        }}
        aria-busy={pending}
        className="h-9 appearance-none rounded-lg border border-border bg-surface pr-8 pl-3 font-medium text-muted transition-colors hover:border-border-strong focus:border-accent focus:outline-none aria-busy:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4 text-faint" aria-hidden />
    </label>
  );
}
