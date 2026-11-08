import "server-only";

/**
 * Envoie un ordre du CRM vers un workflow n8n (nœud « Webhook »).
 * Le webhook est protégé par le même header que l'API : x-api-key = CRM_API_KEY.
 *
 * - N8N_MAIL_WEBHOOK_URL  : workflow « 08 – Envoi depuis le CRM » (emails que tu écris dans le CRM)
 * - N8N_AGENT_WEBHOOK_URL : workflow de ton agent de prospection (ordres de la page Agent)
 *
 * Si l'adresse n'est pas configurée, rien n'est perdu : l'ordre reste « en attente »
 * dans le CRM et n8n peut venir le chercher (GET /api/n8n/messages?send_status=a_envoyer
 * ou GET /api/n8n/tasks?status=en_attente).
 */
export async function callN8n(kind: "mail" | "agent", payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string; configured: boolean }> {
  const url = (kind === "mail" ? process.env.N8N_MAIL_WEBHOOK_URL : process.env.N8N_AGENT_WEBHOOK_URL)?.trim();
  if (!url) return { ok: false, configured: false, error: "Adresse du webhook n8n non configurée" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.CRM_API_KEY ?? "" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, configured: true, error: `n8n a répondu ${res.status}` };
    return { ok: true, configured: true };
  } catch (e) {
    return { ok: false, configured: true, error: e instanceof Error ? e.message : String(e) };
  }
}
