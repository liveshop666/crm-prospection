"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Recharge les données de la page (nouveaux prospects, RDV, demandes du site…). */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => router.refresh())} disabled={pending}
      className="btn-ghost" aria-label="Rafraîchir" title="Rafraîchir">
      <svg viewBox="0 0 24 24" className={`size-4 ${pending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" />
      </svg>
      <span>{pending ? "Mise à jour…" : "Rafraîchir"}</span>
    </button>
  );
}
