"use client";

import { ChevronRight, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { selectPersonaAction } from "@/actions/session";
import { clearOfflinePages } from "@/components/layout/navigation";
import { cn } from "@/utils/cn";

export interface PersonaOption {
  key: string;
  name: string;
  detail: string;
  badge?: string;
  current: boolean;
}

export interface PersonaGroup {
  id: string;
  title: string;
  description: string;
  personas: PersonaOption[];
}

function PersonaButton({ persona }: { persona: PersonaOption }) {
  const { pending, data } = useFormStatus();
  const busy = pending && data?.get("persona") === persona.key;
  return (
    <button
      type="submit"
      name="persona"
      value={persona.key}
      disabled={pending}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border bg-surface px-4 py-3 text-left transition-[border-color,transform] active:scale-[0.99] disabled:opacity-70",
        persona.current ? "border-accent" : "border-border hover:border-border-strong",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
        {persona.name
          .split(" ")
          .map((part) => part[0])
          .slice(0, 2)
          .join("")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{persona.name}</span>
          {persona.current ? <span className="text-xs font-semibold text-accent">Connecté</span> : null}
        </span>
        <span className="block truncate text-sm text-muted">{persona.detail}</span>
      </span>
      {persona.badge ? (
        <span className="hidden shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted sm:inline">
          {persona.badge}
        </span>
      ) : null}
      {busy ? (
        <LoaderCircle className="size-5 shrink-0 animate-spin text-faint" aria-hidden />
      ) : (
        <ChevronRight
          className="size-5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      )}
    </button>
  );
}

/** Connexion de démonstration : un profil = un rôle réel, vérifié côté serveur. */
export function PersonaPicker({ groups }: { groups: PersonaGroup[] }) {
  return (
    <form
      action={async (formData) => {
        await clearOfflinePages().catch(() => undefined);
        await selectPersonaAction(formData);
      }}
      className="grid gap-8 lg:grid-cols-2"
    >
      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <header className="px-1">
            <h2 className="text-[13px] font-semibold tracking-[0.08em] text-faint uppercase">{group.title}</h2>
            <p className="mt-1 text-sm text-muted">{group.description}</p>
          </header>
          <div className="space-y-2">
            {group.personas.map((persona) => (
              <PersonaButton key={persona.key} persona={persona} />
            ))}
          </div>
        </section>
      ))}
    </form>
  );
}
