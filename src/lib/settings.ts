import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Réglages modifiables depuis la page Agent (et lus par n8n via GET /api/n8n/settings). */
export interface Settings {
  /** L'agent ne fait plus rien tant que c'est vrai (n8n vérifie avant chaque envoi). */
  agent_paused: boolean;
  /** Métiers ciblés par la recherche automatique du matin. */
  target_sectors: string[];
  /** Villes / zone ciblées. */
  target_cities: string[];
  /** Nombre maximum de premiers emails par jour. */
  daily_email_limit: number;
  /** Prénom utilisé pour signer les emails de l'agent. */
  sender_first_name: string;
  /** Signature ajoutée sous les emails que tu écris depuis le CRM. */
  signature: string;
}

export const DEFAULT_SETTINGS: Settings = {
  agent_paused: false,
  target_sectors: [],
  target_cities: ["Caen"],
  daily_email_limit: 20,
  sender_first_name: "Nolla",
  signature: "Nolla\nSolveLab – agence digitale à Caen\nhttps://www.solvelab.fr",
};

export async function getSettings(db: SupabaseClient): Promise<Settings> {
  const { data, error } = await db.from("settings").select("key, value");
  if (error) return { ...DEFAULT_SETTINGS };
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of data ?? []) if (row.key in DEFAULT_SETTINGS) out[row.key] = row.value;
  return out as unknown as Settings;
}

export async function saveSettings(db: SupabaseClient, patch: Partial<Settings>) {
  const rows = Object.entries(patch)
    .filter(([k, v]) => k in DEFAULT_SETTINGS && v !== undefined)
    .map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
  if (!rows.length) return;
  const { error } = await db.from("settings").upsert(rows);
  if (error) throw error;
}

/** "plombier, électricien\nmenuisier" → ["plombier", "électricien", "menuisier"] */
export const splitList = (s: string) =>
  s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 50);
