"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BoutonSupprimer } from "@/components/agent/Pilotage";
import { BESOINS, STATUTS_AGENT } from "@/lib/agent";
import { createClient } from "@/lib/supabase/client";

type Ligne = {
  id: string; nom: string; metier: string | null; ville: string | null; statut: string; canal: string | null;
  score: number | null; besoin_principal: string | null; site: string | null; prospect_id: string | null; updated_at: string;
};

const FILTRES: [string, string][] = [
  ["actives", "En cours"], ["qualifie", "Qualifiées"], ["message_pret", "Message prêt"], ["contacte", "Contactées"],
  ["chaud", "🔥 Intéressées"], ["a_appeler", "À appeler"], ["a_verifier", "À vérifier"], ["a_verifier_manuellement", "Doute"],
  ["sans_reponse", "Sans réponse"], ["exclu", "Exclues / supprimées"], ["toutes", "Toutes"],
];
const ACTIVES = ["qualifie", "message_pret", "contacte", "relance_1", "relance_2", "chaud", "a_appeler", "a_verifier_manuellement"];

/**
 * Toutes les entreprises que l'agent a trouvées ou vérifiées (pas seulement celles qui sont dans « Prospects ») :
 * recherche, filtre par étape, suppression directe.
 */
export function EntreprisesAgent() {
  const [filtre, setFiltre] = useState("actives");
  const [q, setQ] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [charge, setCharge] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let annule = false;
    const t = setTimeout(async () => {
      setCharge(true);
      let req = supabase.from("agent_entreprises")
        .select("id, nom, metier, ville, statut, canal, score, besoin_principal, site, prospect_id, updated_at", { count: "exact" })
        .order("updated_at", { ascending: false }).limit(100);
      if (filtre === "actives") req = req.in("statut", ACTIVES);
      else if (filtre === "contacte") req = req.in("statut", ["contacte", "relance_1", "relance_2"]);
      else if (filtre !== "toutes") req = req.eq("statut", filtre);
      const mot = q.trim().replace(/[%,()]/g, " ");
      if (mot) req = req.or(`nom.ilike.%${mot}%,ville.ilike.%${mot}%,metier.ilike.%${mot}%`);
      const { data, count } = await req;
      if (!annule) { setLignes((data ?? []) as Ligne[]); setTotal(count ?? null); setCharge(false); }
    }, 250);
    return () => { annule = true; clearTimeout(t); };
  }, [filtre, q, version]);

  // la liste suit le travail de l'agent en direct
  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | null = null;
    const canal = supabase.channel("agent-entreprises-liste")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_events" }, () => {
        if (t) clearTimeout(t); t = setTimeout(() => setVersion((v) => v + 1), 2000);
      }).subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <div className="font-semibold">🏢 Toutes les entreprises de l&apos;agent</div>
          <div className="text-xs text-muted">Tout ce qu&apos;il a trouvé et vérifié. L&apos;onglet « Prospects » ne reçoit une fiche qu&apos;au moment où un message est prêt.</div>
        </div>
        <input className="input w-full max-w-xs" placeholder="Chercher un nom, une ville, un métier…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
        {FILTRES.map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${filtre === k ? "bg-accent text-accent-fg" : "bg-soft-2 text-muted hover:text-text"}`}>{l}</button>
        ))}
      </div>
      <div className="max-h-[28rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-soft text-left text-xs text-muted">
            <tr><th className="px-4 py-2">Entreprise</th><th className="px-2 py-2">Étape</th><th className="hidden px-2 py-2 md:table-cell">Besoin</th><th className="px-2 py-2">Score</th><th className="px-2 py-2" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!charge && lignes.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted">Aucune entreprise ici.</td></tr>}
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2">
                  {l.prospect_id ? <Link className="font-medium hover:underline" href={`/prospects/${l.prospect_id}`}>{l.nom}</Link> : <span className="font-medium">{l.nom}</span>}
                  <div className="text-xs text-muted">{[l.metier, l.ville].filter(Boolean).join(" · ")}
                    {l.site && <> · <a className="text-cyan hover:underline" href={l.site} target="_blank" rel="noreferrer">site</a></>}</div>
                </td>
                <td className="px-2 py-2 text-xs">{STATUTS_AGENT[l.statut] ?? l.statut}{l.canal ? <span className="text-muted"> · {l.canal}</span> : null}</td>
                <td className="hidden px-2 py-2 text-xs text-muted md:table-cell">{BESOINS[l.besoin_principal ?? ""] ?? "—"}</td>
                <td className="px-2 py-2 text-xs tabular-nums">{l.score ?? "—"}</td>
                <td className="px-2 py-2 text-right">{l.statut !== "exclu" && <BoutonSupprimer id={l.id} nom={l.nom} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-4 py-2 text-xs text-muted">
        {charge ? "Chargement…" : `${lignes.length}${total != null && total > lignes.length ? ` sur ${total}` : ""} entreprise${lignes.length > 1 ? "s" : ""}`}
      </div>
    </div>
  );
}
