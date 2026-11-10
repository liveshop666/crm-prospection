import Link from "next/link";
import { demandeRgpd, enregistrerReglages } from "@/app/actions-agent";
import { FileValidation } from "@/components/agent/FileValidation";
import { EnCeMoment } from "@/components/agent/EnCeMoment";
import { FilDirect, RafraichirEnDirect } from "@/components/agent/FilDirect";
import { BoutonFait, BoutonMode, BoutonPause, BoutonTester } from "@/components/agent/Pilotage";
import { CopyButton } from "@/components/client";
import { PageHeader, Stat } from "@/components/ui";
import { type AgentEvent, type AgentMessage, OFFRES, type Tableau, ZONES } from "@/lib/agent";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Espace « Agent de prospection » : voir l'agent travailler en direct et le piloter sans ouvrir n8n.
 * Les 8 zones du cahier des charges : bandeau d'état, fil en direct, messages prêts, compteurs,
 * jauge du quota n8n, entonnoir, listes d'action, réglages.
 */
export default async function AgentPage() {
  const supabase = await createClient();
  const [{ data: t, error }, { data: ev }, { data: msgs }, { data: actions }, { data: chauds }, { data: runs }] = await Promise.all([
    supabase.rpc("agent_tableau"),
    supabase.from("agent_events").select("id, created_at, entreprise_id, etape, phrase, niveau").order("id", { ascending: false }).limit(80),
    supabase.from("agent_messages").select("*, agent_entreprises(*)").in("statut", ["a_valider", "valide"]).in("canal", ["email", "sms"])
      .order("statut").order("created_at").limit(60),
    supabase.from("agent_messages").select("id, canal, texte_propose, statut, agent_entreprises(nom, metier, ville, telephone, linkedin_url, prospect_id, score)")
      .eq("statut", "a_faire").order("created_at", { ascending: false }).limit(40),
    supabase.from("agent_entreprises").select("id, nom, metier, ville, telephone, prospect_id, reponse_at").eq("statut", "chaud").order("reponse_at", { ascending: false }).limit(20),
    supabase.from("agent_runs").select("workflow, statut, created_at").eq("statut", "en_cours").gte("created_at", new Date(Date.now() - 10 * 60e3).toISOString()).limit(1),
  ]);
  const evts = (ev ?? []) as AgentEvent[];
  const idsFiches = [...new Set(evts.map((e) => e.entreprise_id).filter(Boolean))].slice(0, 20) as string[];
  const { data: fiches } = idsFiches.length
    ? await supabase.from("agent_entreprises").select("id, nom, metier, ville").in("id", idsFiches)
    : { data: [] };

  if (error || !t) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={<>Agent de <span className="text-warm">prospection</span></>} />
        <div className="card p-5 text-sm">
          L&apos;espace de l&apos;agent n&apos;est pas encore installé dans la base : lance les fichiers <code>agent/supabase/0004</code> à <code>0008</code>
          (dépôt <code>agent-de-solvelab</code>) dans Supabase → SQL Editor. {error?.message}
        </div>
      </div>
    );
  }
  const tab = t as Tableau;
  const c = tab.config;
  const b = tab.budget;
  const pct = Math.min(100, Math.round(b?.details?.pct_utilise ?? (b ? (100 * b.executions_mois) / c.quota_mensuel : 0)));
  type Action = { id: string; canal: string; texte_propose: string; agent_entreprises: { nom: string; metier: string | null; ville: string | null; telephone: string | null; linkedin_url: string | null; prospect_id: string | null; score: number | null } | null };
  const liste = (actions ?? []) as unknown as Action[];
  const aAppeler = liste.filter((a) => a.canal === "appel");
  const linkedin = liste.filter((a) => a.canal === "linkedin");

  // Bandeau à la première personne : l'agent dit ce qu'il fait, comme un collègue
  const auTravail = (runs ?? []).length > 0;
  const derniere = evts[0]?.phrase?.replace(/[.…]+$/, "");
  const etat = !c.actif ? { titre: "Je suis désactivé", cls: "border-slate-500/30 bg-slate-500/10", pastille: "bg-slate-400" }
    : c.pause ? { titre: "Je suis en pause — rien ne part, je lis quand même les réponses", cls: "border-amber-500/40 bg-amber-500/10", pastille: "bg-amber-500" }
    : b?.niveau === "pause_envois" ? { titre: "Quota n8n presque épuisé : j'ai mis les envois en pause", cls: "border-rose-500/40 bg-rose-500/10", pastille: "bg-rose-500" }
    : auTravail ? { titre: `Je travaille${derniere ? " — " + derniere.charAt(0).toLowerCase() + derniere.slice(1) : ""}`, cls: "border-emerald-500/40 bg-emerald-500/10", pastille: "bg-emerald-500 animate-pulse" }
    : { titre: `Je me repose — prochain passage à ${tab.prochain_passage ?? "—"}`, cls: "border-sky-500/40 bg-sky-500/10", pastille: "bg-sky-500" };
  const santeQuota = b?.niveau === "pause_envois" ? "envois en pause" : b?.niveau === "reduit" ? "rythme réduit" : "tout va bien";

  const ent = tab.entonnoir;
  const etapes: [string, number][] = [["Entreprises", ent.entreprises], ["Qualifiées", ent.qualifiees], ["Contactées", ent.contactees], ["Réponses", ent.reponses], ["Rendez-vous", ent.rendez_vous]];

  return (
    <div className="mx-auto max-w-7xl">
      <RafraichirEnDirect />
      <PageHeader title={<>Mon agent de <span className="text-warm">prospection</span></>}
        subtitle="Il cherche, vérifie, écrit et relance. Toi, tu valides d'un clic."
        action={<span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${c.simulation ? "bg-sky-500/15 text-sky-700 dark:text-sky-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>
          {c.simulation ? "🧪 Mode simulation — rien ne part" : "🟢 Mode réel — les messages validés partent"}
        </span>} />

      {/* 1. Bandeau d'état, à la première personne */}
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${etat.cls}`}>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-3xl">🤖
            <span className={`absolute -right-1 -bottom-1 size-5 rounded-full border-2 border-bg ${etat.pastille}`} />
          </span>
          <div className="min-w-0">
            <div className="text-lg leading-snug font-bold">{etat.titre}</div>
            <div className="text-sm text-muted">
              Prochain passage à {tab.prochain_passage ?? "—"} · zone : {c.zones_actives.map((z) => ZONES[z]).join(", ")} · {tab.prets_pour_demain} message{tab.prets_pour_demain > 1 ? "s" : ""} prêt{tab.prets_pour_demain > 1 ? "s" : ""} pour demain · quota n8n : {santeQuota}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2"><BoutonPause pause={c.pause} /><BoutonTester /><BoutonMode simulation={c.simulation} /></div>
      </div>

      {/* 4. Compteurs du jour et du mois */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Vérifiées" value={tab.jour.verifiees} hint={`${tab.mois.verifiees} ce mois`} />
        <Stat label="Nouvelles trouvées" value={tab.jour.nouvelles} hint={`${tab.mois.nouvelles} ce mois`} />
        <Stat label={c.simulation ? "Envois simulés" : "Messages envoyés"} value={tab.jour.envoyes} hint={`${tab.mois.envoyes} ce mois`} />
        <Stat label="Réponses" value={tab.jour.reponses} hint={`${tab.mois.reponses} ce mois`} />
        <Stat label="Intéressés" value={tab.jour.chauds} hint={`${tab.mois.chauds} ce mois`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Ce que je fais en ce moment */}
          <EnCeMoment initial={evts} fiches={(fiches ?? []) as { id: string; nom: string; metier: string | null; ville: string | null }[]} />

          {/* 3. Messages prêts */}
          <FileValidation messages={(msgs ?? []) as AgentMessage[]} />

          {/* 7. Listes d'action */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card overflow-hidden">
              <div className="border-b border-border px-4 py-2 text-sm font-semibold">🔥 Prospects chauds à rappeler</div>
              <ul className="max-h-72 divide-y divide-border overflow-y-auto text-sm">
                {(chauds ?? []).length === 0 && <li className="px-4 py-6 text-center text-xs text-muted">Personne pour l&apos;instant.</li>}
                {(chauds ?? []).map((p) => (
                  <li key={p.id} className="px-4 py-2">
                    {p.prospect_id ? <Link className="font-medium hover:underline" href={`/prospects/${p.prospect_id}`}>{p.nom}</Link> : <span className="font-medium">{p.nom}</span>}
                    <div className="text-xs text-muted">{[p.metier, p.ville].filter(Boolean).join(" · ")}</div>
                    {p.telephone && <a className="text-xs text-cyan" href={`tel:${p.telephone}`}>📞 Appeler</a>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card overflow-hidden">
              <div className="border-b border-border px-4 py-2 text-sm font-semibold">📞 À appeler <span className="font-normal text-muted">(ni e-mail ni mobile)</span></div>
              <ul className="max-h-72 divide-y divide-border overflow-y-auto text-sm">
                {aAppeler.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted">Rien à appeler.</li>}
                {aAppeler.map((a) => (
                  <li key={a.id} className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{a.agent_entreprises?.nom}</span><BoutonFait id={a.id} /></div>
                    <div className="text-xs text-muted">{[a.agent_entreprises?.metier, a.agent_entreprises?.ville].filter(Boolean).join(" · ")}</div>
                    {a.agent_entreprises?.telephone && <a className="text-xs text-cyan" href={`tel:${a.agent_entreprises.telephone}`}>📞 Appeler</a>}
                    <details className="mt-1 text-xs"><summary className="cursor-pointer text-muted">Quoi dire</summary><p className="mt-1">{a.texte_propose}</p></details>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card overflow-hidden">
              <div className="border-b border-border px-4 py-2 text-sm font-semibold">💼 À contacter sur LinkedIn <span className="font-normal text-muted">(par toi)</span></div>
              <ul className="max-h-72 divide-y divide-border overflow-y-auto text-sm">
                {linkedin.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted">Aucun profil repéré.</li>}
                {linkedin.map((a) => (
                  <li key={a.id} className="px-4 py-2">
                    <div className="flex items-center justify-between gap-2"><span className="font-medium">{a.agent_entreprises?.nom}</span><BoutonFait id={a.id} /></div>
                    {a.agent_entreprises?.linkedin_url && <a className="text-xs text-cyan" href={a.agent_entreprises.linkedin_url} target="_blank" rel="noreferrer">Ouvrir le profil</a>}
                    <div className="mt-1 flex items-center gap-2 text-xs"><span className="line-clamp-2 text-muted">{a.texte_propose}</span><CopyButton text={a.texte_propose} label="Copier" /></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* 2. Fil en direct */}
          <FilDirect initial={evts} titre="📜 Le fil de ma journée" />

          {/* 5. Jauge du quota n8n */}
          <div className="card p-4">
            <div className="flex items-baseline justify-between text-sm"><span className="font-semibold">⛽ Mon carburant (quota n8n)</span><span className="tabular-nums">{b?.executions_mois ?? "—"} / {c.quota_mensuel}</span></div>
            <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-soft-2">
              <div className={`h-full rounded-full ${pct >= 95 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
              <div className="absolute top-0 h-full w-px bg-text/60" style={{ left: "80%" }} title="Cible : 80 %" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted">
              <span>Budget du jour : <b className="text-text">{b?.budget_jour ?? "—"}</b></span>
              <span>Messages demain : <b className="text-text">{b?.messages_demain ?? "—"}</b></span>
              <span>Épuisement prévu : <b className="text-text">{b?.epuisement_prevu ? new Date(b.epuisement_prevu).toLocaleDateString("fr-FR") : "—"}</b></span>
              <span>Compteur : {b?.source_compteur === "api_n8n" ? "n8n (réel)" : "estimé"}</span>
            </div>
          </div>

          {/* 6. Entonnoir */}
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold">🏁 Entonnoir du mois</div>
            {etapes.map(([l, n], i) => (
              <div key={l} className="mb-1.5">
                <div className="flex justify-between text-xs"><span>{l}</span><span className="tabular-nums">{n}</span></div>
                <div className="h-2 rounded-full bg-soft-2"><div className="h-full rounded-full bg-chart-bar" style={{ width: `${Math.max(2, (100 * n) / Math.max(1, etapes[0][1]))}%`, opacity: 1 - i * 0.12 }} /></div>
              </div>
            ))}
            <div className="mt-2 text-xs text-muted">
              Sans site : <b className="text-text">{tab.indicateurs.part_sans_site ?? "—"} %</b> des fiches vérifiées · désinscriptions : <b className="text-text">{tab.indicateurs.taux_desinscription ?? 0} %</b>
            </div>
            {tab.mois.besoins && Object.keys(tab.mois.besoins).length > 0 && (
              <div className="mt-2 text-xs text-muted">Besoins ce mois : {Object.entries(tab.mois.besoins).map(([k, v]) => `${OFFRES[k] ?? k} ${v}`).join(" · ")}</div>
            )}
          </div>
        </div>
      </div>

      {/* 8. Réglages */}
      <details className="card mt-4 p-4">
        <summary className="cursor-pointer font-semibold">⚙️ Réglages de l&apos;agent</summary>
        <form action={enregistrerReglages} className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <fieldset>
            <legend className="mb-1 font-medium">Zones actives</legend>
            {[1, 2, 3].map((z) => (
              <label key={z} className="mr-4 inline-flex items-center gap-1"><input type="checkbox" name={`zone_${z}`} defaultChecked={c.zones_actives.includes(z)} /> {ZONES[z]}</label>
            ))}
            <p className="text-xs text-muted">L&apos;agent passe tout seul à la zone suivante quand la zone en cours est épuisée.</p>
          </fieldset>
          <fieldset>
            <legend className="mb-1 font-medium">Jours d&apos;envoi</legend>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((j, i) => (
              <label key={j} className="mr-3 inline-flex items-center gap-1"><input type="checkbox" name={`jour_${i + 1}`} defaultChecked={c.horaires.jours.includes(i + 1)} /> {j}</label>
            ))}
            <p className="text-xs text-muted">Jamais les jours fériés.</p>
          </fieldset>
          <label className="flex flex-col gap-1">Horaires (matin / après-midi)
            <span className="flex gap-2">
              <input className="input w-24" name="m1" defaultValue={c.horaires.plages[0]?.[0]} /> <input className="input w-24" name="m2" defaultValue={c.horaires.plages[0]?.[1]} />
              <input className="input w-24" name="a1" defaultValue={c.horaires.plages[1]?.[0]} /> <input className="input w-24" name="a2" defaultValue={c.horaires.plages[1]?.[1]} />
            </span>
          </label>
          <label className="flex flex-col gap-1">Seuil de score (0 à 100)
            <input className="input w-28" type="number" min={0} max={100} name="seuil_score" defaultValue={c.seuil_score} />
          </label>
          <label className="flex flex-col gap-1">Adresse d&apos;envoi (domaine secondaire, jamais @solvelab.fr)
            <input className="input" name="email_expediteur" defaultValue={c.email_expediteur ?? ""} placeholder="rudy@solvelab-studio.fr" />
          </label>
          <label className="flex flex-col gap-1">Adresse qui reçoit les alertes et le rapport
            <input className="input" name="alert_email" defaultValue={c.alert_email ?? ""} placeholder="ton adresse personnelle" />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">Mention STOP des SMS
            <select className="input max-w-xl" name="sms_stop" defaultValue={c.sms_stop ?? "lien"}>
              <option value="lien">Mon lien de désinscription (2 SMS facturés par message)</option>
              <option value="brevo">« STOP au 36… » ajouté par Brevo (1 seul SMS facturé)</option>
            </select>
            <span className="text-xs text-muted">Choisis Brevo seulement après avoir vu « STOP au 36… » à la fin de ton SMS de test. Les STOP reçus par Brevo sont ajoutés chaque matin à la liste repoussoir.</span>
          </label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" name="envoi_auto" defaultChecked={c.envoi_auto} />
            Envoi automatique (sans ta validation) — désactivé par défaut</label>
          <div className="md:col-span-2"><button className="btn-primary">Enregistrer les réglages</button></div>
        </form>

        <form action={async (fd) => { "use server"; await demandeRgpd(fd); }} className="mt-6 border-t border-border pt-4 text-sm">
          <div className="mb-2 font-medium">Demande RGPD (accès ou suppression, à traiter sous un mois)</div>
          <div className="flex flex-wrap gap-2">
            <input className="input max-w-xs" name="valeur" placeholder="e-mail ou téléphone de la personne" />
            <select className="input w-auto" name="action"><option value="acces">Accès</option><option value="suppression">Suppression</option></select>
            <button className="btn-ghost">Traiter</button>
          </div>
          <p className="mt-1 text-xs text-muted">Une suppression efface la fiche et ajoute le contact à la liste repoussoir. Le résultat s&apos;affiche dans le fil.</p>
        </form>
      </details>
    </div>
  );
}
