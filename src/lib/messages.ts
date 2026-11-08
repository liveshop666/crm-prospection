import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUS_RANK } from "./constants";
import { findProspect, logActivity, upsertProspect } from "./crm";
import { normalizePhone } from "./format";
import type { ActivityType, Message, MessageCategory, MessageVerdict, Prospect, ProspectStatus } from "./types";

/** Infos sur la personne, extraites par l'IA (ou par le formulaire du site). */
export interface LeadInfo {
  company_name?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  sector?: string | null;
  website?: string | null;
  interest?: string | null;
  budget?: string | null;
}

/** Classement IA d'une réponse à ta prospection. */
export type Classement = "chaud" | "a_relancer" | "pas_interesse" | "stop" | null;

export interface IncomingMessage {
  external_id?: string | null;
  thread_id?: string | null;
  from_email?: string | null;
  from_name?: string | null;
  to_email?: string | null;
  subject?: string | null;
  body?: string | null;
  received_at?: string | null;
  source?: string | null;
  category?: MessageCategory | null;
  verdict?: MessageVerdict | null;
  ai_summary?: string | null;
  platform_url?: string | null;
  classement?: Classement;
  /** Date de relance proposée par l'IA (« rappelez-moi en janvier »). */
  relance_le?: string | null;
  lead?: LeadInfo | null;
  metadata?: Record<string, unknown>;
}

const CATEGORIES: MessageCategory[] = ["client", "plateforme", "autre"];
const VERDICTS: MessageVerdict[] = ["ok", "a_verifier", "spam"];
const CLASSEMENTS = ["chaud", "a_relancer", "pas_interesse", "stop"];
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) || null : null);
const slug = (s: unknown) => (typeof s === "string" ? s.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) : "") || null;
const safeUrl = (s: unknown) => {
  if (typeof s !== "string") return null;
  try { const u = new URL(s.trim()); return ["http:", "https:"].includes(u.protocol) ? u.toString() : null; } catch { return null; }
};
const isEmail = (s?: string | null) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Retrouve la fiche liée à un message : même conversation, même email, même téléphone, ou même nom sur la même plateforme. */
async function findProspectForMessage(db: SupabaseClient, m: Pick<Message, "thread_id" | "from_email" | "category" | "source" | "from_name">, lead: LeadInfo) {
  if (m.thread_id) {
    const { data } = await db.from("messages").select("prospect_id").eq("thread_id", m.thread_id).not("prospect_id", "is", null).limit(1).maybeSingle();
    if (data?.prospect_id) {
      const p = await findProspect(db, { id: data.prospect_id });
      if (p) return p;
    }
  }
  const email = m.category === "plateforme" ? lead.email : (lead.email ?? m.from_email);
  const byContact = await findProspect(db, { email: isEmail(email) ? email : null, phone: lead.phone });
  if (byContact) return byContact;
  if (m.category === "plateforme") {
    const name = (lead.contact_name ?? lead.company_name ?? m.from_name ?? "").replace(/[%,()"\\]/g, " ").trim();
    if (name.length >= 3) {
      const { data } = await db.from("prospects").select("*").eq("source", m.source)
        .or(`contact_name.ilike."${name}",company_name.ilike."${name}"`).limit(1).maybeSingle();
      if (data) return data as Prospect;
    }
  }
  return null;
}

/**
 * Relie un message à une fiche (la crée si besoin) et l'ajoute à l'historique,
 * avec toute la logique du CRM (statut, « Nouveau à voir », STOP, relances).
 */
export async function attachToProspect(
  db: SupabaseClient, msg: Message,
  opts: { lead?: LeadInfo | null; classement?: Classement; relance_le?: string | null; existing?: Prospect | null; created_by?: string } = {},
) {
  const lead = opts.lead ?? (msg.metadata?.lead as LeadInfo | undefined) ?? {};
  let prospect = opts.existing ?? await findProspectForMessage(db, msg, lead);
  let created = false;
  if (!prospect) {
    const contactEmail = msg.category === "plateforme" ? lead.email : (lead.email ?? msg.from_email);
    ({ prospect, created } = await upsertProspect(db, {
      company_name: lead.company_name || lead.contact_name || msg.from_name || contactEmail || `Demande ${msg.source}`,
      contact_name: lead.contact_name ?? msg.from_name ?? null,
      email: isEmail(contactEmail) ? contactEmail : null,
      phone: normalizePhone(lead.phone) ?? null,
      city: lead.city ?? null, sector: lead.sector ?? null, website: lead.website ?? null,
      interest: lead.interest ?? null,
      source: msg.category === "plateforme" ? msg.source : msg.source === "site" ? "formulaire_site" : "entrant",
      channel: "email",
    }));
  }

  const type: ActivityType = msg.category === "plateforme" ? "demande_plateforme" : msg.source === "site" ? "formulaire" : "email_entrant";
  let status: ProspectStatus | undefined;
  if (opts.classement === "chaud" && STATUS_RANK[prospect.status] < STATUS_RANK.chaud) status = "chaud";
  if (opts.classement === "pas_interesse") status = "perdu";

  const content = [
    msg.subject && `Objet : ${msg.subject}`,
    lead.budget && `Budget : ${lead.budget}`,
    (msg.body ?? "").slice(0, 3000),
  ].filter(Boolean).join("\n");

  let r = await logActivity(db, {
    prospect, type, content, status, created_by: opts.created_by ?? (msg.source === "site" ? "site" : "n8n"),
    metadata: { message_id: msg.id, subject: msg.subject, source: msg.source, platform_url: msg.platform_url, classement: opts.classement ?? null },
    prospectPatch: lead.interest && !prospect.interest ? { interest: lead.interest } : undefined,
  });
  if (opts.classement === "stop" && !r.prospect.opted_out) {
    r = await logActivity(db, { prospect: r.prospect, type: "stop", content: "A demandé par email à ne plus être contacté.", created_by: "systeme" });
  }
  if (opts.classement === "a_relancer" && !r.prospect.opted_out) {
    const when = opts.relance_le && !isNaN(Date.parse(opts.relance_le)) ? new Date(opts.relance_le) : new Date(Date.now() + 21 * 864e5);
    const { data } = await db.from("prospects").update({ next_followup_at: when.toISOString() }).eq("id", r.prospect.id).select().single();
    if (data) r.prospect = data as Prospect;
  }

  await db.from("messages").update({ prospect_id: r.prospect.id }).eq("id", msg.id);
  return { prospect: r.prospect, created };
}

/**
 * Enregistre un email reçu (envoyé par n8n, déjà trié par l'IA).
 * - spam        → gardé dans l'onglet Spam (lu), rien d'autre
 * - à vérifier  → onglet « À vérifier », tu décides
 * - autre       → onglet « Autres » (factures, newsletters…), sauf si c'est un contact déjà connu
 * - client / plateforme OK → fiche créée ou retrouvée + « Nouveau à voir »
 */
export async function ingestMessage(db: SupabaseClient, input: IncomingMessage) {
  const external_id = clip(input.external_id, 300);
  if (external_id) {
    const { data: dup } = await db.from("messages").select("*").eq("external_id", external_id).maybeSingle();
    if (dup) return { message: dup as Message, prospect: null, duplicate: true, created: false };
  }

  const category = CATEGORIES.includes(input.category as MessageCategory) ? input.category! : "client";
  const verdict = VERDICTS.includes(input.verdict as MessageVerdict) ? input.verdict! : "ok";
  const classement = CLASSEMENTS.includes(input.classement as string) ? input.classement! : null;
  const lead: LeadInfo = Object.fromEntries(
    Object.entries(input.lead ?? {}).map(([k, v]) => [k, clip(v, 300)]),
  ) as LeadInfo;
  const fromEmail = clip(input.from_email, 200)?.toLowerCase() ?? null;

  const row = {
    direction: "entrant",
    source: slug(input.source) ?? (category === "plateforme" ? "plateforme" : "email"),
    category, verdict,
    from_email: fromEmail,
    from_name: clip(input.from_name, 200),
    to_email: clip(input.to_email, 200),
    subject: clip(input.subject, 500),
    body: clip(input.body, 50000),
    ai_summary: clip(input.ai_summary, 500),
    thread_id: clip(input.thread_id, 300),
    external_id,
    platform_url: safeUrl(input.platform_url),
    received_at: input.received_at && !isNaN(Date.parse(input.received_at)) ? new Date(input.received_at).toISOString() : new Date().toISOString(),
    is_read: verdict === "spam",
    metadata: { ...(input.metadata ?? {}), lead, classement, relance_le: input.relance_le ?? null },
  };
  const { data, error } = await db.from("messages").insert(row).select().single();
  if (error) {
    // deux appels en même temps pour le même email : on renvoie celui qui existe
    if (error.code === "23505" && external_id) {
      const { data: dup } = await db.from("messages").select("*").eq("external_id", external_id).single();
      return { message: dup as Message, prospect: null, duplicate: true, created: false };
    }
    throw error;
  }
  const msg = data as Message;
  if (verdict === "spam") return { message: msg, prospect: null, duplicate: false, created: false };

  // un contact déjà connu qui écrit : toujours dans son historique, même si l'IA hésite
  const known = await findProspectForMessage(db, msg, lead);
  const shouldAttach = known ? true : verdict === "ok" && category !== "autre";
  if (!shouldAttach) {
    return { message: msg, prospect: null, duplicate: false, created: false };
  }
  const r = await attachToProspect(db, msg, { lead, classement, relance_le: input.relance_le, existing: known });
  return { message: { ...msg, prospect_id: r.prospect.id }, prospect: r.prospect, duplicate: false, created: r.created };
}
