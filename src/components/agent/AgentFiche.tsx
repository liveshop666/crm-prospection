import { FilDirect } from "@/components/agent/FilDirect";
import { type AgentEvent, BESOINS, OFFRES, STATUTS_AGENT } from "@/lib/agent";
import { createClient } from "@/lib/supabase/server";

/** Onglet « Ce que l'agent a fait » sur la fiche d'un prospect : recherches, raison du score, messages, réponses. */
export async function AgentFiche({ prospectId }: { prospectId: string }) {
  const supabase = await createClient();
  const { data: e } = await supabase.from("agent_entreprises").select("*").eq("prospect_id", prospectId).maybeSingle();
  if (!e) return null;
  const [{ data: ev }, { data: msgs }, { data: reps }] = await Promise.all([
    supabase.from("agent_events").select("id, created_at, entreprise_id, etape, phrase, niveau").eq("entreprise_id", e.id).order("id", { ascending: false }).limit(100),
    supabase.from("agent_messages").select("id, created_at, canal, etape, objet, statut, envoye_at").eq("entreprise_id", e.id).order("created_at"),
    supabase.from("agent_reponses").select("id, created_at, categorie, resume").eq("entreprise_id", e.id).order("created_at"),
  ]);
  return (
    <section className="card mt-6 p-4">
      <h2 className="mb-3 font-semibold">🤖 Ce que l&apos;agent a fait</h2>
      <div className="mb-3 grid gap-2 text-sm md:grid-cols-4">
        <div><div className="text-xs text-muted">Statut agent</div>{STATUTS_AGENT[e.statut] ?? e.statut}</div>
        <div><div className="text-xs text-muted">Besoin principal</div>{BESOINS[e.besoin_principal ?? ""] ?? "—"}</div>
        <div><div className="text-xs text-muted">Offre</div>{OFFRES[e.offre_visee ?? ""] ?? "—"}</div>
        <div><div className="text-xs text-muted">Score</div>{e.score ?? "—"}/100 <span className="text-xs text-muted">{e.score_raison}</span></div>
      </div>
      {(msgs ?? []).length > 0 && (
        <ul className="mb-3 text-sm">
          {(msgs ?? []).map((m) => (
            <li key={m.id}>• {m.etape === 0 ? "Premier message" : `Relance ${m.etape}`} ({m.canal}) — {m.statut}{m.envoye_at ? ` le ${new Date(m.envoye_at).toLocaleDateString("fr-FR")}` : ""}{m.objet ? ` · « ${m.objet} »` : ""}</li>
          ))}
        </ul>
      )}
      {(reps ?? []).length > 0 && (
        <ul className="mb-3 text-sm">
          {(reps ?? []).map((r) => <li key={r.id}>📩 Réponse : <b>{r.categorie ?? "à classer"}</b>{r.resume ? ` — ${r.resume}` : ""}</li>)}
        </ul>
      )}
      <FilDirect initial={(ev ?? []) as AgentEvent[]} entrepriseId={e.id} hauteur="max-h-80" />
    </section>
  );
}
