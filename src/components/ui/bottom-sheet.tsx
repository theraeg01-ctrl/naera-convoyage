"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Panneau inférieur sur mobile, fenêtre centrée sur grand écran.
 * Repose sur <dialog> : piège du focus, touche Échap et fond natifs.
 */
export function BottomSheet({ open, onClose, title, description, children, footer }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none bg-transparent p-0 text-foreground backdrop:bg-(--overlay) backdrop:backdrop-blur-[2px]",
        "sm:m-auto sm:max-w-lg",
        "open:animate-rise",
      )}
    >
      <div className="flex max-h-[88dvh] flex-col rounded-t-[28px] border border-border bg-surface shadow-float sm:rounded-[28px]">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border-strong sm:hidden" aria-hidden />
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-2 sm:pt-5">
          <div>
            <h2 id="sheet-title" className="text-lg font-semibold tracking-tight">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {footer ? (
          <footer className="border-t border-border px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
