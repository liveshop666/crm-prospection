import type { ActivityType, AgentTaskStatus, AgentTaskType, OfferStatus, PaymentStatus, ProspectStatus } from "./types";

export const STATUSES: { value: ProspectStatus; label: string; emoji: string; color: string }[] = [
  { value: "nouveau",       label: "Nouveau",        emoji: "🆕", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  { value: "contacte",      label: "Contacté",       emoji: "📨", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "a_visite",      label: "A visité",       emoji: "👀", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  { value: "chaud",         label: "Chaud",          emoji: "🔥", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  { value: "rdv",           label: "RDV",            emoji: "📅", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  { value: "offre_envoyee", label: "Offre envoyée",  emoji: "📄", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
  { value: "valide",        label: "Validé",         emoji: "✅", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  { value: "perdu",         label: "Perdu",          emoji: "❌", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
];

export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s])) as Record<
  ProspectStatus, (typeof STATUSES)[number]
>;

export const ACTIVITY_LABELS: Record<ActivityType, { label: string; emoji: string }> = {
  sms_sortant:       { label: "SMS envoyé",        emoji: "📤" },
  sms_entrant:       { label: "SMS reçu",          emoji: "💬" },
  email_sortant:     { label: "Email envoyé",      emoji: "✉️" },
  email_entrant:     { label: "Email reçu",        emoji: "📥" },
  clic_lien:         { label: "A cliqué sur ton lien", emoji: "👀" },
  formulaire:        { label: "Demande via ton site",  emoji: "📝" },
  rdv:               { label: "Rendez-vous",       emoji: "📅" },
  note:              { label: "Note",              emoji: "🗒️" },
  changement_statut: { label: "Statut modifié",    emoji: "🔄" },
  offre_envoyee:     { label: "Offre envoyée",     emoji: "📄" },
  offre_acceptee:    { label: "Offre acceptée",    emoji: "✅" },
  offre_refusee:     { label: "Offre refusée",     emoji: "🚫" },
  relance:           { label: "Relance",           emoji: "🔁" },
  stop:              { label: "STOP reçu",         emoji: "⛔" },
  demande_plateforme: { label: "Demande via une plateforme", emoji: "🧲" },
};

export const OFFER_STATUS: Record<OfferStatus, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  acceptee: "Acceptée ✅",
  refusee: "Refusée",
};

/** Ordre d'avancement : un événement automatique ne fait jamais reculer un prospect. */
export const STATUS_RANK: Record<ProspectStatus, number> = {
  nouveau: 0, contacte: 1, a_visite: 2, chaud: 3, rdv: 4, offre_envoyee: 5, valide: 6, perdu: -1,
};

/** Types de prestations vendues par SolveLab. */
export const SERVICES: { value: string; label: string; emoji: string }[] = [
  { value: "site_internet",   label: "Site internet",        emoji: "🌐" },
  { value: "automatisation",  label: "Automatisation / IA",  emoji: "⚙️" },
  { value: "outil_sur_mesure", label: "Outil sur mesure",    emoji: "🛠️" },
  { value: "pub_video",       label: "Pub vidéo",            emoji: "🎬" },
  { value: "maintenance",     label: "Maintenance / suivi",  emoji: "🔧" },
  { value: "autre",           label: "Autre",                emoji: "📦" },
];
export const serviceLabel = (v?: string | null) => {
  const s = SERVICES.find((x) => x.value === v);
  return s ? `${s.emoji} ${s.label}` : "Non précisé";
};

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  non_paye: "Pas encore payé",
  acompte: "Acompte reçu",
  paye: "Payé ✅",
};

/** D'où vient le client (champ `source` de la fiche). */
const SOURCES: Record<string, string> = {
  agent: "🤖 Agent de prospection",
  google_maps: "🤖 Agent de prospection",
  openstreetmap: "🤖 Agent de prospection",
  osm: "🤖 Agent de prospection",
  formulaire_site: "📝 Formulaire du site",
  site: "📝 Formulaire du site",
  rdv_site: "📅 RDV Cal.com",
  entrant: "📥 Email reçu",
  email: "📥 Email reçu",
  manuel: "✍️ Ajout manuel",
  codeur: "🧲 Codeur",
  fiverr: "🧲 Fiverr",
  malt: "🧲 Malt",
  comeup: "🧲 ComeUp",
  linkedin: "💼 LinkedIn",
};
export const sourceLabel = (v?: string | null) =>
  !v ? "Inconnue" : SOURCES[v] ?? (PLATFORMS[v] ? `🧲 ${PLATFORMS[v]}` : v);

/** Plateformes où tu proposes tes services (le lien « Répondre sur … »). */
export const PLATFORMS: Record<string, string> = {
  codeur: "Codeur", fiverr: "Fiverr", malt: "Malt", comeup: "ComeUp", "5euros": "5euros",
  upwork: "Upwork", freelance_com: "Freelance.com", cremedelacreme: "Crème de la Crème", linkedin: "LinkedIn",
};
export const platformName = (v?: string | null) => (v && PLATFORMS[v]) || (v ? v.charAt(0).toUpperCase() + v.slice(1) : "la plateforme");

export const TASK_TYPES: Record<AgentTaskType, { label: string; emoji: string }> = {
  recherche: { label: "Recherche de prospects", emoji: "🔎" },
  envoi:     { label: "Premiers emails",        emoji: "✉️" },
  relances:  { label: "Relances",               emoji: "🔁" },
  consigne:  { label: "Consigne libre",         emoji: "💬" },
};

export const TASK_STATUS: Record<AgentTaskStatus, { label: string; color: string }> = {
  en_attente: { label: "En attente",        color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  envoye:     { label: "Transmis à l'agent", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  en_cours:   { label: "En cours…",         color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  termine:    { label: "Terminé ✅",        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  erreur:     { label: "Erreur",            color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  annule:     { label: "Annulé",            color: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};
