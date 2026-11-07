import Link from "next/link";
import { RowMenu } from "@/components/RowMenu";
import { Empty, PageHeader, Stat } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Ev = {
  id: string; created_at: string; type: string; path: string | null; ref: string | null;
  prospect_id: string | null; prospect_name: string | null; visitor: string | null; referrer: string | null;
};

const LABEL: Record<string, { label: string; emoji: string }> = {
  visite: { label: "Visite du site", emoji: "👀" },
  clic_rdv: { label: "Clic « Réserver un appel »", emoji: "👆" },
  clic_lien: { label: "Clic sur ton lien (email)", emoji: "🔗" },
  formulaire: { label: "Demande via le formulaire", emoji: "📝" },
  rdv: { label: "RDV pris", emoji: "📅" },
  rdv_annule: { label: "RDV annulé", emoji: "❌" },
};

const TZ = "Europe/Paris";
const dayKey = (d: Date) => d.toLocaleDateString("fr-CA", { timeZone: TZ }); // AAAA-MM-JJ
const dayLabel = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });

export default async function SitePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const supabase = await createClient();
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: rows, error }, { data: recentRows }] = await Promise.all([
    supabase.from("site_events").select("type, created_at, visitor").gte("created_at", since30).limit(20000),
    (() => {
      // les lignes « retirées de la liste » restent comptées dans les chiffres, mais ne s'affichent plus ici
      let q = supabase.from("site_events").select("*").filter("metadata->>hidden", "is", null)
        .order("created_at", { ascending: false }).limit(100);
      if (type && LABEL[type]) q = q.eq("type", type);
      return q;
    })(),
  ]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Site" />
        <div className="card p-5 text-sm">
          <p className="font-medium">Le journal du site n&apos;est pas encore installé.</p>
          <p className="mt-2 text-muted">Dans Supabase → SQL Editor, colle le contenu du fichier <code>supabase/migrations/0002_site_events.sql</code> (dépôt GitHub crm-prospection) puis clique sur Run.</p>
        </div>
      </div>
    );
  }

  const events = (rows ?? []) as Pick<Ev, "type" | "created_at" | "visitor">[];
  const recent = (recentRows ?? []) as Ev[];
  const now = Date.now();
  const today = dayKey(new Date());
  const inLast = (e: { created_at: string }, days: number) => now - new Date(e.created_at).getTime() <= days * 864e5;
  const count = (t: string, days: number) => events.filter((e) => e.type === t && inLast(e, days)).length;
  const visitsToday = events.filter((e) => e.type === "visite" && dayKey(new Date(e.created_at)) === today);
  const visitorsToday = new Set(visitsToday.map((e) => e.visitor ?? e.created_at)).size;

  // 14 derniers jours
  const days: { key: string; visits: number; rdv: number }[] = [];
  for (let i = 13; i >= 0; i--) days.push({ key: dayKey(new Date(now - i * 864e5)), visits: 0, rdv: 0 });
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  for (const e of events) {
    const d = byKey[dayKey(new Date(e.created_at))];
    if (!d) continue;
    if (e.type === "visite") d.visits++;
    if (e.type === "clic_rdv") d.rdv++;
  }
  const max = Math.max(1, ...days.map((d) => d.visits));
  const clicks30 = count("clic_rdv", 30), booked30 = count("rdv", 30);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Site" subtitle="Qui est venu sur solvelab.fr et ce qu'ils ont fait. Ce journal reste même si tu supprimes une fiche." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Visites aujourd'hui" value={visitsToday.length} hint={`${visitorsToday} visiteur${visitorsToday > 1 ? "s" : ""} différent${visitorsToday > 1 ? "s" : ""}`} />
        <Stat label="Visites (7 j)" value={count("visite", 7)} hint={`${count("visite", 30)} sur 30 jours`} />
        <Stat label="Clics « Réserver un appel » (30 j)" value={clicks30} hint={`${count("clic_rdv", 7)} sur 7 jours`} />
        <Stat label="RDV pris (30 j)" value={booked30} hint={clicks30 ? `${Math.round((booked30 / clicks30) * 100)} % des clics · ${count("rdv_annule", 30)} annulé(s)` : `${count("rdv_annule", 30)} annulé(s)`} />
        <Stat label="Demandes formulaire (30 j)" value={count("formulaire", 30)} />
        <Stat label="Venus depuis ton email (30 j)" value={count("clic_lien", 30)} hint="clics sur le lien personnalisé" />
      </div>

      {/* Visites par jour : une seule série → pas de légende, le titre la nomme */}
      <section className="card mt-6 p-4">
        <h2 className="text-sm font-semibold">Visites par jour (14 derniers jours)</h2>
        <div className="mt-4 flex h-40 items-end gap-0.5" role="img" aria-label="Graphique des visites par jour sur 14 jours (détail dans le tableau ci-dessous)">
          {days.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="mx-auto w-full max-w-7 rounded-t bg-chart-bar"
                style={{ height: d.visits ? `${Math.max(3, (d.visits / max) * 100)}%` : "0" }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap shadow group-hover:block">
                <b>{dayLabel(d.key)}</b> · {d.visits} visite{d.visits > 1 ? "s" : ""} · {d.rdv} clic{d.rdv > 1 ? "s" : ""} RDV
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-0.5 border-t border-border pt-1">
          {days.map((d, i) => (
            <div key={d.key} className="flex-1 text-center text-[10px] text-muted tabular-nums">{i % 2 === days.length % 2 ? "" : dayLabel(d.key)}</div>
          ))}
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">Voir le tableau</summary>
          <table className="mt-2 w-full text-left">
            <thead className="text-xs text-muted"><tr><th className="py-1 font-medium">Jour</th><th className="py-1 font-medium">Visites</th><th className="py-1 font-medium">Clics « Réserver »</th></tr></thead>
            <tbody className="divide-y divide-border tabular-nums">
              {[...days].reverse().map((d) => <tr key={d.key}><td className="py-1">{dayLabel(d.key)}</td><td>{d.visits}</td><td>{d.rdv}</td></tr>)}
            </tbody>
          </table>
        </details>
      </section>

      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Derniers passages</h2>
          <div className="flex flex-wrap gap-1 text-xs">
            <Link href="/site" className={`rounded-full border border-border px-2 py-1 ${!type ? "bg-bg font-semibold" : "text-muted"}`}>Tout</Link>
            {Object.entries(LABEL).map(([k, v]) => (
              <Link key={k} href={`/site?type=${k}`} className={`rounded-full border border-border px-2 py-1 ${type === k ? "bg-bg font-semibold" : "text-muted"}`}>{v.emoji} {v.label}</Link>
            ))}
          </div>
        </div>
        {recent.length === 0 ? <Empty>Aucun passage enregistré pour l&apos;instant.</Empty> : (
          <ul className="divide-y divide-border">
            {recent.map((e) => {
              const who = e.prospect_name ?? "Visiteur anonyme";
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <span aria-hidden="true">{LABEL[e.type]?.emoji ?? "•"}</span>
                  <div className="min-w-0 flex-1">
                    <div>
                      {e.prospect_id ? <Link href={`/prospects/${e.prospect_id}`} className="font-medium underline-offset-2 hover:underline">{who}</Link>
                        : <span className={e.prospect_name ? "font-medium" : "text-muted"}>{who}{e.prospect_name && !e.prospect_id ? " (fiche supprimée)" : ""}</span>}
                      <span className="text-muted"> · {LABEL[e.type]?.label ?? e.type}</span>
                    </div>
                    <div className="truncate text-xs text-muted">
                      {[e.path && `page ${e.path}`, e.referrer && `venu de ${e.referrer}`].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{dateTime(e.created_at)}</span>
                  <div className="-my-1"><RowMenu id={e.id} kind="site" /></div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
