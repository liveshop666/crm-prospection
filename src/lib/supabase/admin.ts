import "server-only";
import { supabaseUrl } from "@/lib/supabase/url";
import { createClient } from "@supabase/supabase-js";

/**
 * Client "service role" : contourne la RLS.
 * Uniquement pour les routes API appelées par n8n et les pages publiques (lien tracké, offre, formulaire).
 * Ne JAMAIS l'importer dans un composant client.
 */
export function createAdminClient() {
  return createClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
