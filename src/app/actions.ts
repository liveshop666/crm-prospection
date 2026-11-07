"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity, pickProspectFields, upsertProspect } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import type { Prospect, ProspectStatus } from "@/lib/types";

async function db() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  return supabase;
}

async function getProspect(supabase: Awaited<ReturnType<typeof db>>, id: string) {
  const { data, error } = await supabase.from("prospects").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Prospect;
}

const formObj = (fd: FormData) => Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));

export async function createProspect(fd: FormData) {
  const supabase = await db();
  const { prospect } = await upsertProspect(supabase, { ...formObj(fd), source: "manuel" });
  redirect(`/prospects/${prospect.id}`);
}

export async function updateProspect(id: string, fd: FormData) {
  const supabase = await db();
  const patch = pickProspectFields(formObj(fd));
  if (typeof patch.score === "string") patch.score = patch.score ? Number(patch.score) : null;
  const { error } = await supabase.from("prospects").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath(`/prospects/${id}`);
}

export async function setStatus(id: string, status: ProspectStatus) {
  const supabase = await db();
  const prospect = await getProspect(supabase, id);
  if (prospect.status === status) return;
  await logActivity(supabase, { prospect, type: "changement_statut", status, created_by: "moi" });
  revalidatePath("/pipeline"); revalidatePath(`/prospects/${id}`); revalidatePath("/");
}

export async function addNote(id: string, fd: FormData) {
  const content = String(fd.get("content") ?? "").trim();
  if (!content) return;
  const supabase = await db();
  const prospect = await getProspect(supabase, id);
  const type = (String(fd.get("type") || "note")) as "note" | "rdv" | "sms_sortant" | "email_sortant";
  await logActivity(supabase, { prospect, type, content, created_by: "moi" });
  revalidatePath(`/prospects/${id}`);
}

export async function markRead(id: string) {
  const supabase = await db();
  await supabase.from("prospects").update({ is_unread: false }).eq("id", id);
}

export async function setOptOut(id: string, optedOut: boolean) {
  const supabase = await db();
  const prospect = await getProspect(supabase, id);
  if (optedOut) {
    await logActivity(supabase, { prospect, type: "stop", content: "Marqué « ne plus contacter » manuellement.", created_by: "moi" });
  } else {
    await supabase.from("prospects").update({ opted_out: false }).eq("id", id);
  }
  revalidatePath(`/prospects/${id}`);
}

export async function deleteProspect(id: string) {
  const supabase = await db();
  await supabase.from("prospects").delete().eq("id", id);
  redirect("/prospects");
}

export async function createOffer(prospectId: string, fd: FormData) {
  const supabase = await db();
  const amount = Math.round(parseFloat(String(fd.get("amount") ?? "0").replace(",", ".").replace(/\s/g, "")) * 100) || 0;
  const { error } = await supabase.from("offers").insert({
    prospect_id: prospectId, title: String(fd.get("title") ?? "Offre").trim(),
    description: String(fd.get("description") ?? "").trim() || null, amount_cents: amount,
  });
  if (error) throw error;
  revalidatePath(`/prospects/${prospectId}`);
}

/** Marque l'offre comme envoyée (tu copies ensuite le lien, ou n8n l'envoie). */
export async function markOfferSent(offerId: string) {
  const supabase = await db();
  const { data: offer, error } = await supabase.from("offers")
    .update({ status: "envoyee", sent_at: new Date().toISOString() }).eq("id", offerId).select().single();
  if (error) throw error;
  const prospect = await getProspect(supabase, offer.prospect_id);
  await logActivity(supabase, {
    prospect, type: "offre_envoyee", content: offer.title,
    metadata: { offer_id: offer.id, amount_cents: offer.amount_cents }, created_by: "moi",
  });
  revalidatePath(`/prospects/${offer.prospect_id}`); revalidatePath("/offres");
}

export async function deleteOffer(offerId: string, prospectId: string) {
  const supabase = await db();
  await supabase.from("offers").delete().eq("id", offerId);
  revalidatePath(`/prospects/${prospectId}`); revalidatePath("/offres");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
