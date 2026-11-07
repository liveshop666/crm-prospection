import { NextResponse, type NextRequest } from "next/server";
import { checkApiKey } from "@/lib/api";
import { getStats } from "@/lib/stats";
import { createAdminClient } from "@/lib/supabase/admin";

/** GET /api/n8n/stats — chiffres du jour / semaine (pour un récap quotidien envoyé par n8n). */
export async function GET(req: NextRequest) {
  const denied = checkApiKey(req); if (denied) return denied;
  return NextResponse.json(await getStats(createAdminClient()));
}
