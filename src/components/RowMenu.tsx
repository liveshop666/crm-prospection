"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteActivity, hideSiteEvent } from "@/app/actions";
import {
  removeAgentTask, removeMessage, removeOffer, removeProspectRow, setMessageVerdict,
} from "@/app/actions-workspace";

type Kind = "site" | "activity" | "message" | "prospect" | "offer" | "task";
type Choice = "spam" | "message" | "message+fiche";

const ITEM = "w-full px-3 py-2 text-left text-sm hover:bg-soft";
const DANGER = `${ITEM} text-rose-600 dark:text-rose-400`;

/** Petit menu « ⋯ » avec les suppressions possibles pour une ligne (message, fiche, offre, ordre, historique…). */
export function RowMenu({ id, kind, hasProspect = false }: { id: string; kind: Kind; hasProspect?: boolean }) {
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

  const run = (choice?: Choice) => {
    const ask =
      kind === "activity" ? "Supprimer cette ligne de l'historique ?"
      : kind === "prospect" ? "Supprimer cette fiche avec son historique, ses messages liés et ses offres ?"
      : kind === "offer" ? "Supprimer cette offre ? Si elle était signée, elle sort du chiffre d'affaires."
      : choice === "message+fiche" ? "Supprimer ce message ET la fiche client liée (avec son historique et ses offres) ?"
      : null;
    if (ask && !confirm(ask)) return;
    setOpen(false);
    start(async () => {
      try {
        if (kind === "site") await hideSiteEvent(id);
        else if (kind === "activity") await deleteActivity(id);
        else if (kind === "prospect") await removeProspectRow(id);
        else if (kind === "offer") await removeOffer(id);
        else if (kind === "task") await removeAgentTask(id);
        else if (choice === "spam") await setMessageVerdict(id, "spam");
        else await removeMessage(id, choice === "message+fiche");
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
        className="grid size-7 place-items-center rounded-md text-muted hover:bg-soft hover:text-text disabled:opacity-50">
        {pending ? "…" : <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
          {kind === "site" && (
            <button type="button" onClick={() => run()} className={ITEM}>
              🗑️ Retirer de la liste<span className="block text-xs text-muted">les chiffres restent</span>
            </button>
          )}
          {kind === "message" && (
            <>
              <button type="button" onClick={() => run("spam")} className={ITEM}>
                🚫 C&apos;est du spam<span className="block text-xs text-muted">va dans l&apos;onglet Spam</span>
              </button>
              <button type="button" onClick={() => run("message")} className={DANGER}>🗑️ Supprimer le message</button>
              {hasProspect && <button type="button" onClick={() => run("message+fiche")} className={DANGER}>🗑️ Supprimer message + fiche</button>}
            </>
          )}
          {kind === "prospect" && <button type="button" onClick={() => run()} className={DANGER}>🗑️ Supprimer la fiche</button>}
          {kind === "offer" && <button type="button" onClick={() => run()} className={DANGER}>🗑️ Supprimer l&apos;offre</button>}
          {kind === "task" && <button type="button" onClick={() => run()} className={DANGER}>🗑️ Supprimer cet ordre</button>}
          {kind === "activity" && <button type="button" onClick={() => run()} className={DANGER}>🗑️ Supprimer</button>}
        </div>
      )}
    </div>
  );
}
