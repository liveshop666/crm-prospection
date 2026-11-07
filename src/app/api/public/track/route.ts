import { NextResponse, type NextRequest } from "next/server";
import { recordSiteEvent } from "@/lib/events";
import { createAdminClient } from "@/lib/supabase/admin";

const BOT_RE = /bot|crawl|spider|preview|headless|lighthouse|pingdom|monitor|curl|wget|python/i;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n).trim() || null : null);

/**
 * POST /api/public/track — visites et clics « Réserver un appel » envoyés par ton site
 * (via sa fonction /api/track, côté serveur).
 * Body : { type: "visite" | "clic_rdv", path, ref?, visitor?, referrer?, ua? }
 * Si TRACK_SECRET est défini dans Vercel, le header x-track-secret doit correspondre.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TRACK_SECRET;
  if (secret && req.headers.get("x-track-secret") !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const b = await req.json();
    if (!["visite", "clic_rdv"].includes(b.type)) return NextResponse.json({ ok: false }, { status: 400 });
    if (BOT_RE.test(String(b.ua ?? ""))) return NextResponse.json({ ok: true, bot: true });

    const db = createAdminClient();
    const ref = clip(b.ref, 32);
    let prospect: { id: string; company_name: string } | null = null;
    if (ref && /^[a-z0-9]{4,32}$/i.test(ref)) {
      const { data } = await db.from("prospects").select("id, company_name").eq("ref_slug", ref).maybeSingle();
      prospect = data;
    }
    await recordSiteEvent(db, {
      type: b.type, path: clip(b.path, 300), ref, visitor: clip(b.visitor, 40), referrer: clip(b.referrer, 200),
      prospect_id: prospect?.id ?? null, prospect_name: prospect?.company_name ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[track]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
