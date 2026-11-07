import { NextResponse, type NextRequest } from "next/server";
import { apiError, checkApiKey } from "@/lib/api";
import { trackingUrl, upsertProspect } from "@/lib/crm";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Prospect } from "@/lib/types";

const withLink = (p: Prospect) => ({ ...p, tracking_url: trackingUrl(p.ref_slug) });

/**
 * GET /api/n8n/prospects — liste pour n8n.
 *   ?status=nouveau          filtrer par statut (plusieurs : nouveau,contacte)
 *   ?channel=sms             filtrer par canal
 *   ?due_followup=true       uniquement ceux dont la relance est due
 *   ?limit=20
 * Les prospects "STOP" (opted_out) ne sont JAMAIS renvoyés.
 */
export async function GET(req: NextRequest) {
  const denied = checkApiKey(req); if (denied) return denied;
  const sp = req.nextUrl.searchParams;
  const db = createAdminClient();
  let q = db.from("prospects").select("*").eq("opted_out", false);
  const status = sp.get("status"); if (status) q = q.in("status", status.split(","));
  const channel = sp.get("channel"); if (channel) q = q.eq("channel", channel);
  if (sp.get("due_followup") === "true") q = q.lte("next_followup_at", new Date().toISOString());
  q = q.order("score", { ascending: false, nullsFirst: false }).order("created_at").limit(Math.min(Number(sp.get("limit") ?? 50), 500));
  const { data, error } = await q;
  if (error) return apiError(error, 500);
  return NextResponse.json({ prospects: (data as Prospect[]).map(withLink) });
}

/**
 * POST /api/n8n/prospects — l'agent ajoute un ou plusieurs prospects.
 * Body : un objet prospect, ou { prospects: [...] }. Dédoublonné par téléphone / email / SIRET.
 */
export async function POST(req: NextRequest) {
  const denied = checkApiKey(req); if (denied) return denied;
  try {
    const body = await req.json();
    const list: Record<string, unknown>[] = Array.isArray(body) ? body : Array.isArray(body?.prospects) ? body.prospects : [body];
    const db = createAdminClient();
    const results = [];
    for (const item of list) {
      try {
        const { prospect, created } = await upsertProspect(db, item);
        results.push({ ok: true, created, prospect: withLink(prospect) });
      } catch (e) {
        results.push({ ok: false, error: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e), input: item });
      }
    }
    return NextResponse.json({
      created: results.filter((r) => r.ok && r.created).length,
      updated: results.filter((r) => r.ok && !r.created).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  } catch (e) { return apiError(e); }
}
