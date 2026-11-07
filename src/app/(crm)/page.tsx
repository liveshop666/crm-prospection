import Link from "next/link";
import { RowMenu } from "@/components/RowMenu";
import { Empty, PageHeader, ProspectLine, Stat } from "@/components/ui";
import { ACTIVITY_LABELS } from "@/lib/constants";
import { euro, timeAgo } from "@/lib/format";
import { getStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Prospect } from "@/lib/types";

export default async function Dashboard() {
  const supabase = await createClient();
  const [stats, { data: unread }, { data: hot }, { data: feed }] = await Promise.all([
    getStats(supabase),
    supabase.from("prospects").select("*").eq("is_unread", true).order("updated_at", { ascending: false }).limit(10),
    supabase.from("prospects").select("*").in("status", ["chaud", "rdv"]).order("updated_at", { ascending: false }).limit(10),
    supabase.from("activities").select("*, prospects(id, company_name)")
      .not("type", "eq", "changement_statut").order("created_at", { ascending: false }).limit(15),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Bonjour 👋" subtitle="Tout ce que ton agent a fait, et ce que tes clients ont répondu."
        action={<Link href="/prospects/nouveau" className="btn-primary">+ Prospect</Link>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Messages envoyés aujourd'hui" value={stats.today.sent} hint={`${stats.week.sent} sur 7 jours`} />
        <Stat label="Réponses (7 j)" value={stats.week.replies} hint={`taux ${stats.week.reply_rate} %`} />
        <Stat label="Clients chauds" value={(stats.by_status.chaud ?? 0) + (stats.by_status.rdv ?? 0)} hint={`${stats.week.clicks} visites du site (7 j)`} />
        <Stat label="Signé" value={euro(stats.signed_total_cents)} hint={`${stats.signed_count} offres · ${euro(stats.pipeline_cents)} en attente`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">🔔 Nouveau à voir {unread?.length ? `(${stats.unread})` : ""}</h2>
          <div className="divide-y divide-border">
            {(unread as Prospect[] | null)?.length ? (unread as Prospect[]).map((p) => <ProspectLine key={p.id} p={p} />) : <Empty>Rien de nouveau. Tu es à jour ✨</Empty>}
          </div>
        </section>

        <section className="card overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">🔥 À rappeler / RDV</h2>
          <div className="divide-y divide-border">
            {(hot as Prospect[] | null)?.length ? (hot as Prospect[]).map((p) => <ProspectLine key={p.id} p={p} />) : <Empty>Pas encore de client chaud.</Empty>}
          </div>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">⚡ Activité récente</h2>
          <ul className="divide-y divide-border">
            {(feed as (Activity & { prospects: { id: string; company_name: string } | null })[] | null)?.length ? (
              (feed as (Activity & { prospects: { id: string; company_name: string } | null })[]).map((a) => (
                <li key={a.id} className="flex items-start gap-1 pr-2 last:rounded-b-xl hover:bg-bg">
                  <Link href={`/prospects/${a.prospect_id}`} className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3">
                    <span>{ACTIVITY_LABELS[a.type].emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm"><span className="font-medium">{a.prospects?.company_name}</span> <span className="text-muted">· {ACTIVITY_LABELS[a.type].label}</span></div>
                      {a.content && <div className="truncate text-xs text-muted">{a.content}</div>}
                    </div>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(a.created_at)}</span>
                  </Link>
                  <div className="pt-2.5"><RowMenu id={a.id} kind="activity" /></div>
                </li>
              ))
            ) : <Empty>Aucune activité pour l&apos;instant. Branche n8n pour que l&apos;agent commence.</Empty>}
          </ul>
        </section>
      </div>
    </div>
  );
}
