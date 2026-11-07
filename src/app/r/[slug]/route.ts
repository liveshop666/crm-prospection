import { NextResponse, type NextRequest } from "next/server";
import { logActivity } from "@/lib/crm";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Prospect } from "@/lib/types";

// Les aperçus de liens (iMessage, WhatsApp, antivirus...) ne comptent pas comme un vrai clic
const BOT_RE = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slack|telegram|discord|skype|curl|wget|python|headless/i;

/** GET /r/:slug — lien personnalisé mis dans le SMS / email. Enregistre le clic puis redirige vers ton site. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = process.env.PUBLIC_SITE_URL ?? "https://example.com";
  const target = new URL(site);
  target.searchParams.set("ref", slug);

  try {
    const db = createAdminClient();
    const { data } = await db.from("prospects").select("*").eq("ref_slug", slug).maybeSingle();
    const ua = req.headers.get("user-agent") ?? "";
    if (data && !BOT_RE.test(ua)) {
      const p = data as Prospect;
      await db.from("prospects").update({ link_clicks: p.link_clicks + 1 }).eq("id", p.id);
      // 1 seule activité "clic" par tranche de 30 min pour ne pas polluer la timeline
      const { count } = await db.from("activities").select("id", { count: "exact", head: true })
        .eq("prospect_id", p.id).eq("type", "clic_lien").gte("created_at", new Date(Date.now() - 30 * 60e3).toISOString());
      if (!count) {
        await logActivity(db, {
          prospect: p, type: "clic_lien", content: `A ouvert ton site (clic n°${p.link_clicks + 1})`,
          metadata: { user_agent: ua.slice(0, 200) }, created_by: "site", notify: false,
        });
      }
    }
  } catch (e) {
    console.error("[r/slug]", e); // la redirection doit toujours marcher
  }
  return NextResponse.redirect(target, 302);
}
