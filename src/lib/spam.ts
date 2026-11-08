/**
 * Filtre anti-spam simple (sans IA) pour le formulaire du site.
 * Il ne supprime jamais rien : une demande douteuse part dans Messages → « À vérifier ».
 * Le tri par IA des emails est fait dans n8n (workflow 07).
 */
const STRONG = /\b(casino|viagra|cialis|porn|xxx|bitcoin|crypto(currency)?|forex|loan offer|escort)\b/i;
const SEO_PITCH = /\b(seo services?|backlinks?|guest posts?|first page of google|rank (your|higher)|link building|web traffic|increase (your )?traffic|dear (sir|madam)|we are a (leading|team))\b/i;
const FOREIGN_SCRIPT = /[\u0400-\u04FF\u4E00-\u9FFF\u0600-\u06FF]/; // cyrillique, chinois, arabe
const URL_G = /(https?:\/\/|www\.)\S+/gi;
const URL_1 = /(https?:\/\/|www\.)\S+/i;
const DISPOSABLE = /@(mailinator|yopmail|guerrillamail|10minutemail|tempmail|trashmail|sharklasers)\./i;

export function spamReasons(f: { name?: string | null; company?: string | null; email?: string | null; message?: string | null }): string[] {
  const text = `${f.name ?? ""} ${f.company ?? ""} ${f.message ?? ""}`;
  const reasons: string[] = [];
  if (STRONG.test(text)) reasons.push("mots typiques du spam");
  if (FOREIGN_SCRIPT.test(text)) reasons.push("alphabet étranger");
  if (SEO_PITCH.test(text)) reasons.push("démarchage SEO / pub");
  if ((f.message?.match(URL_G) ?? []).length > 2) reasons.push("beaucoup de liens");
  if (URL_1.test(`${f.name ?? ""} ${f.company ?? ""}`)) reasons.push("lien dans le nom");
  if (f.email && DISPOSABLE.test(f.email)) reasons.push("adresse email jetable");
  return reasons;
}

/** Douteux = un signal fort, ou deux signaux faibles. */
export function isSuspicious(reasons: string[]) {
  const strong = reasons.some((r) => ["mots typiques du spam", "alphabet étranger", "adresse email jetable"].includes(r));
  return strong || reasons.length >= 2;
}
