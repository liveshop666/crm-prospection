/**
 * Garde uniquement https://xxxx.supabase.co, même si on a collé
 * l'URL avec /rest/v1/ ou un slash en trop à la fin.
 */
export function supabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  try { return new URL(raw).origin; } catch { return raw; }
}
