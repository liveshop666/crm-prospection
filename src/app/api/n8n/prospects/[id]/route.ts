import { NextResponse, type NextRequest } from "next/server";
import { apiError, checkApiKey } from "@/lib/api";
import { findProspect, logActivity, pickProspectFields, trackingUrl } from "@/lib/crm";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProspectStatus } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/n8n/prospects/:id — fiche + 30 dernières activités (utile pour donner le contexte à l'IA). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const denied = checkApiKey(req); if (denied) return denied;
  const { id } = await params;
  const db = createAdminClient();
  const prospect = await findProspect(db, { id, ref: id });
  if (!prospect) return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
  const { data: activities } = await db.from("activities").select("*").eq("prospect_id", prospect.id).order("created_at", { ascending: false }).limit(30);
  return NextResponse.json({ prospect: { ...prospect, tracking_url: trackingUrl(prospect.ref_slug) }, activities });
}

/** PATCH /api/n8n/prospects/:id — met à jour des champs et/ou le statut. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = checkApiKey(req); if (denied) return denied;
  try {
    const { id } = await params;
    const body = await req.json();
    const db = createAdminClient();
    const prospect = await findProspect(db, { id, ref: id });
    if (!prospect) return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });

    const patch = pickProspectFields(body);
    if (typeof body.opted_out === "boolean") patch.opted_out = body.opted_out;
    let current = prospect;
    if (Object.keys(patch).length) {
      const { data, error } = await db.from("prospects").update(patch).eq("id", prospect.id).select().single();
      if (error) throw error;
      current = data;
    }
    if (body.status && body.status !== current.status) {
      const r = await logActivity(db, {
        prospect: current, type: "changement_statut", status: body.status as ProspectStatus,
        content: body.reason ?? null, created_by: "n8n",
      });
      current = r.prospect;
    }
    return NextResponse.json({ prospect: current });
  } catch (e) { return apiError(e); }
}
