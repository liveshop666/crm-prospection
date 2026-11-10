import Link from "next/link";
import { notFound } from "next/navigation";
import { addNote, createOffer, deleteOffer, deleteProspect, markOfferSent, setOptOut, updateProspect } from "@/app/actions";
import { createSubscription, deleteSubscription, demanderAvisGoogle, markOfferAccepted, setOfferPayment, setSubscriptionStatus } from "@/app/actions-workspace";
import { AgentFiche } from "@/components/agent/AgentFiche";
import { ConfirmButton, CopyButton, MarkRead, StatusSelect } from "@/components/client";
import { RowMenu } from "@/components/RowMenu";
import { ProspectFields } from "@/components/ProspectFields";
import { SourceBadge } from "@/components/ui";
import { ACTIVITY_LABELS, OFFER_STATUS, PAYMENT_STATUS, SERVICES, serviceLabel, sourceLabel } from "@/lib/constants";
import { date, dateTime, euro, isMobileFR, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Message, Offer, Prospect, Subscription } from "@/lib/types";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

export default async function ProspectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ existe?: string }> }) {
  const { id } = await params;
  const { existe } = await searchParams;
  const supabase = await createClient();
  const [{ data: p }, { data: acts }, { data: offs }, { data: subs }, { data: msgs }] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", id).maybeSingle(),
    supabase.from("activities").select("*").eq("prospect_id", id).order("created_at", { ascending: false }).limit(200),
    supabase.from("offers").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
    supabase.from("messages").select("id, received_at, direction, source, category, subject, ai_summary, body, is_read, send_status").eq("prospect_id", id).neq("verdict", "spam").order("received_at", { ascending: false }).limit(8),
  ]);
  if (!p) notFound();
  const prospect = p as Prospect;
  const activities = (acts ?? []) as Activity[];
  const offers = (offs ?? []) as Offer[];
  const subscriptions = (subs ?? []) as Subscription[];
  const messages = (msgs ?? []) as Message[];
  const link = `${appUrl}/r/${prospect.ref_slug}`;
  const phoneDigits = prospect.phone?.replace(/^\+/, "");

  return (
    <div className="mx-auto max-w-6xl">
      <MarkRead id={prospect.id} unread={prospect.is_unread} />
      <Link href="/prospects" className="text-sm text-muted hover:text-text">← Prospects</Link>

      <div className="mt-2 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-head text-4xl leading-none font-extrabold tracking-wide uppercase">{prospect.company_name} {prospect.opted_out && <span title="Ne plus contacter">⛔</span>}</h1>
          <p className="mt-1 text-sm text-muted">
            {[prospect.contact_name, prospect.sector, prospect.city].filter(Boolean).join(" · ") || "—"}
            {prospect.score != null && <> · score <b className="text-text">{prospect.score}</b></>}
          </p>
        </div>
        <StatusSelect key={prospect.status} id={prospect.id} status={prospect.status} />
      </div>

      {existe && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Une fiche existait déjà avec ce téléphone, cet email ou ce SIRET : la voici (les champs vides ont été complétés).
        </div>
      )}

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
              {prospect.email && <Link href={`/messages/nouveau?prospect=${prospect.id}`} className="btn-ghost">✉️ Écrire</Link>}
            </div>
            <dl className="space-y-1 text-sm">
              {prospect.phone && <div className="flex justify-between gap-2"><dt className="text-muted">Tél.</dt><dd>{prospect.phone}</dd></div>}
              {prospect.email && <div className="flex justify-between gap-2"><dt className="text-muted">Email</dt><dd className="truncate">{prospect.email}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-muted">Site actuel</dt><dd className="truncate">{prospect.website ? <a href={prospect.website} target="_blank" className="underline">{prospect.website.replace(/^https?:\/\//, "")}</a> : "aucun"}</dd></div>
              {prospect.interest && <div className="flex justify-between gap-2"><dt className="text-muted">Besoin</dt><dd>{prospect.interest}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-muted">Source</dt><dd>{sourceLabel(prospect.source)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Visites du site</dt><dd>{prospect.link_clicks}</dd></div>
            </dl>
            <div>
              <span className="label">Lien personnalisé (à mettre dans l&apos;email)</span>
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
                  <div className="mt-1 text-xs text-muted">
                    {serviceLabel(o.service_type)} · {OFFER_STATUS[o.status]}{o.answered_at && ` · ${dateTime(o.answered_at)}`}
                    {o.monthly_cents > 0 && <> · + {euro(o.monthly_cents)} / mois</>}
                  </div>
                  {o.status === "acceptee" && (
                    <form action={setOfferPayment.bind(null, o.id)} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-soft p-2">
                      <span className="text-xs text-muted">💶 {PAYMENT_STATUS[o.payment_status ?? "non_paye"]}{o.paid_cents > 0 && o.payment_status !== "paye" ? ` (${euro(o.paid_cents)})` : ""}</span>
                      <select name="payment_status" defaultValue={o.payment_status ?? "non_paye"} className="input w-auto py-1 text-xs">
                        <option value="non_paye">Pas encore payé</option>
                        <option value="acompte">Acompte reçu</option>
                        <option value="paye">Tout est payé</option>
                      </select>
                      <input name="paid" inputMode="decimal" placeholder="Acompte €" defaultValue={o.paid_cents ? String(o.paid_cents / 100) : ""} className="input w-24 py-1 text-xs" />
                      <button className="btn-ghost py-1 text-xs">OK</button>
                    </form>
                  )}
                  {o.status === "acceptee" && o.payment_status === "paye" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-500/10 p-2 text-xs">
                      {prospect.email ? (
                        <form action={demanderAvisGoogle.bind(null, o.id)}>
                          <ConfirmButton className="btn-primary py-1 text-xs"
                            message={`Projet terminé ? Un e-mail de remerciement avec ton lien d'avis Google part tout de suite à ${prospect.email}.`}>
                            {o.avis_demande_at ? "⭐ Redemander un avis Google" : "⭐ Demander un avis Google"}
                          </ConfirmButton>
                        </form>
                      ) : <span className="text-muted">⭐ Ajoute l&apos;e-mail du client pour lui demander un avis Google.</span>}
                      {o.avis_demande_at && <span className="text-muted">Demandé le {date(o.avis_demande_at)}</span>}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CopyButton text={`${appUrl}/offre/${o.public_token}`} label="Copier le lien" />
                    <a href={`/offre/${o.public_token}`} target="_blank" className="btn-ghost">Voir</a>
                    {o.status === "brouillon" && <form action={markOfferSent.bind(null, o.id)}><button className="btn-primary">Marquer envoyée</button></form>}
                    {["brouillon", "envoyee"].includes(o.status) && <form action={markOfferAccepted.bind(null, o.id)}><ConfirmButton className="btn-ghost" message="Le client a dit oui ? L'offre passe en « Acceptée » et compte dans ton chiffre d'affaires.">✅ Acceptée</ConfirmButton></form>}
                    {o.status !== "acceptee" && <form action={deleteOffer.bind(null, o.id, prospect.id)}><ConfirmButton message="Supprimer cette offre ?">Suppr.</ConfirmButton></form>}
                  </div>
                </li>
              ))}
            </ul>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-accent">+ Nouvelle offre</summary>
              <form action={createOffer.bind(null, prospect.id)} className="mt-3 space-y-2">
                <input name="title" required placeholder="Site vitrine 5 pages" className="input" />
                <select name="service_type" defaultValue="site_internet" className="input">
                  {SERVICES.map((sv) => <option key={sv.value} value={sv.value}>{sv.emoji} {sv.label}</option>)}
                </select>
                <textarea name="description" rows={4} placeholder="Ce qui est inclus…" className="input" />
                <input name="amount" inputMode="decimal" placeholder="Montant € (ex : 1500)" className="input" />
                <input name="monthly" inputMode="decimal" placeholder="Suivi mensuel € (facultatif, ex : 30)" className="input" />
                <p className="text-xs text-muted">Si tu mets un suivi mensuel, il démarre tout seul quand le client accepte.</p>
                <button className="btn-primary w-full">Créer l&apos;offre</button>
              </form>
            </details>
          </section>

          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">🔁 Suivis mensuels</h2>
            {subscriptions.length > 0 && (
              <ul className="mb-4 space-y-2">
                {subscriptions.map((sub) => (
                  <li key={sub.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{sub.title}</span>
                      <span className="font-semibold tabular-nums">{euro(sub.monthly_cents)}/mois</span>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {sub.status === "actif" ? "🟢 actif" : sub.status === "pause" ? "⏸️ en pause" : "⏹️ terminé"} · depuis le {date(sub.start_date)}{sub.end_date && ` · fin ${date(sub.end_date)}`}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sub.status !== "actif" && <form action={setSubscriptionStatus.bind(null, sub.id, prospect.id, "actif")}><button className="btn-ghost py-1 text-xs">Réactiver</button></form>}
                      {sub.status === "actif" && <form action={setSubscriptionStatus.bind(null, sub.id, prospect.id, "pause")}><button className="btn-ghost py-1 text-xs">Pause</button></form>}
                      {sub.status !== "termine" && <form action={setSubscriptionStatus.bind(null, sub.id, prospect.id, "termine")}><ConfirmButton className="btn-ghost py-1 text-xs" message="Arrêter ce suivi à partir d'aujourd'hui ?">Arrêter</ConfirmButton></form>}
                      <form action={deleteSubscription.bind(null, sub.id, prospect.id)}><ConfirmButton message="Supprimer ce suivi (il disparaît aussi du chiffre d'affaires) ?">Suppr.</ConfirmButton></form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <details>
              <summary className="cursor-pointer text-sm font-medium text-accent">+ Nouveau suivi mensuel</summary>
              <form action={createSubscription.bind(null, prospect.id)} className="mt-3 space-y-2">
                <input name="title" required placeholder="Maintenance du site" className="input" />
                <select name="service_type" defaultValue="maintenance" className="input">
                  {SERVICES.map((sv) => <option key={sv.value} value={sv.value}>{sv.emoji} {sv.label}</option>)}
                </select>
                <input name="monthly" inputMode="decimal" required placeholder="Montant par mois € (ex : 30)" className="input" />
                <label className="block"><span className="label">Début</span><input name="start_date" type="date" className="input" /></label>
                <textarea name="notes" rows={2} placeholder="Ce qui est inclus (mises à jour, assistance…)" className="input" />
                <button className="btn-primary w-full">Ajouter le suivi</button>
              </form>
            </details>
          </section>
        </div>

        {/* Colonne droite : timeline */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">📬 Messages</h2>
              {prospect.email && <Link href={`/messages/nouveau?prospect=${prospect.id}`} className="text-sm font-medium text-accent">✉️ Écrire</Link>}
            </div>
            {messages.length === 0 ? <p className="px-4 py-4 text-sm text-muted">Aucun email échangé depuis le CRM pour l&apos;instant.</p> : (
              <ul className="divide-y divide-border">
                {messages.map((m) => (
                  <li key={m.id}>
                    <Link href={`/messages/${m.id}`} className="flex items-start gap-3 px-4 py-2.5 hover:bg-soft">
                      <SourceBadge m={m} />
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm ${m.is_read ? "" : "font-semibold"}`}>{m.subject || "(sans objet)"}</div>
                        <div className="truncate text-xs text-muted">{m.ai_summary || (m.body ?? "").slice(0, 120)}</div>
                      </div>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(m.received_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
                      <div className="flex items-start gap-2">
                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-sm">
                          <span className="font-medium">{ACTIVITY_LABELS[a.type].label}</span>
                          <span className="text-xs text-muted">{dateTime(a.created_at)} · {a.created_by}</span>
                        </div>
                        <div className="-mt-1"><RowMenu id={a.id} kind="activity" /></div>
                      </div>
                      {a.content && (
                        <div className={`mt-1 text-sm whitespace-pre-line ${inbound ? "rounded-lg bg-soft p-3" : "text-muted"}`}>{a.content}</div>
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
    <AgentFiche prospectId={prospect.id} />
    </div>
  );
}
