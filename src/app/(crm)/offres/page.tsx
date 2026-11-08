import Link from "next/link";
import { Empty, PageHeader, Stat } from "@/components/ui";
import { OFFER_STATUS, PAYMENT_STATUS, serviceLabel } from "@/lib/constants";
import { date, euro } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Offer } from "@/lib/types";

export default async function OffersPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select("*, prospects(id, company_name)").order("created_at", { ascending: false });
  const offers = (data ?? []) as (Offer & { prospects: { id: string; company_name: string } | null })[];
  const sum = (st: string) => offers.filter((o) => o.status === st).reduce((s, o) => s + o.amount_cents, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Offres" subtitle="Crée une offre depuis la fiche d'un prospect." />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Acceptées" value={euro(sum("acceptee"))} />
        <Stat label="En attente" value={euro(sum("envoyee"))} />
        <Stat label="Brouillons" value={euro(sum("brouillon"))} />
      </div>
      <div className="card divide-y divide-border overflow-hidden">
        {offers.length === 0 ? <Empty>Aucune offre pour l&apos;instant.</Empty> : offers.map((o) => (
          <Link key={o.id} href={`/prospects/${o.prospect_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{o.title}</div>
              <div className="truncate text-xs text-muted">{o.prospects?.company_name} · {serviceLabel(o.service_type)} · {date(o.created_at)}{o.monthly_cents > 0 && ` · + ${euro(o.monthly_cents)}/mois`}</div>
            </div>
            <span className="text-right text-xs text-muted">{OFFER_STATUS[o.status]}{o.status === "acceptee" && <><br />{PAYMENT_STATUS[o.payment_status ?? "non_paye"]}</>}</span>
            <span className="w-24 text-right text-sm font-semibold tabular-nums">{euro(o.amount_cents)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
