import { NextResponse, type NextRequest } from "next/server";
import { corsHeaders } from "@/lib/api";
import { findProspect, logActivity, upsertProspect } from "@/lib/crm";
import { createAdminClient } from "@/lib/supabase/admin";

/** Redirection après envoi du formulaire : uniquement vers ton propre site (pas de redirection ouverte). */
function isAllowedRedirect(url: string) {
  try {
    const origin = new URL(url).origin;
    const allowed = (process.env.PUBLIC_SITE_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (process.env.PUBLIC_SITE_URL) allowed.push(new URL(process.env.PUBLIC_SITE_URL).origin);
    return allowed.includes(origin);
  } catch { return false; }
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

/**
 * POST /api/public/lead — formulaire de contact de TON site.
 * Body (JSON ou form-data) : ref?, name, company, email, phone, interest, budget, message, hp (anti-spam, laisser vide)
 * Le paramètre `ref` (présent dans l'URL quand le prospect arrive depuis le SMS) relie la demande à sa fiche.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  const allowedOrigins = (process.env.PUBLIC_SITE_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Origine non autorisée" }, { status: 403, headers });
  }
  try {
    const ct = req.headers.get("content-type") ?? "";
    const b: Record<string, string> = ct.includes("application/json")
      ? await req.json()
      : Object.fromEntries([...(await req.formData()).entries()].map(([k, v]) => [k, String(v)]));

    if (b.hp) return NextResponse.json({ ok: true }, { headers }); // robot de spam
    if (!b.email && !b.phone) return NextResponse.json({ error: "Email ou téléphone requis" }, { status: 400, headers });
    const clip = (s?: string, n = 2000) => (s ?? "").toString().slice(0, n).trim() || null;

    const db = createAdminClient();
    let prospect = await findProspect(db, { ref: clip(b.ref, 32) ?? undefined, phone: clip(b.phone, 30), email: clip(b.email, 200) });
    if (!prospect) {
      ({ prospect } = await upsertProspect(db, {
        company_name: clip(b.company, 200) ?? clip(b.name, 200) ?? clip(b.email, 200),
        contact_name: clip(b.name, 200), email: clip(b.email, 200), phone: clip(b.phone, 30), source: "formulaire_site",
      }));
    } else {
      // complète la fiche avec les infos données par le client
      const fill: Record<string, unknown> = {};
      if (!prospect.contact_name && b.name) fill.contact_name = clip(b.name, 200);
      if (!prospect.email && b.email) fill.email = clip(b.email, 200)?.toLowerCase();
      if (!prospect.phone && b.phone) fill.phone = clip(b.phone, 30);
      if (Object.keys(fill).length) {
        const { data } = await db.from("prospects").update(fill).eq("id", prospect.id).select().single();
        if (data) prospect = data;
      }
    }

    const lines = [
      b.interest && `Besoin : ${clip(b.interest, 200)}`,
      b.budget && `Budget : ${clip(b.budget, 100)}`,
      b.message && clip(b.message),
    ].filter(Boolean);

    await logActivity(db, {
      prospect: prospect!, type: "formulaire", content: lines.join("\n") || "Demande de contact",
      metadata: { name: b.name, company: b.company, email: b.email, phone: b.phone, interest: b.interest, budget: b.budget, page: req.headers.get("referer") },
      prospectPatch: b.interest ? { interest: clip(b.interest, 200) } : undefined,
      created_by: "site",
    });

    if (b.redirect && isAllowedRedirect(b.redirect)) return NextResponse.redirect(b.redirect, 303);
    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    console.error("[public/lead]", e);
    return NextResponse.json({ error: "Erreur, réessayez plus tard." }, { status: 500, headers });
  }
}
