"use server";

import { revalidatePath } from "next/cache";
import { callN8n } from "@/lib/n8n";
import { createClient } from "@/lib/supabase/server";

/** Actions de l'espace « Agent de prospection ». Tout passe par les fonctions Supabase de l'agent. */
async function db() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  return supabase;
}

const fini = () => revalidatePath("/agent");

export async function validerMessage(id: string, texte?: string, objet?: string) {
  const supabase = await db();
  const { data, error } = await supabase.rpc("agent_valider_message", { p_id: id, p_texte: texte ?? null, p_objet: objet ?? null });
  if (error) return { ok: false, erreur: error.message };
  fini();
  const r = data as { ok: boolean; controles?: { bloquants?: string[] } };
  return { ok: r.ok, erreur: r.ok ? undefined : (r.controles?.bloquants ?? ["message non modifiable"]).join(", ") };
}

export async function ecarterMessage(id: string) {
  const supabase = await db();
  await supabase.rpc("agent_ecarter_message", { p_id: id });
  fini();
}

/** Suppression directe : messages non envoyés, fiche CRM créée par l'agent ; l'agent ne la recontactera jamais. */
export async function supprimerEntreprise(entrepriseId: string) {
  const supabase = await db();
  const { data, error } = await supabase.rpc("agent_supprimer", { p_entreprise: entrepriseId });
  fini();
  revalidatePath("/prospects");
  if (error) return { ok: false, erreur: error.message };
  return data as { ok: boolean };
}

export async function toutValider() {
  const supabase = await db();
  await supabase.rpc("agent_tout_valider");
  fini();
}

export async function marquerFait(id: string) {
  const supabase = await db();
  await supabase.from("agent_messages").update({ statut: "fait" }).eq("id", id).eq("statut", "a_faire");
  fini();
}

export async function mettreEnPause(pause: boolean) {
  const supabase = await db();
  await supabase.rpc("agent_mettre_en_pause", { p_pause: pause, p_raison: pause ? "demandée depuis le CRM" : null });
  fini();
}

export async function passerEnReel() {
  const supabase = await db();
  const { data, error } = await supabase.rpc("agent_passer_en_reel");
  fini();
  if (error) return { ok: false, manque: [error.message] };
  return data as { ok: boolean; manque?: string[] };
}

export async function passerEnSimulation() {
  const supabase = await db();
  await supabase.rpc("agent_passer_en_simulation");
  fini();
}

export async function testerUneEntreprise() {
  const supabase = await db();
  const { data, error } = await supabase.rpc("agent_demander_test", { p_entreprise: null });
  const d = data as { ok?: boolean; entreprise_id?: string; raison?: string } | null;
  if (error || !d?.ok || !d.entreprise_id) return { ok: false, immediat: false, raison: d?.raison ?? error?.message ?? "Test impossible pour l'instant." };
  const id = d.entreprise_id;
  // le workflow 2 démarre tout de suite si le webhook est branché, sinon au prochain passage
  const r = await callN8n("agent", { action: "tester", entreprise_id: id });
  fini();
  return { ok: true, immediat: r.ok, entreprise_id: id, raison: undefined as string | undefined };
}

export async function enregistrerReglages(fd: FormData) {
  const supabase = await db();
  const zones = [1, 2, 3].filter((z) => fd.get(`zone_${z}`) === "on");
  const jours = [1, 2, 3, 4, 5, 6, 7].filter((j) => fd.get(`jour_${j}`) === "on");
  const plage = (k: string, d: string) => (/^\d{2}:\d{2}$/.test(String(fd.get(k) ?? "")) ? String(fd.get(k)) : d);
  const seuil = Math.min(100, Math.max(0, Number(fd.get("seuil_score") ?? 60) || 60));
  const email = (k: string) => { const v = String(fd.get(k) ?? "").trim().toLowerCase(); return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(v) ? v : null; };
  const envoiAuto = fd.get("envoi_auto") === "on";
  const entier = (k: string, d: number, min: number, max: number) => {
    const n = Math.round(Number(fd.get(k)));
    return Number.isFinite(n) && String(fd.get(k) ?? "").trim() !== "" ? Math.min(max, Math.max(min, n)) : d;
  };
  const texte = (k: string, max: number) => String(fd.get(k) ?? "").replace(/\r/g, "").trim().slice(0, max);
  const presentation = texte("presentation", 3000);
  await supabase.from("config_agent").update({
    zones_actives: zones.length ? zones : [1],
    horaires: { jours: jours.length ? jours : [1, 2, 3, 4, 5], plages: [[plage("m1", "09:00"), plage("m2", "12:00")], [plage("a1", "14:00"), plage("a2", "17:30")]] },
    seuil_score: seuil,
    envoi_auto: envoiAuto,
    validation_obligatoire: !envoiAuto,
    email_expediteur: email("email_expediteur"),
    alert_email: email("alert_email"),
    sms_stop: fd.get("sms_stop") === "brevo" ? "brevo" : "lien",
    ...(presentation ? { presentation } : {}),
    consignes: texte("consignes", 3000),
    nom_expediteur: texte("nom_expediteur", 80) || "Rudy — SolveLab",
    limite_max_jour: entier("limite_max_jour", 40, 1, 60),
    lot_verification: entier("lot_verification", 15, 5, 25),
    stock_jours: entier("stock_jours", 3, 1, 7),
    part_liste_pct: entier("part_liste_pct", 70, 0, 100),
    relance1_jours: entier("relance1_jours", 4, 1, 30),
    relance2_jours: entier("relance2_jours", 6, 1, 30),
    relance_sms_jours: entier("relance_sms_jours", 5, 1, 30),
    recontact_mois: entier("recontact_mois", 6, 0, 24),
    quota_cible_pct: entier("quota_cible_pct", 80, 50, 90),
    quota_pause_pct: entier("quota_pause_pct", 95, 80, 99),
  }).eq("id", 1);
  fini();
}

/** Demande d'accès ou de suppression (RGPD), traitée sous un mois. */
export async function demandeRgpd(fd: FormData) {
  const supabase = await db();
  const valeur = String(fd.get("valeur") ?? "").trim();
  const action = fd.get("action") === "suppression" ? "suppression" : "acces";
  if (!valeur) return { ok: false };
  const { data } = await supabase.rpc("agent_demande_rgpd", { p_valeur: valeur, p_action: action });
  fini();
  return data as { ok: boolean; supprimees?: number; donnees?: unknown[] };
}
