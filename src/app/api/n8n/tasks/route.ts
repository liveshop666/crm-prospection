import { NextResponse, type NextRequest } from "next/server";
import { apiError, checkApiKey } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/n8n/tasks?status=en_attente,envoye&limit=10
 * Les ordres donnés depuis la page Agent du CRM. L'agent les prend, puis répond avec PATCH /api/n8n/tasks/:id.
 * Renvoie aussi `agent_paused` : si c'est vrai, l'agent ne doit rien faire.
 */
export async function GET(req: NextRequest) {
  const denied = checkApiKey(req); if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const db = createAdminClient();
  let q = db.from("agent_tasks").select("*").order("created_at", { ascending: true }).limit(Math.min(Number(sp.get("limit") ?? 10), 100));
  const st = sp.get("status") ?? "en_attente,envoye";
  q = q.in("status", st.split(","));
  const type = sp.get("type"); if (type) q = q.in("type", type.split(","));
  const [{ data, error }, settings] = await Promise.all([q, getSettings(db)]);
  if (error) return apiError(error, 500);
  return NextResponse.json({ agent_paused: settings.agent_paused, tasks: data });
}
