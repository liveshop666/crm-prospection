import { Empty, PageHeader, SetupNotice, Stat } from "@/components/ui";
import { euro } from "@/lib/format";
import { getRevenue, monthLabel } from "@/lib/sales";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Breakdown({ title, rows, total }: { title: string; rows: { label: string; cents: number; count: number }[]; total: number }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">Rien pour l&apos;instant.</p> : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{r.label} <span className="text-xs text-muted">· {r.count}</span></span>
                <span className="font-semibold tabular-nums">{euro(r.cents)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-soft-2">
                <div className="h-full rounded-full bg-chart-bar" style={{ width: `${total ? Math.max(2, (r.cents / total) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function RevenuePage() {
  const supabase = await createClient();
  const r = await getRevenue(supabase);
  if (r.tableMissing) return <SetupNotice title="Chiffre d'affaires" />;
  const max = Math.max(1, ...r.months.map((m) => m.totalCents));
  const nothing = r.signedCount === 0 && r.mrrCents === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={<>Chiffre <span className="text-warm">d&apos;affaires</span></>} subtitle="Ce que tu as signé, encaissé, et ce que tes suivis mensuels te rapportent." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Signé en ${monthLabel(r.thisMonth.key, true)}`} value={euro(r.thisMonth.signedCents + r.thisMonth.recurringCents)}
          hint={`${euro(r.thisMonth.signedCents)} prestations + ${euro(r.thisMonth.recurringCents)} suivis`} />
        <Stat label="Suivis mensuels" value={`${euro(r.mrrCents)}`} hint={`${r.activeSubscriptions} client${r.activeSubscriptions > 1 ? "s" : ""} · ${euro(r.mrrCents * 12)} / an`} />
        <Stat label="Reste à encaisser" value={euro(r.toCollectCents)} hint={`${euro(r.paidTotalCents)} déjà encaissé`} />
        <Stat label="Offres en attente" value={euro(r.pendingOffersCents)} hint="envoyées, pas encore signées" />
      </div>

      <section className="card mt-6 p-4">
        <h2 className="text-sm font-semibold">Chiffre d&apos;affaires par mois (12 derniers mois)</h2>
        <p className="text-xs text-muted">Prestations signées + suivis mensuels · total sur 12 mois : <b className="text-text">{euro(r.yearTotalCents)}</b></p>
        <div className="mt-4 flex h-44 items-end gap-1" role="img" aria-label="Graphique du chiffre d'affaires par mois (détail dans le tableau ci-dessous)">
          {r.months.map((m) => (
            <div key={m.key} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="mx-auto w-full max-w-9 rounded-t bg-chart-bar" style={{ height: m.totalCents ? `${Math.max(3, (m.totalCents / max) * 100)}%` : "0" }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap shadow group-hover:block">
                <b>{monthLabel(m.key, true)}</b> · {euro(m.totalCents)}<br />
                <span className="text-muted">{euro(m.signedCents)} prestations · {euro(m.recurringCents)} suivis</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1 border-t border-border pt-1">
          {r.months.map((m) => <div key={m.key} className="flex-1 text-center text-[10px] text-muted">{monthLabel(m.key)}</div>)}
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">Voir le tableau</summary>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-left">
              <thead className="text-xs text-muted"><tr><th className="py-1 font-medium">Mois</th><th className="py-1 font-medium">Prestations</th><th className="py-1 font-medium">Suivis</th><th className="py-1 font-medium">Total</th><th className="py-1 font-medium">Encaissé</th></tr></thead>
              <tbody className="divide-y divide-border tabular-nums">
                {[...r.months].reverse().map((m) => (
                  <tr key={m.key}><td className="py-1">{monthLabel(m.key, true)}</td><td>{euro(m.signedCents)}</td><td>{euro(m.recurringCents)}</td><td className="font-semibold">{euro(m.totalCents)}</td><td>{euro(m.paidCents)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {nothing ? (
        <div className="card mt-6"><Empty>Pas encore de vente. Crée une offre dans la fiche d&apos;un prospect : dès qu&apos;elle est acceptée, elle compte ici.</Empty></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Breakdown title="Par type de prestation" rows={r.byService} total={r.signedTotalCents} />
          <Breakdown title="D'où viennent tes clients" rows={r.byOrigin} total={r.signedTotalCents} />
        </div>
      )}
    </div>
  );
}
