import { cancelAgentTask, saveAgentSettings, setAgentPaused } from "@/app/actions-workspace";
import { Empty, PageHeader, ProspectLine, SetupNotice, Stat } from "@/components/ui";
import { AgentTaskForm } from "@/components/workspace";
import { TASK_STATUS, TASK_TYPES } from "@/lib/constants";
import { dateTime, timeAgo } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { AgentTask, Prospect } from "@/lib/types";

export const dynamic = "force-dynamic";

const INBOUND_SOURCES = ["manuel", "formulaire_site", "rdv_site", "entrant", "codeur", "fiverr", "malt", "comeup", "site"];

function describe(t: AgentTask) {
  const p = t.params as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.join(", ") : "");
  if (t.type === "recherche") return `${list(p.sectors)} · ${list(p.cities)} · ${p.max ?? "?"} max${p.criteria ? ` · ${p.criteria}` : ""}`;
  if (t.type === "envoi") return `${p.count} emails${p.sector ? ` · ${p.sector}` : ""}${p.city ? ` · ${p.city}` : ""}${p.min_score ? ` · score ≥ ${p.min_score}` : ""}`;
  if (t.type === "relances") return `${p.count} relances max`;
  return String(p.instruction ?? "");
}

export default async function AgentPage() {
  const supabase = await createClient();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [{ data: tasks, error }, settings, { data: found }, { count: sentToday }, { count: toContact }, { count: dueFollowups }] = await Promise.all([
    supabase.from("agent_tasks").select("*").order("created_at", { ascending: false }).limit(30),
    getSettings(supabase),
    supabase.from("prospects").select("*").not("source", "in", `(${INBOUND_SOURCES.join(",")})`).order("created_at", { ascending: false }).limit(10),
    supabase.from("activities").select("id", { count: "exact", head: true }).in("type", ["email_sortant", "relance"]).eq("created_by", "n8n").gte("created_at", today.toISOString()),
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("status", "nouveau").eq("opted_out", false).not("email", "is", null),
    supabase.from("prospects").select("id", { count: "exact", head: true }).eq("opted_out", false).lte("next_followup_at", new Date().toISOString()),
  ]);
  if (error) return <SetupNotice title="Agent" />;
  const list = (tasks ?? []) as AgentTask[];
  const prospects = (found ?? []) as Prospect[];
  const foundToday = prospects.filter((p) => new Date(p.created_at) >= today).length;
  const webhook = !!process.env.N8N_AGENT_WEBHOOK_URL;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={<>Mon <span className="text-warm">agent</span></>}
        subtitle="Tu lui donnes un ordre ici, il travaille dans n8n, et tout revient dans le CRM."
        action={
          <form action={setAgentPaused.bind(null, !settings.agent_paused)}>
            <button className={settings.agent_paused ? "btn-primary" : "btn-ghost"}>{settings.agent_paused ? "▶️ Relancer l'agent" : "⏸️ Mettre en pause"}</button>
          </form>
        } />

      <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${settings.agent_paused ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
        {settings.agent_paused ? "⏸️ L'agent est en pause : il ne cherche plus et n'envoie plus rien." : "🟢 L'agent est actif : recherche chaque matin, emails du lundi au vendredi entre 9 h et 18 h."}
        {!webhook && <span className="block text-xs opacity-80">Webhook de l&apos;agent pas encore branché : tes ordres attendent qu&apos;il passe les chercher (voir n8n/README.md).</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Trouvés aujourd'hui" value={foundToday} hint="nouvelles entreprises" />
        <Stat label="Emails envoyés aujourd'hui" value={sentToday ?? 0} hint={`limite ${settings.daily_email_limit} / jour`} />
        <Stat label="À contacter" value={toContact ?? 0} hint="fiches « Nouveau » avec un email" />
        <Stat label="Relances prévues" value={dueFollowups ?? 0} hint="à envoyer maintenant" />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold">Donner un ordre</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h3 className="mb-3 font-semibold">🔎 Chercher des entreprises</h3>
          <AgentTaskForm type="recherche" button="Lancer la recherche">
            <label className="block"><span className="label">Métiers (séparés par des virgules)</span>
              <input name="sectors" required defaultValue={settings.target_sectors.join(", ")} placeholder="plombier, électricien, restaurant" className="input" /></label>
            <label className="block"><span className="label">Villes</span>
              <input name="cities" required defaultValue={settings.target_cities.join(", ")} placeholder="Caen, Hérouville-Saint-Clair, Ifs" className="input" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="label">Nombre max</span>
                <input name="max" type="number" min={1} max={200} defaultValue={30} className="input" /></label>
              <label className="block"><span className="label">Critère (facultatif)</span>
                <input name="criteria" placeholder="sans site, site vieux…" className="input" /></label>
            </div>
          </AgentTaskForm>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 font-semibold">✉️ Envoyer les premiers emails</h3>
          <AgentTaskForm type="envoi" button="Lancer les emails">
            <p className="text-xs text-muted">L&apos;agent prend les fiches « Nouveau » qui ont un email, écrit un message personnalisé avec leur lien, et les envoie étalés dans la journée (lun-ven, 9 h-18 h).</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className="label">Combien</span>
                <input name="count" type="number" min={1} max={100} defaultValue={Math.min(20, settings.daily_email_limit || 20)} className="input" /></label>
              <label className="block"><span className="label">Score minimum</span>
                <input name="min_score" type="number" min={0} max={100} defaultValue={50} className="input" /></label>
              <label className="block"><span className="label">Métier (facultatif)</span>
                <input name="sector" placeholder="tous" className="input" /></label>
              <label className="block"><span className="label">Ville (facultatif)</span>
                <input name="city" placeholder="toutes" className="input" /></label>
            </div>
          </AgentTaskForm>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 font-semibold">🔁 Envoyer les relances</h3>
          <AgentTaskForm type="relances" button="Lancer les relances">
            <p className="text-xs text-muted">Une ou deux relances douces maximum, puis l&apos;agent arrête. Jamais à ceux qui ont répondu ou dit STOP.</p>
            <label className="block"><span className="label">Combien au maximum</span>
              <input name="count" type="number" min={1} max={100} defaultValue={20} className="input" /></label>
          </AgentTaskForm>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 font-semibold">💬 Consigne libre</h3>
          <AgentTaskForm type="consigne" button="Envoyer la consigne">
            <textarea name="instruction" rows={4} required placeholder="Ex : trouve-moi les garages de Bayeux qui n'ont pas de site, et prépare-moi une liste." className="input" />
          </AgentTaskForm>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">📋 Ordres donnés</h2>
          <ul className="divide-y divide-border">
            {list.length === 0 ? <Empty>Aucun ordre pour l&apos;instant.</Empty> : list.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{TASK_TYPES[t.type].emoji} {TASK_TYPES[t.type].label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS[t.status].color}`}>{TASK_STATUS[t.status].label}</span>
                  <span className="ml-auto text-xs text-muted" title={dateTime(t.created_at)}>{timeAgo(t.created_at)}</span>
                </div>
                <div className="mt-1 truncate text-xs text-muted">{describe(t)}</div>
                {t.summary && <p className="mt-2 rounded-lg bg-soft p-2 text-sm whitespace-pre-line">{t.summary}</p>}
                {t.error && t.status !== "termine" && <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{t.error}</p>}
                {["en_attente", "envoye"].includes(t.status) && (
                  <form action={cancelAgentTask.bind(null, t.id)} className="mt-1"><button className="text-xs text-muted underline hover:text-text">Annuler</button></form>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="card overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">🆕 Derniers prospects trouvés par l&apos;agent</h2>
          <div className="divide-y divide-border">
            {prospects.length ? prospects.map((p) => <ProspectLine key={p.id} p={p} />) : <Empty>L&apos;agent n&apos;a encore rien trouvé.</Empty>}
          </div>
        </section>
      </div>

      <details className="card mt-6 p-4">
        <summary className="cursor-pointer text-sm font-semibold">⚙️ Réglages de l&apos;agent</summary>
        <form action={saveAgentSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">Métiers ciblés chaque matin (séparés par des virgules)</span>
            <textarea name="target_sectors" rows={2} defaultValue={settings.target_sectors.join(", ")} placeholder="plombier, électricien, menuisier, restaurant, coiffeur" className="input" /></label>
          <label className="block sm:col-span-2"><span className="label">Villes ciblées</span>
            <textarea name="target_cities" rows={2} defaultValue={settings.target_cities.join(", ")} placeholder="Caen, Hérouville-Saint-Clair, Mondeville, Ifs" className="input" /></label>
          <label className="block"><span className="label">Premiers emails par jour (max)</span>
            <input name="daily_email_limit" type="number" min={0} max={300} defaultValue={settings.daily_email_limit} className="input" /></label>
          <label className="block"><span className="label">Prénom pour signer les emails de l&apos;agent</span>
            <input name="sender_first_name" defaultValue={settings.sender_first_name} className="input" /></label>
          <label className="block sm:col-span-2"><span className="label">Signature des emails que tu écris dans le CRM</span>
            <textarea name="signature" rows={3} defaultValue={settings.signature} className="input" /></label>
          <div className="sm:col-span-2"><button className="btn-primary">Enregistrer</button></div>
        </form>
      </details>
    </div>
  );
}
