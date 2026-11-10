import Link from "next/link";
import { deleteSubscription, setSubscriptionStatus } from "@/app/actions-workspace";
import { ConfirmButton } from "@/components/client";
import { Empty, PageHeader, Pill, SetupNotice, Stat } from "@/components/ui";
import { serviceLabel, sourceLabel } from "@/lib/constants";
import { date, euro } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Offer, Prospect, Subscription } from "@/lib/types";

export const dynamic = "force-dynamic";

type Client = { prospect: Prospect; offers: Offer[]; subs: Subscription[] };

export default async function ClientsPage() {
  const supabase = await createClient();
  const [{ data: offs }, { data: subs, error }, { data: valid }] = await Promise.all([
    supabase.from("offers").select("*").eq("status", "acceptee").limit(5000),
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(5000),
    supabase.from("prospects").select("id").eq("status", "valide").limit(5000),
  ]);
  if (error) return <SetupNotice title="Clients & suivis" />;
  const offers = (offs ?? []) as Offer[];
  const subscriptions = (subs ?? []) as Subscription[];

  const ids = [...new Set([...offers.map((o) => o.prospect_id), ...subscriptions.map((s) => s.prospect_id), ...(valid ?? []).map((v) => v.id)])];
  const { data: ps } = ids.length ? await supabase.from("prospects").select("*").in("id", ids) : { data: [] };
  const clients: Client[] = ((ps ?? []) as Prospect[]).map((prospect) => ({
    prospect,
    offers: offers.filter((o) => o.prospect_id === prospect.id),
    subs: subscriptions.filter((s) => s.prospect_id === prospect.id),
  })).sort((a, b) => b.offers.reduce((s, o) => s + o.amount_cents, 0) - a.offers.reduce((s, o) => s + o.amount_cents, 0));

  const active = subscriptions.filter((s) => s.status === "actif");
  const toCollect = offers.reduce((s, o) => s + Math.max(0, o.amount_cents - o.paid_cents), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Clients & suivis" subtitle="Ceux qui ont signé, ce que tu leur as vendu, et leurs suivis mensuels." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Clients" value={clients.length} />
        <Stat label="Suivis actifs" value={active.length} hint={`${euro(active.reduce((s, x) => s + x.monthly_cents, 0))} / mois`} />
        <Stat label="Total signé" value={euro(offers.reduce((s, o) => s + o.amount_cents, 0))} />
        <Stat label="Reste à encaisser" value={euro(toCollect)} />
      </div>

      <div className="space-y-3">
        {clients.length === 0 ? <div className="card"><Empty>Pas encore de client. Quand une offre est acceptée, le client apparaît ici.</Empty></div> : clients.map(({ prospect: p, offers: os, subs: ss }) => {
          const signed = os.reduce((s, o) => s + o.amount_cents, 0);
          const paid = os.reduce((s, o) => s + Math.min(o.paid_cents, o.amount_cents), 0);
          return (
            <section key={p.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/prospects/${p.id}`} className="font-semibold hover:underline">{p.company_name}</Link>
                  <div className="text-xs text-muted">{[p.contact_name, p.city, sourceLabel(p.source)].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold tabular-nums">{euro(signed)}</div>
                  <div className={`text-xs ${paid >= signed ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}`}>{paid >= signed && signed > 0 ? "tout est payé ✅" : `${euro(paid)} encaissé`}</div>
                </div>
              </div>
              {os.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {os.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-2">
                      <span className="text-muted">{serviceLabel(o.service_type)}</span>
                      <span className="min-w-0 flex-1 truncate">{o.title}</span>
                      <span className="tabular-nums">{euro(o.amount_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {ss.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-border pt-3">
                  {ss.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span>🔁 {s.title}</span>
                      <Pill className={s.status === "actif" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : undefined}>{s.status === "actif" ? "actif" : s.status === "pause" ? "en pause" : "terminé"}</Pill>
                      <span className="text-xs text-muted">depuis le {date(s.start_date)}{s.end_date ? ` · fin ${date(s.end_date)}` : ""}</span>
                      <span className="ml-auto font-semibold tabular-nums">{euro(s.monthly_cents)} / mois</span>
                      {s.status === "actif" && <form action={setSubscriptionStatus.bind(null, s.id, p.id, "pause")}><button className="text-xs text-muted underline">pause</button></form>}
                      {s.status === "pause" && <form action={setSubscriptionStatus.bind(null, s.id, p.id, "actif")}><button className="text-xs text-muted underline">réactiver</button></form>}
                      <form action={deleteSubscription.bind(null, s.id, p.id)}><ConfirmButton className="text-xs text-rose-600 underline dark:text-rose-400" message="Supprimer ce suivi ? Il sort du chiffre d'affaires.">supprimer</ConfirmButton></form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
