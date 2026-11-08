import { NextResponse, type NextRequest } from "next/server";
import { apiError, checkApiKey } from "@/lib/api";
import { findProspect, logActivity } from "@/lib/crm";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/n8n/messages/:id — n8n confirme l'envoi d'un email écrit dans le CRM.
 * Body : { "send_status": "envoye" | "erreur", "external_id": "id Gmail", "thread_id": "...", "error": "..." }
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = checkApiKey(req); if (denied) return denied;
  try {
    const { id } = await params;
    const b = await req.json();
    const patch: Record<string, unknown> = {};
    if (["a_envoyer", "envoye", "erreur"].includes(b.send_status)) patch.send_status = b.send_status;
    if (typeof b.external_id === "string" && b.external_id) patch.external_id = b.external_id.slice(0, 300);
    if (typeof b.thread_id === "string" && b.thread_id) patch.thread_id = b.thread_id.slice(0, 300);
    if (b.send_status === "envoye") { patch.error = null; patch.received_at = new Date().toISOString(); }
    if (typeof b.error === "string") patch.error = b.error.slice(0, 1000);
    const db = createAdminClient();
    const { data: before } = await db.from("messages").select("send_status").eq("id", id).maybeSingle();
    const { data, error } = await db.from("messages").update(patch).eq("id", id).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Message introuvable" }, { status: 404 });

    // email bien parti : on l'ajoute à l'historique de la fiche (une seule fois)
    if (data.direction === "sortant" && data.send_status === "envoye" && before?.send_status !== "envoye" && data.prospect_id) {
      const prospect = await findProspect(db, { id: data.prospect_id });
      if (prospect) {
        await logActivity(db, {
          prospect, type: "email_sortant", content: data.body?.slice(0, 3000) ?? null,
          metadata: { subject: data.subject, message_id: data.id }, created_by: "moi",
        });
      }
    }
    return NextResponse.json({ message: data });
  } catch (e) { return apiError(e); }
}
