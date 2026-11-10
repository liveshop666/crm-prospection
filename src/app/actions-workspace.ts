"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/crm";
import { attachToProspect } from "@/lib/messages";
import { callN8n } from "@/lib/n8n";
import { createSubscriptionFromOffer } from "@/lib/sales";
import { getSettings, saveSettings, splitList } from "@/lib/settings";
import { LIEN_AVIS_GOOGLE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { AgentTaskType, Message, Offer, Prospect } from "@/lib/types";

async function db() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  return supabase;
}

const str = (fd: FormData, k: string, n = 5000) => String(fd.get(k) ?? "").trim().slice(0, n);
const euros = (v: string) => Math.max(0, Math.round(parseFloat(v.replace(",", ".").replace(/\s/g, "")) * 100) || 0);

// =====================================================================
// Messages
// =====================================================================

export async function markMessageRead(id: string) {
  const supabase = await db();
  await supabase.from("messages").update({ is_read: true }).eq("id", id).eq("is_read", false);
}

/** Écrire ou répondre à un email depuis le CRM. n8n l'envoie avec ton Gmail pro. */
export async function sendEmail(_prev: { error?: string; ok?: string } | undefined, fd: FormData): Promise<{ error?: string; ok?: string }> {
  const supabase = await db();
  const to = str(fd, "to", 200).toLowerCase();
  const subject = str(fd, "subject", 500);
  const body = str(fd, "body", 50000);
  const replyToId = str(fd, "reply_to", 60) || null;
  let prospectId = str(fd, "prospect_id", 60) || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Adresse email du destinataire invalide." };
  if (!body) return { error: "Le message est vide." };

  let replyTo: Message | null = null;
  if (replyToId) {
    const { data } = await supabase.from("messages").select("*").eq("id", replyToId).maybeSingle();
    replyTo = data as Message | null;
    prospectId ??= replyTo?.prospect_id ?? null;
  }
  if (!prospectId) {
    const { data } = await supabase.from("prospects").select("id").eq("email", to).maybeSingle();
    prospectId = data?.id ?? null;
  }

  const { data: msg, error } = await supabase.from("messages").insert({
    direction: "sortant", source: "email", category: "client", verdict: "ok", is_read: true,
    prospect_id: prospectId, to_email: to, subject: subject || (replyTo?.subject ? `Re: ${replyTo.subject.replace(/^re:\s*/i, "")}` : "(sans objet)"),
    body, thread_id: replyTo?.thread_id ?? null, send_status: "a_envoyer",
    metadata: { reply_to_external_id: replyTo?.external_id ?? null },
  }).select().single();
  if (error) return { error: `Impossible d'enregistrer l'email : ${error.message}` };

  const r = await callN8n("mail", {
    action: "envoyer_email", message_id: msg.id, to, subject: msg.subject, body,
    thread_id: msg.thread_id, reply_to_external_id: replyTo?.external_id ?? null,
  });
  if (!r.ok) {
    await supabase.from("messages").update({ error: r.error }).eq("id", msg.id);
  }
  revalidatePath("/messages");
  if (prospectId) revalidatePath(`/prospects/${prospectId}`);
  if (replyTo) revalidatePath(`/messages/${replyTo.id}`);
  if (!r.ok && !r.configured) return { ok: "Email enregistré. Il partira dès que le workflow n8n « 08 – Envoi depuis le CRM » sera branché." };
  if (!r.ok) return { error: `Email enregistré mais n8n n'a pas répondu (${r.error}). Il sera renvoyé automatiquement.` };
  return { ok: "Email en cours d'envoi ✓" };
}

/** Le filtre a mis ce message de côté : tu dis si c'est un vrai client ou un spam. */
export async function setMessageVerdict(id: string, verdict: "ok" | "spam") {
  const supabase = await db();
  const { data } = await supabase.from("messages").select("*").eq("id", id).single();
  const msg = data as Message;
  if (verdict === "spam") {
    await supabase.from("messages").update({ verdict: "spam", is_read: true }).eq("id", id);
  } else {
    const category = msg.category === "autre" ? "client" : msg.category;
    await supabase.from("messages").update({ verdict: "ok", category }).eq("id", id);
    if (!msg.prospect_id) await attachToProspect(supabase, { ...msg, verdict: "ok", category }, { created_by: "moi" });
  }
  revalidatePath("/messages"); revalidatePath(`/messages/${id}`); revalidatePath("/");
}

/** Supprime un message du CRM (reste dans ta boîte mail). Avec `withProspect`, supprime aussi la fiche liée. */
export async function removeMessage(id: string, withProspect = false) {
  const supabase = await db();
  const { data } = await supabase.from("messages").select("prospect_id").eq("id", id).maybeSingle();
  await supabase.from("messages").delete().eq("id", id);
  if (withProspect && data?.prospect_id) await supabase.from("prospects").delete().eq("id", data.prospect_id);
  revalidatePath("/messages"); revalidatePath("/");
  if (data?.prospect_id) revalidatePath(`/prospects/${data.prospect_id}`);
}

/** Vide un onglet de Messages d'un seul coup. Les fiches clients ne sont pas touchées. */
export async function clearMessages(tab: string) {
  const supabase = await db();
  let q = supabase.from("messages").delete();
  if (tab === "boite") q = q.eq("direction", "entrant").eq("verdict", "ok").in("category", ["client", "plateforme"]);
  else if (tab === "plateformes") q = q.eq("direction", "entrant").eq("verdict", "ok").eq("category", "plateforme");
  else if (tab === "verifier") q = q.eq("direction", "entrant").eq("verdict", "a_verifier");
  else if (tab === "autres") q = q.eq("direction", "entrant").eq("verdict", "ok").eq("category", "autre");
  else if (tab === "envoyes") q = q.eq("direction", "sortant");
  else if (tab === "spam") q = q.eq("verdict", "spam");
  else return;
  await q;
  revalidatePath("/messages"); revalidatePath("/");
}

function revalidateAll() {
  for (const p of ["/", "/prospects", "/pipeline", "/offres", "/clients", "/chiffre", "/agent", "/messages"]) revalidatePath(p);
}

/** Supprime des fiches (avec leur historique et leurs offres). Les chiffres des visites du site restent. */
export async function deleteProspectsByIds(ids: string[]) {
  const supabase = await db();
  const clean = ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i)).slice(0, 500);
  if (!clean.length) return;
  await supabase.from("prospects").delete().in("id", clean);
  revalidateAll();
}
export async function removeProspectRow(id: string) { await deleteProspectsByIds([id]); }

export async function removeOffer(id: string) {
  const supabase = await db();
  await supabase.from("offers").delete().eq("id", id);
  revalidateAll();
}

/** Supprime les offres brouillon / envoyées / refusées. Les offres signées restent (elles font ton chiffre d'affaires). */
export async function clearUnsignedOffers() {
  const supabase = await db();
  await supabase.from("offers").delete().neq("status", "acceptee");
  revalidateAll();
}

export async function removeAgentTask(id: string) {
  const supabase = await db();
  await supabase.from("agent_tasks").delete().eq("id", id);
  revalidatePath("/agent");
}

/** Vide l'historique des ordres terminés, en erreur ou annulés (ceux en attente restent). */
export async function clearAgentTasks() {
  const supabase = await db();
  await supabase.from("agent_tasks").delete().in("status", ["termine", "erreur", "annule"]);
  revalidatePath("/agent");
}

/**
 * Vide « Activité récente » de l'accueil SANS toucher aux chiffres (envoyés, réponses…) :
 * les lignes sont masquées de l'accueil mais restent dans l'historique de chaque fiche.
 */
export async function hideRecentFeed() {
  const supabase = await db();
  const { data } = await supabase.from("activities").select("id, metadata")
    .not("type", "eq", "changement_statut").filter("metadata->>hidden", "is", null).limit(300);
  await Promise.all((data ?? []).map((a) =>
    supabase.from("activities").update({ metadata: { ...(a.metadata ?? {}), hidden: true } }).eq("id", a.id)));
  revalidatePath("/");
}

export async function deleteMessage(id: string) {
  const supabase = await db();
  await supabase.from("messages").delete().eq("id", id);
  revalidatePath("/messages");
  redirect("/messages");
}

// =====================================================================
// Agent
// =====================================================================

export async function createAgentTask(_prev: { error?: string; ok?: string } | undefined, fd: FormData): Promise<{ error?: string; ok?: string }> {
  const supabase = await db();
  const type = str(fd, "type", 20) as AgentTaskType;
  if (!["recherche", "envoi", "relances", "consigne"].includes(type)) return { error: "Type d'ordre inconnu." };
  const n = (k: string, def: number, max: number) => Math.min(max, Math.max(1, parseInt(str(fd, k, 6)) || def));
  const params: Record<string, unknown> =
    type === "recherche" ? { sectors: splitList(str(fd, "sectors", 1000)), cities: splitList(str(fd, "cities", 1000)), max: n("max", 30, 200), criteria: str(fd, "criteria", 500) || null }
    : type === "envoi" ? { count: n("count", 20, 100), min_score: parseInt(str(fd, "min_score", 3)) || 0, sector: str(fd, "sector", 200) || null, city: str(fd, "city", 200) || null }
    : type === "relances" ? { count: n("count", 20, 100) }
    : { instruction: str(fd, "instruction", 3000) };
  if (type === "recherche" && (!(params.sectors as string[]).length || !(params.cities as string[]).length)) return { error: "Indique au moins un métier et une ville." };
  if (type === "consigne" && !params.instruction) return { error: "Écris ta consigne." };

  const { data: task, error } = await supabase.from("agent_tasks").insert({ type, params }).select().single();
  if (error) return { error: `Impossible d'enregistrer l'ordre : ${error.message}` };
  const settings = await getSettings(supabase);
  const r = await callN8n("agent", { action: "agent_tache", task_id: task.id, type, params, settings });
  if (r.ok) await supabase.from("agent_tasks").update({ status: "envoye" }).eq("id", task.id);
  else await supabase.from("agent_tasks").update({ error: r.error }).eq("id", task.id);
  revalidatePath("/agent");
  if (!r.configured) return { ok: "Ordre enregistré. L'agent le prendra à son prochain passage (ou dès que son webhook sera branché)." };
  if (!r.ok) return { error: `Ordre enregistré, mais l'agent n'a pas répondu (${r.error}). Il le prendra à son prochain passage.` };
  return { ok: "Ordre transmis à l'agent ✓" };
}

export async function cancelAgentTask(id: string) {
  const supabase = await db();
  await supabase.from("agent_tasks").update({ status: "annule" }).eq("id", id).in("status", ["en_attente", "envoye"]);
  revalidatePath("/agent");
}

export async function saveAgentSettings(fd: FormData) {
  const supabase = await db();
  await saveSettings(supabase, {
    target_sectors: splitList(str(fd, "target_sectors", 2000)),
    target_cities: splitList(str(fd, "target_cities", 2000)),
    daily_email_limit: Math.min(300, Math.max(0, parseInt(str(fd, "daily_email_limit", 4)) || 0)),
    sender_first_name: str(fd, "sender_first_name", 60) || "Nolla",
    signature: str(fd, "signature", 1000),
  });
  revalidatePath("/agent");
}

export async function setAgentPaused(paused: boolean) {
  const supabase = await db();
  await saveSettings(supabase, { agent_paused: paused });
  revalidatePath("/agent");
}

// =====================================================================
// Ventes : offres, paiements, suivis mensuels
// =====================================================================

async function getOffer(supabase: Awaited<ReturnType<typeof db>>, id: string) {
  const { data, error } = await supabase.from("offers").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Offer;
}

function revalidateSales(prospectId: string) {
  revalidatePath(`/prospects/${prospectId}`); revalidatePath("/offres"); revalidatePath("/clients"); revalidatePath("/chiffre"); revalidatePath("/");
}

/** Le client a dit oui (par téléphone, en RDV…) : tu marques l'offre acceptée toi-même. */
export async function markOfferAccepted(offerId: string) {
  const supabase = await db();
  const offer = await getOffer(supabase, offerId);
  if (offer.status === "acceptee") return;
  const { data: updated } = await supabase.from("offers").update({ status: "acceptee", answered_at: new Date().toISOString() }).eq("id", offerId).select().single();
  const { data: p } = await supabase.from("prospects").select("*").eq("id", offer.prospect_id).single();
  await logActivity(supabase, {
    prospect: p as Prospect, type: "offre_acceptee", content: offer.title,
    metadata: { offer_id: offer.id, amount_cents: offer.amount_cents }, created_by: "moi",
  });
  await createSubscriptionFromOffer(supabase, (updated ?? offer) as Offer);
  revalidateSales(offer.prospect_id);
}

export async function setOfferPayment(offerId: string, fd: FormData) {
  const supabase = await db();
  const offer = await getOffer(supabase, offerId);
  const status = str(fd, "payment_status", 20);
  if (!["non_paye", "acompte", "paye"].includes(status)) return;
  const paid = status === "paye" ? offer.amount_cents : status === "non_paye" ? 0 : Math.min(offer.amount_cents, euros(str(fd, "paid", 20)));
  await supabase.from("offers").update({
    payment_status: status, paid_cents: paid, paid_at: paid > 0 ? new Date().toISOString() : null,
  }).eq("id", offerId);
  revalidateSales(offer.prospect_id);
}

export async function createSubscription(prospectId: string, fd: FormData) {
  const supabase = await db();
  const title = str(fd, "title", 200) || "Suivi mensuel";
  const start = str(fd, "start_date", 10);
  const { error } = await supabase.from("subscriptions").insert({
    prospect_id: prospectId, title, service_type: str(fd, "service_type", 40) || "maintenance",
    monthly_cents: euros(str(fd, "monthly", 20)), notes: str(fd, "notes", 2000) || null,
    ...(/^\d{4}-\d{2}-\d{2}$/.test(start) ? { start_date: start } : {}),
  });
  if (error) throw error;
  revalidateSales(prospectId);
}

export async function setSubscriptionStatus(id: string, prospectId: string, status: "actif" | "pause" | "termine") {
  const supabase = await db();
  const today = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  await supabase.from("subscriptions").update({ status, end_date: status === "termine" ? today : null }).eq("id", id);
  revalidateSales(prospectId);
}

export async function deleteSubscription(id: string, prospectId: string) {
  const supabase = await db();
  await supabase.from("subscriptions").delete().eq("id", id);
  revalidateSales(prospectId);
}

/**
 * Projet terminé et payé : demande d'avis Google au client, depuis contact@solvelab.fr (workflow 08).
 * Le lien ouvre directement la fenêtre des étoiles de la fiche Google de SolveLab.
 */
export async function demanderAvisGoogle(offerId: string) {
  const supabase = await db();
  const offer = await getOffer(supabase, offerId);
  if (offer.status !== "acceptee" || offer.payment_status !== "paye") return;
  const { data } = await supabase.from("prospects").select("*").eq("id", offer.prospect_id).single();
  const p = data as Prospect;
  if (!p?.email) return;
  const prenom = (p.contact_name ?? "").trim().split(/\s+/)[0];
  const subject = "Merci pour votre confiance — un petit avis ?";
  const body = `Bonjour${prenom ? " " + prenom : ""},

Votre projet « ${offer.title} » est terminé : merci encore pour votre confiance, ce fut un plaisir de travailler avec vous.

Si vous êtes satisfait, pourriez-vous laisser un petit avis sur Google ? Ça prend 30 secondes et ça aide énormément une agence locale comme SolveLab :
${LIEN_AVIS_GOOGLE}

Et si quelque chose peut être amélioré, répondez simplement à ce message : je m'en occupe.

Merci beaucoup et à bientôt,
Rudy — SolveLab, à Carpiquet · contact@solvelab.fr`;
  const { data: msg, error } = await supabase.from("messages").insert({
    direction: "sortant", source: "email", category: "client", verdict: "ok", is_read: true,
    prospect_id: p.id, to_email: p.email.toLowerCase(), subject, body, send_status: "a_envoyer",
  }).select().single();
  if (error) return;
  const r = await callN8n("mail", { action: "envoyer_email", message_id: msg.id, to: p.email.toLowerCase(), subject, body, thread_id: null, reply_to_external_id: null });
  if (!r.ok) await supabase.from("messages").update({ error: r.error }).eq("id", msg.id);
  await supabase.from("offers").update({ avis_demande_at: new Date().toISOString() }).eq("id", offerId);
  await logActivity(supabase, { prospect: p, type: "note", created_by: "rudy", content: "⭐ Demande d'avis Google envoyée", metadata: { offer_id: offerId } });
  revalidateSales(offer.prospect_id);
  revalidatePath("/messages");
}
