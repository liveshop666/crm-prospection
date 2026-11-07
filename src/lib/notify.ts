import "server-only";

export type NotifyEvent =
  | "prospect.chaud"
  | "prospect.formulaire"
  | "prospect.rdv"
  | "prospect.reponse"
  | "offre.acceptee"
  | "offre.refusee";

/**
 * Envoie un événement à n8n (webhook), qui se charge de la notification
 * Facultatif : prévient n8n d'un événement important (pour un traitement en plus).
 * Ne bloque jamais le CRM si n8n est down.
 */
export async function notifyN8n(event: NotifyEvent, payload: Record<string, unknown>) {
  const url = process.env.N8N_NOTIFY_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET ? { "x-crm-secret": process.env.N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({ event, at: new Date().toISOString(), crm_url: process.env.NEXT_PUBLIC_APP_URL, ...payload }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("[notifyN8n] échec", event, e);
  }
}
