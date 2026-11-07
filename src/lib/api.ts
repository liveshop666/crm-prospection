import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/** Vérifie la clé API envoyée par n8n (header `x-api-key` ou `Authorization: Bearer`). */
export function checkApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.CRM_API_KEY;
  if (!expected) return NextResponse.json({ error: "CRM_API_KEY non configurée" }, { status: 500 });
  const given = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }
  return null;
}

export function apiError(e: unknown, status = 400) {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  return NextResponse.json({ error: msg }, { status });
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = (process.env.PUBLIC_SITE_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && (allowed.length === 0 || allowed.includes(origin));
  return {
    "access-control-allow-origin": ok ? origin! : allowed[0] ?? "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "origin",
  };
}
