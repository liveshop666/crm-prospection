import { NextResponse, type NextRequest } from "next/server";
import { checkApiKey } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/n8n/settings — réglages choisis dans la page Agent du CRM :
 * { agent_paused, target_sectors, target_cities, daily_email_limit, sender_first_name, signature }
 * L'agent les lit chaque matin : tu changes les métiers / villes dans le CRM, pas dans n8n.
 */
export async function GET(req: NextRequest) {
  const denied = checkApiKey(req); if (denied) return denied;
  return NextResponse.json(await getSettings(createAdminClient()));
}
