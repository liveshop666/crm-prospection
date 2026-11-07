import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SiteEventType = "visite" | "clic_rdv" | "clic_lien" | "formulaire" | "rdv" | "rdv_annule";

export interface SiteEventInput {
  type: SiteEventType;
  path?: string | null;
  ref?: string | null;
  prospect_id?: string | null;
  prospect_name?: string | null;
  visitor?: string | null;
  referrer?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Ajoute une ligne au journal du site. Ce journal est indépendant des fiches :
 * il reste même si le prospect est supprimé. Ne fait jamais échouer l'appelant.
 */
export async function recordSiteEvent(db: SupabaseClient, e: SiteEventInput) {
  try {
    const { error } = await db.from("site_events").insert({
      type: e.type, path: e.path ?? null, ref: e.ref ?? null,
      prospect_id: e.prospect_id ?? null, prospect_name: e.prospect_name ?? null,
      visitor: e.visitor ?? null, referrer: e.referrer ?? null, metadata: e.metadata ?? {},
    });
    if (error) console.error("[site_events]", error.message);
  } catch (err) {
    console.error("[site_events]", err);
  }
}
