import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, createOffer, deleteOffer, deleteProspect, markOfferSent, setOptOut, updateProspect } from "@/app/actions";
import { ConfirmButton, CopyButton, MarkRead, StatusSelect } from "@/components/client";
import { ProspectFields } from "@/components/ProspectFields";
import { ACTIVITY_LABELS, OFFER_STATUS } from "@/lib/constants";
import { dateTime, euro, isMobileFR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Offer, Prospect } from "@/lib/types";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: p }, { data: acts }, { data: offs }] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", id).maybeSingle(),
    supabase.from("activities").select("*").eq("prospect_id", id).order("created_at", { ascending: false }).limit(200),
    supabase.from("offers").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
  ]);
  if (!p) notFound();
  const prospect = p as Prospect;
  const activities = (acts ?? []) as Activity[];
  const offers = (offs ?? []) as Offer[];
  const link = `${appUrl}/r/${prospect.ref_slug}`;
  const phoneDigits = prospect.phone?.replace(/^\+/, "");

  return (
    <div className="mx-auto max-w-6xl">
      <MarkRead id={prospect.id} unread={prospect.is_unread} />
      <Link href="/prospects" className="text-sm text-muted hover:text-text">← Prospects</Link>

      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{prospect.company_name} {prospect.opted_out && <span title="Ne plus contacter">⛔</span>}</h1>
          <p className="mt-1 text-sm text-muted">
            {[prospect.contact_name, prospect.sector, prospect.city].filter(Boolean).join(" · ") || "—"}
            {prospect.score != null && <> · score <b className="text-text">{prospect.score}</b></>}
          </p>
        </div>
        <StatusSelect key={prospect.status} id={prospect.id} status={prospect.status} />
      </div>

      {prospect.opted_out && (
        <div className="mb-4 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          ⛔ Ce prospect a demandé à ne plus être contacté. L&apos;agent ne lui enverra plus rien.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche : contact + offres */}
        <div className="space-y-6 lg:col-span-1">
          <section className="card space-y-3 p-4">
            <h2 className="text-sm font-semibold">Contact</h2>
            <div className="flex flex-wrap gap-2">
              {prospect.phone && <a href={`tel:${prospect.phone}`} className="btn-primary">📞 Appeler</a>}
              {prospect.phone && <a href={`sms:${prospect.phone}`} className="btn-ghost">💬 SMS</a>}
              {prospect.phone && isMobileFR(prospect.phone) && <a href={`https://wa.me/${phoneDigits}`} target="_blank" className="btn-ghost">WhatsApp</a>}
              {prospect.email && <a href={`mailto:${prospect.email}`} className="btn-ghost">✉️ Email</a>}
            </div>
            <dl className="space-y-1 text-sm">
              {prospect.phone && <div className="flex justify-between gap-2"><dt className="text-muted">Tél.</dt><dd>{prospect.phone}</dd></div>}
              {prospect.email && <div className="flex justify-between gap-2"><dt className="text-muted">Email</dt><dd className="truncate">{prospect.email}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-muted">Site actuel</dt><dd className="truncate">{prospect.website ? <a href={prospect.website} target="_blank" className="underline">{prospect.website.replace(/^https?:\/\//, "")}</a> : "aucun"}</dd></div>
              {prospect.interest && <div className="flex justify-between gap-2"><dt className="text-muted">Besoin</dt><dd>{prospect.interest}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-muted">Source</dt><dd>{prospect.source ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Visites du site</dt><dd>{prospect.link_clicks}</dd></div>
            </dl>
            <div>
              <span className="label">Lien personnalisé (à mettre dans le SMS)</span>
              <div className="flex gap-2"><input readOnly value={link} className="input text-xs" /><CopyButton text={link} /></div>
            </div>
          </section>

          {prospect.ai_summary && (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">🤖 Résumé de l&apos;IA</h2>
              <p className="text-sm whitespace-pre-line text-muted">{prospect.ai_summary}</p>
            </section>
          )}

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">📄 Offres</h2>
            <ul className="mb-4 space-y-3">
              {offers.map((o) => (
                <li key={o.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{o.title}</div>
                    <div className="text-sm font-semibold tabular-nums">{euro(o.amount_cents)}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted">{OFFER_STATUS[o.status]}{o.answered_at && ` · ${dateTime(o.answered_at)}`}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CopyButton text={`${appUrl}/offre/${o.public_token}`} label="Copier le lien" />
                    <a href={`/offre/${o.public_token}`} target="_blank" className="btn-ghost">Voir</a>
                    {o.status === "brouillon" && <form action={markOfferSent.bind(null, o.id)}><button className="btn-primary">Marquer envoyée</button></form>}
                    {o.status !== "acceptee" && <form action={deleteOffer.bind(null, o.id, prospect.id)}><ConfirmButton message="Supprimer cette offre ?">Suppr.</ConfirmButton></form>}
                  </div>
                </li>
              ))}
            </ul>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-accent">+ Nouvelle offre</summary>
              <form action={createOffer.bind(null, prospect.id)} className="mt-3 space-y-2">
                <input name="title" required placeholder="Site vitrine 5 pages" className="input" />
                <textarea name="description" rows={4} placeholder="Ce qui est inclus…" className="input" />
                <input name="amount" inputMode="decimal" placeholder="Montant € (ex : 1500)" className="input" />
                <button className="btn-primary w-full">Créer l&apos;offre</button>
              </form>
            </details>
          </section>
        </div>

        {/* Colonne droite : timeline */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-4">
            <form action={addNote.bind(null, prospect.id)} className="space-y-2">
              <textarea name="content" rows={2} required placeholder="Ajouter une note, un compte-rendu d'appel, un RDV…" className="input" />
              <div className="flex gap-2">
                <select name="type" className="input w-auto">
                  <option value="note">🗒️ Note</option>
                  <option value="rdv">📅 RDV</option>
                  <option value="sms_sortant">📤 SMS que j&apos;ai envoyé</option>
                  <option value="email_sortant">✉️ Email que j&apos;ai envoyé</option>
                </select>
                <button className="btn-primary ml-auto">Ajouter</button>
              </div>
            </form>
          </section>

          <section className="card p-4">
            <h2 className="mb-4 text-sm font-semibold">Historique</h2>
            {activities.length === 0 ? <p className="text-sm text-muted">Rien pour l&apos;instant.</p> : (
              <ol className="relative space-y-4 border-l border-border pl-5">
                {activities.map((a) => {
                  const inbound = ["sms_entrant", "email_entrant", "formulaire"].includes(a.type);
                  return (
                    <li key={a.id} className="relative">
                      <span className="absolute -left-[31px] grid size-6 place-items-center rounded-full border border-border bg-surface text-xs">{ACTIVITY_LABELS[a.type].emoji}</span>
                      <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="font-medium">{ACTIVITY_LABELS[a.type].label}</span>
                        <span className="text-xs text-muted">{dateTime(a.created_at)} · {a.created_by}</span>
                      </div>
                      {a.content && (
                        <div className={`mt-1 text-sm whitespace-pre-line ${inbound ? "rounded-lg bg-bg p-3" : "text-muted"}`}>{a.content}</div>
                      )}
                      {typeof a.metadata?.subject === "string" && <div className="mt-1 text-xs text-muted">Objet : {a.metadata.subject}</div>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <details className="card p-4">
            <summary className="cursor-pointer text-sm font-semibold">✏️ Modifier la fiche</summary>
            <form action={updateProspect.bind(null, prospect.id)} className="mt-4 space-y-4">
              <ProspectFields p={prospect} />
              <button className="btn-primary">Enregistrer</button>
            </form>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
              <form action={setOptOut.bind(null, prospect.id, !prospect.opted_out)}>
                <button className="btn-ghost">{prospect.opted_out ? "Autoriser à nouveau le contact" : "⛔ Ne plus contacter"}</button>
              </form>
              <form action={deleteProspect.bind(null, prospect.id)}>
                <ConfirmButton message="Supprimer définitivement ce prospect et tout son historique ?">Supprimer le prospect</ConfirmButton>
              </form>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
