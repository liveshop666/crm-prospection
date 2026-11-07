import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client "service role" : contourne la RLS.
 * Uniquement pour les routes API appelées par n8n et les pages publiques (lien tracké, offre, formulaire).
 * Ne JAMAIS l'importer dans un composant client.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
