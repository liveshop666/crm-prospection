import { createServerClient } from "@supabase/ssr";
import { supabaseUrl } from "@/lib/supabase/url";
import { cookies } from "next/headers";

/** Client Supabase côté serveur, avec la session de l'utilisateur connecté (respecte la RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // appelé depuis un Server Component : le middleware rafraîchit la session
          }
        },
      },
    },
  );
}
