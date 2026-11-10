"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { type AgentEvent, heure } from "@/lib/agent";
import { createClient } from "@/lib/supabase/client";

type Fiche = { id: string; nom: string; metier: string | null; ville: string | null };

/** Icône et titre de chaque étape, dans l'ordre où l'agent les fait. */
const ETAPES: Record<string, { icone: string; titre: string }> = {
  test: { icone: "🧪", titre: "Test demandé depuis le CRM" },
  recherche: { icone: "🗂️", titre: "Je cherche de nouvelles entreprises" },
  verification: { icone: "🔎", titre: "Je vérifie sa présence en ligne" },
  decision: { icone: "🎯", titre: "Je choisis son besoin principal" },
  redaction: { icone: "✍️", titre: "J'écris son message" },
  envoi: { icone: "📨", titre: "J'envoie le message" },
  reponse: { icone: "💬", titre: "Je lis sa réponse" },
};

/**
 * « Ce que je fais en ce moment » : les étapes de la dernière fiche traitée, mises à jour en direct.
 * La dernière étape est « en cours » si elle date de moins de 3 minutes.
 */
export function EnCeMoment({ initial, fiches }: { initial: AgentEvent[]; fiches: Fiche[] }) {
  const [events, setEvents] = useState<AgentEvent[]>(initial);
  const [noms, setNoms] = useState<Record<string, Fiche>>(() => Object.fromEntries(fiches.map((f) => [f.id, f])));
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const connus = useRef(new Set(fiches.map((f) => f.id)));

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase.channel("agent-en-ce-moment")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_events" }, (payload) => {
        const e = payload.new as AgentEvent;
        setEvents((prev) => [e, ...prev].slice(0, 120));
        const id = e.entreprise_id;
        if (id && !connus.current.has(id)) {
          connus.current.add(id);
          supabase.from("agent_entreprises").select("id, nom, metier, ville").eq("id", id).maybeSingle()
            .then(({ data }) => { if (data) setNoms((p) => ({ ...p, [id]: data as Fiche })); });
        }
      })
      .subscribe();
    const t = setInterval(() => setMaintenant(Date.now()), 30_000);
    return () => { supabase.removeChannel(canal); clearInterval(t); };
  }, []);

  const { fiche, lignes } = useMemo(() => {
    const dernier = events.find((e) => e.entreprise_id);
    if (!dernier?.entreprise_id) return { fiche: null, lignes: [] as AgentEvent[] };
    const id = dernier.entreprise_id;
    return { fiche: noms[id] ?? { id, nom: "", metier: null, ville: null }, lignes: events.filter((e) => e.entreprise_id === id).slice(0, 8).reverse() };
  }, [events, noms]);

  const recent = lignes.length > 0 && maintenant - new Date(lignes[lignes.length - 1].created_at).getTime() < 3 * 60_000;

  return (
    <div className="card p-4">
      <div className="mb-1 text-base font-semibold">👀 Ce que je fais en ce moment</div>
      {!fiche ? (
        <p className="py-6 text-center text-sm text-muted">Je n&apos;ai encore traité aucune fiche. Clique « Tester sur 1 entreprise » pour me voir travailler.</p>
      ) : (
        <>
          <div className="mb-3 text-xs text-muted">
            {recent ? "Fiche en cours" : "Dernière fiche traitée"} : <b className="text-text">{fiche.nom || "…"}</b>
            {[fiche.ville, fiche.metier].filter(Boolean).map((x) => ` · ${x}`).join("")}
          </div>
          <ol className="flex flex-col gap-3">
            {lignes.map((e, i) => {
              const et = ETAPES[e.etape] ?? { icone: "•", titre: e.etape };
              const enCours = recent && i === lignes.length - 1 && e.etape !== "redaction";
              const rouge = e.niveau === "erreur" || e.niveau === "alerte";
              return (
                <li key={e.id} className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-soft-2 text-lg">{et.icone}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{et.titre}</div>
                    <div className={`text-xs ${rouge ? "text-amber-700 dark:text-amber-300" : "text-muted"}`}>{e.phrase}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${enCours ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : rouge ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}
                    title={heure(e.created_at)}>
                    {enCours ? "en cours" : rouge ? "à voir" : "fait"}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
