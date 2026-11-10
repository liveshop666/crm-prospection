/**
 * Filtre anti-spam simple (sans IA) pour le formulaire du site.
 * Il ne supprime jamais rien tout seul :
 *  - spam évident  → onglet « Spam » de Messages (gardé 30 jours, aucune fiche créée)
 *  - doute         → onglet « À vérifier »
 *  - sinon         → demande normale (fiche + « Nouveau à voir »)
 * Le tri par IA des emails est fait dans n8n (workflow 07).
 */
const STRONG = /\b(casino|viagra|cialis|porn|xxx|bitcoin|crypto(currency)?|forex|loan offer|escort)\b/i;
const SEO_PITCH = /\b(seo services?|backlinks?|guest posts?|first page of google|rank (your|higher)|link building|web traffic|increase (your )?traffic|dear (sir|madam)|we are a (leading|team))\b/i;
const FOREIGN_SCRIPT = /[Ѐ-ӿ一-鿿؀-ۿ]/; // cyrillique, chinois, arabe
const URL_G = /(https?:\/\/|www\.)\S+/gi;
const URL_1 = /(https?:\/\/|www\.)\S+/i;
const DISPOSABLE = /@(mailinator|yopmail|guerrillamail|10minutemail|tempmail|trashmail|sharklasers)\./i;
/** Terminaisons très utilisées par les envois de spam. */
const SPAMMY_TLD = /\.(my\.id|xyz|top|click|icu|buzz|cfd|sbs|cyou|rest|su|ru|cn|work|loan|gq|tk|ml|cf)$/i;
/** « la mission est précisée ici : https://… », « cliquez ici »… */
const CLICK_BAIT = /(\bici\s*:?\s*(https?:\/\/|www\.)|cliquez|click here|voir (le )?d[ée]tail|plus d['’]infos? ici|t[ée]l[ée]charg)/i;
const GREETING = /\b(bonjour|bonsoir|salut|hello|hi|madame|monsieur|merci|cordialement|cdlt|bien [àa] vous|bonne journ[ée]e)\b/i;

export function spamReasons(f: { name?: string | null; company?: string | null; email?: string | null; message?: string | null }): string[] {
  const message = f.message ?? "";
  const text = `${f.name ?? ""} ${f.company ?? ""} ${message}`;
  const reasons: string[] = [];
  if (STRONG.test(text)) reasons.push("mots typiques du spam");
  if (FOREIGN_SCRIPT.test(text)) reasons.push("alphabet étranger");
  if (SEO_PITCH.test(text)) reasons.push("démarchage SEO / pub");
  if ((message.match(URL_G) ?? []).length > 2) reasons.push("beaucoup de liens");
  else if (URL_1.test(message)) reasons.push("lien dans le message");
  if (URL_1.test(`${f.name ?? ""} ${f.company ?? ""}`)) reasons.push("lien dans le nom");
  if (CLICK_BAIT.test(message)) reasons.push("pousse à cliquer sur un lien");
  if (f.email && DISPOSABLE.test(f.email)) reasons.push("adresse email jetable");
  const email = (f.email ?? "").toLowerCase();
  const [local = "", domain = ""] = email.split("@");
  if (domain && SPAMMY_TLD.test(domain)) reasons.push("email à terminaison suspecte");
  if (/\d{3,}$/.test(local) && !/(gmail|outlook|hotmail|yahoo|orange|free|sfr|laposte|wanadoo|icloud)\./.test(domain)) reasons.push("email avec une suite de chiffres");
  if (message.trim().length > 30 && !GREETING.test(message)) reasons.push("aucune formule de politesse");
  return reasons;
}

const STRONG_REASONS = ["mots typiques du spam", "alphabet étranger", "adresse email jetable"];

/**
 * « spam » : un signal fort, ou au moins 3 signaux faibles.
 * « a_verifier » : 2 signaux faibles.
 * « ok » : 0 ou 1 signal faible (un client qui colle l'adresse de son site reste accepté).
 */
export function spamVerdict(reasons: string[]): "ok" | "a_verifier" | "spam" {
  if (reasons.some((r) => STRONG_REASONS.includes(r)) || reasons.length >= 3) return "spam";
  return reasons.length >= 2 ? "a_verifier" : "ok";
}

/** Gardé pour compatibilité : douteux ou spam. */
export const isSuspicious = (reasons: string[]) => spamVerdict(reasons) !== "ok";
