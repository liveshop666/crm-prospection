import { NextResponse, type NextRequest } from "next/server";
import { apiError, checkApiKey } from "@/lib/api";
import { findProspect, logActivity, upsertProspect } from "@/lib/crm";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActivityType, ProspectStatus } from "@/lib/types";

const TYPES: ActivityType[] = [
  "sms_sortant", "sms_entrant", "email_sortant", "email_entrant", "clic_lien", "formulaire",
  "rdv", "note", "changement_statut", "offre_envoyee", "offre_acceptee", "offre_refusee", "relance", "stop",
];

/**
 * POST /api/n8n/activities — n8n enregistre un événement dans la timeline.
 * Body :
 * {
 *   "prospect_id" | "ref" | "phone" | "email": "...",   // pour retrouver le prospect
 *   "type": "sms_sortant" | "sms_entrant" | "email_entrant" | "rdv" | ...,
 *   "content": "texte du message",
 *   "metadata": { ... },                                 // libre (id message, sujet email, date RDV...)
 *   "status": "chaud",                                   // optionnel : classement IA
 *   "prospect": { "ai_summary": "...", "interest": "site vitrine", "next_followup_at": "..." }
 * }
 * Un message entrant d'un numéro/email inconnu crée automatiquement un prospect.
 */
export async function POST(req: NextRequest) {
  const denied = checkApiKey(req); if (denied) return denied;
  try {
    const b = await req.json();
    if (!TYPES.includes(b.type)) return NextResponse.json({ error: `type invalide. Valeurs : ${TYPES.join(", ")}` }, { status: 400 });
    const db = createAdminClient();
    let prospect = await findProspect(db, { id: b.prospect_id, ref: b.ref, phone: b.phone, email: b.email });
    if (!prospect) {
      if (!["sms_entrant", "email_entrant", "rdv", "formulaire"].includes(b.type) || (!b.phone && !b.email)) {
        return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
      }
      ({ prospect } = await upsertProspect(db, {
        company_name: b.prospect?.company_name ?? b.name ?? b.email ?? b.phone,
        phone: b.phone, email: b.email, source: "entrant", ...(b.prospect ?? {}),
      }));
    }
    const result = await logActivity(db, {
      prospect, type: b.type, content: b.content, metadata: b.metadata,
      status: b.status as ProspectStatus | undefined, prospectPatch: b.prospect,
      created_by: b.created_by ?? "n8n", notify: b.notify,
    });
    return NextResponse.json(result);
  } catch (e) { return apiError(e); }
}
