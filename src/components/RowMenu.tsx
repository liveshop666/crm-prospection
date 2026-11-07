"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteActivity, deleteSiteEvent } from "@/app/actions";

/** Petit menu « ⋯ » avec « Supprimer » pour une ligne de journal ou d'historique. */
export function RowMenu({ id, kind }: { id: string; kind: "site" | "activity" }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const remove = () => {
    if (!confirm("Supprimer cette ligne ?")) return;
    setOpen(false);
    start(async () => {
      try {
        await (kind === "site" ? deleteSiteEvent(id) : deleteActivity(id));
        setGone(true);
        router.refresh();
      } catch {
        alert("La suppression n'a pas marché. Réessaie.");
      }
    });
  };

  if (gone) return null;
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-label="Options" aria-expanded={open} disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className="grid size-7 place-items-center rounded-md text-muted hover:bg-bg hover:text-text disabled:opacity-50">
        {pending ? "…" : <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
          <button type="button" onClick={remove} className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-bg">🗑️ Supprimer</button>
        </div>
      )}
    </div>
  );
}
