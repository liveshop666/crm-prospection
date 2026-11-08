import { NextResponse, type NextRequest } from "next/server";
import { apiError, checkApiKey } from "@/lib/api";
import { ingestMessage, type IncomingMessage } from "@/lib/messages";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/n8n/messages — n8n envoie un email reçu dans ta boîte pro, déjà trié par l'IA.
 * Un message seul, ou plusieurs avec { "messages": [ ... ] }. Dédoublonné par `external_id` (id Gmail).
 * Détail des champs : docs/API-N8N.md § 6.
 */
export async function POST(req: NextRequest) {
  const denied = checkApiKey(req); if (denied) return denied;
  try {
    const body = await req.json();
    const list: IncomingMessage[] = Array.isArray(body) ? body : Array.isArray(body?.messages) ? body.messages : [body];
    const db = createAdminClient();
    const results = [];
    for (const item of list.slice(0, 100)) {
      try {
        const r = await ingestMessage(db, item);
        results.push({ ok: true, duplicate: r.duplicate, message_id: r.message.id, verdict: r.message.verdict, category: r.message.category, prospect_id: r.prospect?.id ?? r.message.prospect_id, prospect_created: r.created });
      } catch (e) {
        results.push({ ok: false, error: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e) });
      }
    }
    // le spam est gardé 30 jours (pour rattraper une erreur du filtre), puis effacé
    await db.from("messages").delete().eq("verdict", "spam").lt("received_at", new Date(Date.now() - 30 * 864e5).toISOString());
    return NextResponse.json(list.length === 1 ? results[0] : { results });
  } catch (e) { return apiError(e); }
}

/**
 * GET /api/n8n/messages?send_status=a_envoyer&limit=20
 * Emails écrits dans le CRM qui attendent d'être envoyés (si le webhook n'a pas pu être appelé).
 */
export async function GET(req: NextRequest) {
  const denied = checkApiKey(req); if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const db = createAdminClient();
  let q = db.from("messages").select("*").order("created_at", { ascending: true }).limit(Math.min(Number(sp.get("limit") ?? 20), 100));
  const st = sp.get("send_status"); if (st) q = q.eq("send_status", st);
  const dir = sp.get("direction"); if (dir) q = q.eq("direction", dir);
  const { data, error } = await q;
  if (error) return apiError(error, 500);
  return NextResponse.json({ messages: data });
}
