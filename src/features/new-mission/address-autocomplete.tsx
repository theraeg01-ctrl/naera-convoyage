"use client";

import { MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { inputClassName } from "@/components/ui/field";
import { cn } from "@/utils/cn";

interface Suggestion {
  id: string;
  label: string;
  detail: string;
}

interface AddressAutocompleteProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  icon?: ReactNode;
  invalid?: boolean;
  describedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * Champ adresse avec suggestions (combobox ARIA) : flèches, Entrée, Échap.
 * Les suggestions viennent de /api/v1/places ; une adresse libre reste acceptée.
 */
export function AddressAutocomplete({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  icon,
  invalid,
  describedBy,
  inputRef,
}: AddressAutocompleteProps) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const lastSelected = useRef<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < 2 || query === lastSelected.current) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/places?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) return;
        const body = (await response.json()) as { data: Suggestion[] };
        setSuggestions(body.data);
        setActive(-1);
        setOpen(body.data.length > 0);
      } catch {
        // Autocomplétion indisponible : la saisie libre reste possible.
      }
    }, 120);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, focused]);

  const select = (suggestion: Suggestion) => {
    lastSelected.current = suggestion.label;
    onChange(suggestion.label);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-faint [&_svg]:size-5">
        {icon ?? <MapPin />}
      </span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        role="combobox"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
        value={value}
        className={cn(inputClassName, "pl-12")}
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          lastSelected.current = null;
          onChange(event.target.value);
          if (event.target.value.trim().length < 2) setOpen(false);
        }}
        onBlur={() => {
          setFocused(false);
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % suggestions.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            select(suggestions[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions d'adresses"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-surface py-1.5 shadow-float animate-fade"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                select(suggestion);
              }}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2",
                index === active ? "bg-surface-2" : "hover:bg-surface-2",
              )}
            >
              <MapPin className="size-4 shrink-0 text-faint" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">{suggestion.label}</span>
                <span className="block truncate text-xs text-faint">{suggestion.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
