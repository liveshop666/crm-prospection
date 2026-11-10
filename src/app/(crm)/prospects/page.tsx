import Link from "next/link";
import { deleteProspectsByIds } from "@/app/actions-workspace";
import { ConfirmButton } from "@/components/client";
import { RowMenu } from "@/components/RowMenu";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";
import { STATUSES } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Prospect } from "@/lib/types";

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("prospects").select("*").order("updated_at", { ascending: false }).limit(300);
  if (status) query = query.eq("status", status);
  if (q) {
    const s = q.replace(/[%,()]/g, " ");
    query = query.or(`company_name.ilike.%${s}%,contact_name.ilike.%${s}%,city.ilike.%${s}%,sector.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
  }
  const { data } = await query;
  const prospects = (data ?? []) as Prospect[];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Prospects" subtitle={`${prospects.length} affichés`} action={<Link href="/prospects/nouveau" className="btn-primary">+ Prospect</Link>} />

      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Rechercher : nom, ville, métier, téléphone…" className="input min-w-0 flex-1" />
        <select name="status" defaultValue={status ?? ""} className="input w-auto">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
        </select>
        <button className="btn-ghost">Filtrer</button>
      </form>

      {prospects.length > 0 && (
        <div className="mb-2 flex justify-end">
          <form action={deleteProspectsByIds.bind(null, prospects.map((p) => p.id))}>
            <ConfirmButton message={`Supprimer les ${prospects.length} fiches affichées, avec leur historique et leurs offres ? Les chiffres des visites du site restent.`}>🗑️ Tout supprimer ({prospects.length})</ConfirmButton>
          </form>
        </div>
      )}
      <div className="card overflow-hidden">
        {prospects.length === 0 ? <Empty>Aucun prospect trouvé.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Entreprise</th>
                  <th className="hidden px-4 py-2 font-medium sm:table-cell">Métier / ville</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">Contact</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="hidden px-4 py-2 font-medium lg:table-cell">Score</th>
                  <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">Mis à jour</th>
                  <th className="w-10 px-2 py-2" aria-label="Options" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-soft">
                    <td className="px-4 py-2.5">
                      <Link href={`/prospects/${p.id}`} className="flex items-center gap-2 font-medium">
                        {p.is_unread && <span className="size-2 rounded-full bg-accent" />}
                        {p.company_name}
                        {p.opted_out && <span title="STOP">⛔</span>}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-2.5 text-muted sm:table-cell">{[p.sector, p.city].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="hidden px-4 py-2.5 text-muted md:table-cell">{p.phone ?? p.email ?? "—"}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="hidden px-4 py-2.5 tabular-nums lg:table-cell">{p.score ?? "—"}</td>
                    <td className="hidden px-4 py-2.5 text-right text-muted lg:table-cell">{timeAgo(p.updated_at)}</td>
                    <td className="px-2 py-1.5"><RowMenu id={p.id} kind="prospect" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
