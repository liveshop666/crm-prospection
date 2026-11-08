import { NextResponse, type NextRequest } from "next/server";
import { apiError, checkApiKey } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };
const STATUSES = ["en_attente", "envoye", "en_cours", "termine", "erreur", "annule"];

/**
 * PATCH /api/n8n/tasks/:id — l'agent donne des nouvelles d'un ordre.
 * Body : { "status": "en_cours" | "termine" | "erreur", "summary": "25 plombiers trouvés à Caen, 18 avec email",
 *          "result": { "created": 25, "emails_sent": 0 }, "error": "..." }
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = checkApiKey(req); if (denied) return denied;
  try {
    const { id } = await params;
    const b = await req.json();
    const patch: Record<string, unknown> = {};
    if (STATUSES.includes(b.status)) patch.status = b.status;
    if (typeof b.summary === "string") patch.summary = b.summary.slice(0, 4000);
    if (b.result && typeof b.result === "object") patch.result = b.result;
    if (typeof b.error === "string") patch.error = b.error.slice(0, 2000);
    const db = createAdminClient();
    const { data, error } = await db.from("agent_tasks").update(patch).eq("id", id).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
    return NextResponse.json({ task: data });
  } catch (e) { return apiError(e); }
}

/** GET /api/n8n/tasks/:id — relire un ordre. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const denied = checkApiKey(req); if (denied) return denied;
  const { id } = await params;
  const { data } = await createAdminClient().from("agent_tasks").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  return NextResponse.json({ task: data });
}
