import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_RANK } from "./constants";
import { normalizePhone } from "./format";
import { notifyN8n, type NotifyEvent } from "./notify";
import type { Activity, ActivityType, Prospect, ProspectStatus } from "./types";

const STOP_RE = /^\s*(stop|stop sms|désinscri\w*|desinscri\w*|ne plus (me )?contacter)\b/i;

export const PROSPECT_FIELDS = [
  "company_name", "contact_name", "sector", "city", "address", "phone", "email", "website",
  "siret", "size", "source", "channel", "score", "interest", "ai_summary", "tags", "next_followup_at",
] as const;

export function pickProspectFields(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of PROSPECT_FIELDS) if (input[k] !== undefined) out[k] = input[k] === "" ? null : input[k];
  if ("phone" in out) out.phone = normalizePhone(out.phone as string | null);
  if (typeof out.email === "string") out.email = out.email.trim().toLowerCase();
  return out;
}

/** Retrouve un prospect existant par ref, téléphone, email ou SIRET. */
export async function findProspect(
  db: SupabaseClient,
  q: { id?: string; ref?: string; phone?: string | null; email?: string | null; siret?: string | null },
): Promise<Prospect | null> {
  const tries: [string, string | null | undefined][] = [
    ["id", q.id], ["ref_slug", q.ref], ["phone", normalizePhone(q.phone)],
    ["email", q.email?.trim().toLowerCase()], ["siret", q.siret],
  ];
  for (const [col, val] of tries) {
    if (!val) continue;
    const { data } = await db.from("prospects").select("*").eq(col, val).maybeSingle();
    if (data) return data as Prospect;
  }
  return null;
}

/** Crée ou met à jour un prospect (dédoublonnage téléphone / email / SIRET). */
export async function upsertProspect(db: SupabaseClient, input: Record<string, unknown>) {
  const fields = pickProspectFields(input);
  const existing = await findProspect(db, {
    phone: fields.phone as string, email: fields.email as string, siret: fields.siret as string,
  });
  if (existing) {
    // on ne remplace que les champs vides, sauf ceux explicitement fournis par l'IA
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const cur = (existing as unknown as Record<string, unknown>)[k];
      if (v !== null && (cur === null || cur === undefined || ["score", "ai_summary", "interest", "tags"].includes(k))) patch[k] = v;
    }
    if (Object.keys(patch).length) {
      const { data, error } = await db.from("prospects").update(patch).eq("id", existing.id).select().single();
      if (error) throw error;
      return { prospect: data as Prospect, created: false };
    }
    return { prospect: existing, created: false };
  }
  if (!fields.company_name) throw new Error("company_name est obligatoire");
  const { data, error } = await db.from("prospects").insert(fields).select().single();
  if (error) throw error;
  return { prospect: data as Prospect, created: true };
}

/** Statut automatique déclenché par un type d'activité. */
const AUTO_STATUS: Partial<Record<ActivityType, ProspectStatus>> = {
  sms_sortant: "contacte",
  email_sortant: "contacte",
  clic_lien: "a_visite",
  formulaire: "chaud",
  rdv: "rdv",
  offre_envoyee: "offre_envoyee",
  offre_acceptee: "valide",
};

const NOTIFY_ON: Partial<Record<ActivityType, NotifyEvent>> = {
  formulaire: "prospect.formulaire",
  rdv: "prospect.rdv",
  sms_entrant: "prospect.reponse",
  email_entrant: "prospect.reponse",
  offre_acceptee: "offre.acceptee",
  offre_refusee: "offre.refusee",
};

export interface LogActivityInput {
  prospect: Prospect;
  type: ActivityType;
  content?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string;
  /** Statut forcé (ex : l'IA de n8n a classé la réponse "chaud" ou "perdu"). */
  status?: ProspectStatus;
  /** Champs prospect à mettre à jour en même temps (ai_summary, interest, score...). */
  prospectPatch?: Record<string, unknown>;
  notify?: boolean;
}

/**
 * Enregistre un événement dans la timeline et applique toute la logique CRM :
 * avancement du pipeline, détection STOP, marquage non-lu, notification n8n.
 */
export async function logActivity(db: SupabaseClient, input: LogActivityInput) {
  const { prospect, type } = input;
  const by = input.created_by ?? "n8n";

  const { data: activity, error } = await db.from("activities").insert({
    prospect_id: prospect.id, type, content: input.content ?? null,
    metadata: input.metadata ?? {}, created_by: by,
  }).select().single();
  if (error) throw error;

  const patch: Record<string, unknown> = { ...(input.prospectPatch ? pickProspectFields(input.prospectPatch) : {}) };
  const isInbound = ["sms_entrant", "email_entrant", "formulaire", "rdv", "clic_lien", "offre_acceptee", "offre_refusee"].includes(type);
  const isOutbound = ["sms_sortant", "email_sortant", "relance", "offre_envoyee"].includes(type);

  if (isOutbound) patch.last_contact_at = new Date().toISOString();
  if (isInbound && by !== "moi") patch.is_unread = true;

  // STOP : on coupe tout, définitivement
  const isStop = type === "stop" || (type === "sms_entrant" && STOP_RE.test(input.content ?? ""));
  let newStatus: ProspectStatus | undefined = input.status;
  if (isStop) {
    patch.opted_out = true;
    patch.next_followup_at = null;
    newStatus = "perdu";
    if (type !== "stop") {
      await db.from("activities").insert({ prospect_id: prospect.id, type: "stop", content: "Le prospect a demandé à ne plus être contacté.", created_by: "systeme" });
    }
  } else if (!newStatus && AUTO_STATUS[type]) {
    const auto = AUTO_STATUS[type]!;
    // un événement automatique ne fait jamais reculer (sauf depuis "perdu" vers une vraie demande)
    if (STATUS_RANK[auto] > STATUS_RANK[prospect.status] || (prospect.status === "perdu" && ["formulaire", "rdv", "offre_acceptee"].includes(type))) {
      newStatus = auto;
    }
  }
  if (isInbound && !isStop && type !== "clic_lien") patch.next_followup_at = null; // il a répondu : on stoppe les relances auto

  if (newStatus && newStatus !== prospect.status) {
    patch.status = newStatus;
    await db.from("activities").insert({
      prospect_id: prospect.id, type: "changement_statut",
      content: `${prospect.status} → ${newStatus}`, metadata: { from: prospect.status, to: newStatus }, created_by: "systeme",
    });
  }

  let updated = prospect;
  if (Object.keys(patch).length) {
    const { data, error: e2 } = await db.from("prospects").update(patch).eq("id", prospect.id).select().single();
    if (e2) throw e2;
    updated = data as Prospect;
  }

  if (input.notify !== false && by !== "moi") {
    let event = NOTIFY_ON[type];
    if (!event && newStatus === "chaud" && prospect.status !== "chaud") event = "prospect.chaud";
    if (event && !isStop) {
      await notifyN8n(event, {
        prospect: { id: updated.id, company_name: updated.company_name, contact_name: updated.contact_name, phone: updated.phone, email: updated.email, status: updated.status, interest: updated.interest },
        activity: { type, content: input.content ?? null, metadata: input.metadata ?? {} },
        link: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/prospects/${updated.id}`,
      });
    }
  }

  return { activity: activity as Activity, prospect: updated };
}

export function trackingUrl(slug: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/r/${slug}`;
}
