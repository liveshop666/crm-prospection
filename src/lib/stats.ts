import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProspectStatus } from "./types";

export async function getStats(db: SupabaseClient) {
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [{ data: rows }, { data: acts }, { data: offers }] = await Promise.all([
    db.from("prospects").select("status, opted_out, is_unread"),
    db.from("activities").select("type, created_at").gte("created_at", since7),
    db.from("offers").select("status, amount_cents, answered_at"),
  ]);

  const byStatus = {} as Record<ProspectStatus, number>;
  for (const r of rows ?? []) byStatus[r.status as ProspectStatus] = (byStatus[r.status as ProspectStatus] ?? 0) + 1;

  const count = (types: string[], from?: Date) =>
    (acts ?? []).filter((a) => types.includes(a.type) && (!from || new Date(a.created_at) >= from)).length;

  const sent7 = count(["sms_sortant", "email_sortant"]);
  const replies7 = count(["sms_entrant", "email_entrant", "formulaire", "rdv"]);
  const signed = (offers ?? []).filter((o) => o.status === "acceptee");

  return {
    total: rows?.length ?? 0,
    by_status: byStatus,
    unread: (rows ?? []).filter((r) => r.is_unread).length,
    opted_out: (rows ?? []).filter((r) => r.opted_out).length,
    today: { sent: count(["sms_sortant", "email_sortant"], today), replies: count(["sms_entrant", "email_entrant", "formulaire", "rdv"], today), clicks: count(["clic_lien"], today) },
    week: { sent: sent7, replies: replies7, clicks: count(["clic_lien"]), reply_rate: sent7 ? Math.round((replies7 / sent7) * 100) : 0 },
    signed_count: signed.length,
    signed_total_cents: signed.reduce((s, o) => s + (o.amount_cents ?? 0), 0),
    pipeline_cents: (offers ?? []).filter((o) => o.status === "envoyee").reduce((s, o) => s + (o.amount_cents ?? 0), 0),
  };
}
