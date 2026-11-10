"use client";
import { useState, useTransition } from "react";
import { marquerFait, mettreEnPause, passerEnReel, passerEnSimulation, testerUneEntreprise } from "@/app/actions-agent";

export function BoutonPause({ pause }: { pause: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className={`${pause ? "btn-primary" : "btn-ghost"} px-5 py-3 text-base`} disabled={pending} onClick={() => start(() => mettreEnPause(!pause))}>
      {pause ? "▶️ Reprendre" : "⏸️ Mettre en pause"}
    </button>
  );
}

export function BoutonMode({ simulation }: { simulation: boolean }) {
  const [pending, start] = useTransition();
  const [manque, setManque] = useState<string[] | null>(null);
  if (!simulation) {
    return <button className="btn-ghost px-5 py-3 text-base" disabled={pending}
      onClick={() => { if (confirm("Revenir en simulation ? Plus aucun message ne partira.")) start(() => passerEnSimulation()); }}>🧪 Repasser en simulation</button>;
  }
  return (
    <span className="flex flex-col items-end gap-1">
      <button className="btn-primary px-5 py-3 text-base" disabled={pending} onClick={() => {
        if (!confirm("Passer en réel ? Les messages validés partiront vraiment (10 par jour la première semaine).")) return;
        start(async () => { const r = await passerEnReel(); setManque(r.ok ? null : r.manque ?? ["réglage manquant"]); });
      }}>🚀 Passer en réel</button>
      {manque && <span className="max-w-xs text-right text-xs text-rose-600 dark:text-rose-300">Il manque : {manque.join(" ; ")} (voir Réglages).</span>}
    </span>
  );
}

export function BoutonTester() {
  const [pending, start] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  return (
    <span className="flex flex-col gap-1">
      <button className="btn-ghost px-5 py-3 text-base" disabled={pending} onClick={() => start(async () => {
        const r = await testerUneEntreprise();
        setInfo(!r.ok ? (r.raison ?? "Test impossible pour l'instant.")
          : r.immediat ? "Test lancé : regarde « Ce que je fais en ce moment »." : "Test demandé : il se fera au prochain passage de l'agent.");
      })}>🧪 Tester sur 1 entreprise</button>
      {info && <span className="text-xs text-muted">{info}</span>}
    </span>
  );
}

export function BoutonFait({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button className="btn-ghost px-2 py-1 text-xs" disabled={pending} onClick={() => start(() => marquerFait(id))}>Fait ✓</button>;
}
