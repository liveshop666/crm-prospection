import type { ActivityType, OfferStatus, ProspectStatus } from "./types";

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
