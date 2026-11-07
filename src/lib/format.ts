const tz = "Europe/Paris";

export const euro = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { timeZone: tz, dateStyle: "short", timeStyle: "short" });

export const date = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: tz, dateStyle: "medium" });

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return date(iso);
}

/** Normalise un numéro français en E.164 (+33...). */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("0") && p.length === 10) p = "+33" + p.slice(1);
  if (/^[1-9]\d{8}$/.test(p)) p = "+33" + p;
  return p || null;
}

export const isMobileFR = (p?: string | null) => !!p && /^\+33[67]\d{8}$/.test(p);
