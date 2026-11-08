import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceLabel, sourceLabel } from "./constants";
import type { Offer, Subscription } from "./types";

const TZ = "Europe/Paris";
/** "2026-11" pour une date donnée (heure de Paris). */
export const monthKey = (d: Date | string) => new Date(d).toLocaleDateString("fr-CA", { timeZone: TZ }).slice(0, 7);
export const monthLabel = (key: string, long = false) =>
  new Date(`${key}-15T12:00:00`).toLocaleDateString("fr-FR", { month: long ? "long" : "short", year: long ? "numeric" : "2-digit" });

/** Crée le suivi mensuel prévu dans une offre acceptée (une seule fois). */
export async function createSubscriptionFromOffer(db: SupabaseClient, offer: Offer) {
  if (!offer.monthly_cents || offer.monthly_cents <= 0) return null;
  const { data: existing } = await db.from("subscriptions").select("id").eq("offer_id", offer.id).maybeSingle();
  if (existing) return existing;
  const { data } = await db.from("subscriptions").insert({
    prospect_id: offer.prospect_id, offer_id: offer.id,
    title: `Suivi mensuel — ${offer.title}`, service_type: "maintenance", monthly_cents: offer.monthly_cents,
  }).select().single();
  return data;
}

/** Un suivi compte pour un mois s'il avait commencé et n'était pas encore terminé ce mois-là. */
function activeInMonth(s: Subscription, key: string) {
  const start = s.start_date.slice(0, 7);
  const end = s.end_date ? s.end_date.slice(0, 7) : null;
  if (start > key) return false;
  if (end && end < key) return false;
  if (!end && s.status !== "actif" && key >= monthKey(new Date())) return false; // en pause : ne compte plus à partir de maintenant
  return true;
}

type OfferRow = Offer & { prospects: { source: string | null } | null };

export async function getRevenue(db: SupabaseClient, months = 12) {
  const [{ data: offs, error }, { data: subs }] = await Promise.all([
    db.from("offers").select("*, prospects(source)").limit(5000),
    db.from("subscriptions").select("*").limit(5000),
  ]);
  const offers = (offs ?? []) as OfferRow[];
  const subscriptions = (subs ?? []) as Subscription[];
  const signed = offers.filter((o) => o.status === "acceptee");

  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 15)));
  const thisMonth = keys[keys.length - 1];

  const perMonth = keys.map((key) => {
    const signedCents = signed.filter((o) => monthKey(o.answered_at ?? o.created_at) === key).reduce((s, o) => s + o.amount_cents, 0);
    const recurringCents = subscriptions.filter((s) => activeInMonth(s, key)).reduce((t, s) => t + s.monthly_cents, 0);
    const paidCents = offers.filter((o) => o.paid_at && monthKey(o.paid_at) === key).reduce((s, o) => s + o.paid_cents, 0);
    return { key, signedCents, recurringCents, paidCents, totalCents: signedCents + recurringCents };
  });

  const group = (label: (o: OfferRow) => string) => {
    const m = new Map<string, { label: string; cents: number; count: number }>();
    for (const o of signed) {
      const l = label(o);
      const g = m.get(l) ?? { label: l, cents: 0, count: 0 };
      g.cents += o.amount_cents; g.count++; m.set(l, g);
    }
    return [...m.values()].sort((a, b) => b.cents - a.cents);
  };

  const active = subscriptions.filter((s) => s.status === "actif");
  const cur = perMonth[perMonth.length - 1];
  return {
    tableMissing: !!error,
    months: perMonth,
    thisMonth: { key: thisMonth, signedCents: cur.signedCents, recurringCents: cur.recurringCents, paidCents: cur.paidCents },
    yearTotalCents: perMonth.reduce((s, m) => s + m.totalCents, 0),
    signedTotalCents: signed.reduce((s, o) => s + o.amount_cents, 0),
    paidTotalCents: signed.reduce((s, o) => s + Math.min(o.paid_cents, o.amount_cents), 0),
    toCollectCents: signed.reduce((s, o) => s + Math.max(0, o.amount_cents - o.paid_cents), 0),
    pendingOffersCents: offers.filter((o) => o.status === "envoyee").reduce((s, o) => s + o.amount_cents, 0),
    mrrCents: active.reduce((s, x) => s + x.monthly_cents, 0),
    activeSubscriptions: active.length,
    byService: group((o) => serviceLabel(o.service_type)),
    byOrigin: group((o) => sourceLabel(o.prospects?.source)),
    signedCount: signed.length,
  };
}
