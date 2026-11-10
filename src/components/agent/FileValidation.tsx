"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ecarterMessage, toutValider, validerMessage } from "@/app/actions-agent";
import { type AgentMessage, BESOINS, OFFRES } from "@/lib/agent";

/** File des messages prêts : Valider, Modifier, Écarter, et « Tout valider ». */
export function FileValidation({ messages }: { messages: AgentMessage[] }) {
  const [pending, start] = useTransition();
  const aValider = messages.filter((m) => m.statut === "a_valider").length;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="font-semibold">Messages prêts</div>
          <div className="text-xs text-muted">{aValider} à valider · ils partent aux heures d&apos;envoi, jamais sans ton accord</div>
        </div>
        {aValider > 1 && (
          <button className="btn-primary" disabled={pending}
            onClick={() => { if (confirm(`Valider les ${aValider} messages d'un coup ?`)) start(() => toutValider()); }}>
            ✅ Tout valider ({aValider})
          </button>
        )}
      </div>
      {messages.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted">Aucun message en attente. L&apos;agent en prépare à chaque passage.</div>}
      <ul className="divide-y divide-border">
        {messages.map((m) => <Carte key={m.id} m={m} />)}
      </ul>
    </div>
  );
}

function Carte({ m }: { m: AgentMessage }) {
  const e = m.agent_entreprises;
  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState(m.texte_valide ?? m.texte_propose);
  const [objet, setObjet] = useState(m.objet ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const valide = m.statut === "valide";
  const besoin = e?.besoins?.find((b) => b.code === e.besoin_principal);

  return (
    <li className="grid gap-3 px-4 py-4 lg:grid-cols-[16rem_1fr]">
      <div className="text-sm">
        <div className="font-semibold">
          {e?.prospect_id ? <Link className="hover:underline" href={`/prospects/${e.prospect_id}`}>{e?.nom}</Link> : e?.nom}
        </div>
        <div className="text-xs text-muted">{[e?.metier, e?.ville].filter(Boolean).join(" · ")}</div>
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          <span className="rounded-full bg-soft-2 px-2 py-0.5">{m.canal === "sms" ? "📱 SMS" : "✉️ E-mail"}{m.etape > 0 ? ` · relance ${m.etape}` : ""}</span>
          {e?.score != null && <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold">Score {e.score}</span>}
        </div>
        <div className="mt-2 text-xs"><b>Besoin :</b> {besoin?.raison ?? BESOINS[e?.besoin_principal ?? ""] ?? "—"}</div>
        <div className="text-xs"><b>Offre :</b> {OFFRES[e?.offre_visee ?? ""] ?? "—"}</div>
        {e?.score_raison && <div className="mt-1 text-xs text-muted">Pourquoi ce score : {e.score_raison}</div>}
        {e?.site && <a className="mt-1 block truncate text-xs text-cyan hover:underline" href={e.site} target="_blank" rel="noreferrer">{e.site}</a>}
      </div>
      <div className="min-w-0">
        {edition ? (
          <div className="flex flex-col gap-2">
            {m.canal === "email" && <input className="input" value={objet} onChange={(x) => setObjet(x.target.value)} aria-label="Objet" />}
            <textarea className="input min-h-48 font-mono text-xs" value={texte} onChange={(x) => setTexte(x.target.value)} aria-label="Message" />
          </div>
        ) : (
          <div className="rounded-lg bg-soft p-3 text-sm">
            {m.objet && <div className="mb-2 font-semibold">Objet : {m.objet}</div>}
            <div className="whitespace-pre-wrap break-words">{m.texte_valide ?? m.texte_propose}</div>
          </div>
        )}
        {erreur && <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">Pas envoyé tel quel : {erreur}</div>}
        {(m.controles?.remarques?.length ?? 0) > 0 && <div className="mt-1 text-xs text-muted">À noter : {m.controles.remarques?.join(", ")}</div>}
        <div className="mt-3 flex flex-wrap gap-2">
          {valide ? (
            <span className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">✅ Validé — partira aux heures d&apos;envoi</span>
          ) : edition ? (
            <button className="btn-primary" disabled={pending} onClick={() => start(async () => {
              const r = await validerMessage(m.id, texte, m.canal === "email" ? objet : undefined);
              if (r.ok) setEdition(false); else setErreur(r.erreur ?? "erreur");
            })}>Enregistrer et valider</button>
          ) : (
            <button className="btn-primary" disabled={pending} onClick={() => start(async () => {
              const r = await validerMessage(m.id); if (!r.ok) setErreur(r.erreur ?? "erreur");
            })}>Valider</button>
          )}
          {!valide && !edition && <button className="btn-ghost" onClick={() => setEdition(true)}>Modifier</button>}
          {edition && <button className="btn-ghost" onClick={() => { setEdition(false); setTexte(m.texte_valide ?? m.texte_propose); }}>Annuler</button>}
          <button className="btn-ghost" disabled={pending}
            onClick={() => { if (confirm("Écarter ce message ? L'agent n'écrira pas à cette entreprise.")) start(() => ecarterMessage(m.id)); }}>
            Écarter
          </button>
        </div>
      </div>
    </li>
  );
}
