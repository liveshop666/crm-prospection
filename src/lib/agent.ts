/** Agent de prospection : types et libellés partagés par l'espace « Agent » du CRM. */

export type Niveau = "info" | "succes" | "alerte" | "erreur";

export interface AgentEvent {
  id: number;
  created_at: string;
  entreprise_id: string | null;
  etape: string;
  phrase: string;
  niveau: Niveau;
}

export interface AgentEntreprise {
  id: string;
  nom: string;
  metier: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  site: string | null;
  statut: string;
  score: number | null;
  score_raison: string | null;
  besoin_principal: string | null;
  besoins: { code: string; raison: string; priorite: number }[];
  offre_visee: string | null;
  canal: string | null;
  linkedin_url: string | null;
  prospect_id: string | null;
  source: string;
}

export interface AgentMessage {
  id: string;
  created_at: string;
  entreprise_id: string;
  canal: "email" | "sms" | "appel" | "linkedin";
  etape: number;
  objet: string | null;
  texte_propose: string;
  texte_valide: string | null;
  statut: string;
  controles: { remarques?: string[]; mots?: number; caracteres?: number };
  agent_entreprises?: AgentEntreprise;
}

export interface Tableau {
  jour: Record<string, number>;
  mois: Record<string, number> & { besoins?: Record<string, number> };
  entonnoir: Record<string, number>;
  statuts: Record<string, number> | null;
  prets_pour_demain: number;
  a_valider: number;
  prochain_passage: string | null;
  budget: null | {
    jour: string; executions_mois: number; budget_jour: number; messages_demain: number; niveau: string;
    epuisement_prevu: string | null; source_compteur: string; details: { pct_utilise?: number; projection_fin_mois?: number };
  };
  config: {
    actif: boolean; pause: boolean; simulation: boolean; zones_actives: number[]; seuil_score: number;
    envoi_auto: boolean; validation_obligatoire: boolean; horaires: { jours: number[]; plages: [string, string][] };
    email_expediteur: string | null; alert_email: string | null; lien_desinscription: string | null; quota_mensuel: number;
    test_demande: { entreprise_id: string } | null;
    sms_stop?: "lien" | "brevo";
  };
  indicateurs: { part_sans_site: number | null; taux_desinscription: number | null };
}

/** Code couleur constant : bleu = recherche, vert = envoyé, orange = à surveiller, rouge = erreur ou STOP. */
export const NIVEAU: Record<Niveau, { pastille: string; texte: string; icone: string }> = {
  info: { pastille: "bg-sky-500", texte: "text-sky-600 dark:text-sky-300", icone: "🔎" },
  succes: { pastille: "bg-emerald-500", texte: "text-emerald-600 dark:text-emerald-300", icone: "✅" },
  alerte: { pastille: "bg-amber-500", texte: "text-amber-700 dark:text-amber-300", icone: "⚠️" },
  erreur: { pastille: "bg-rose-500", texte: "text-rose-600 dark:text-rose-300", icone: "⛔" },
};

export const STATUTS_AGENT: Record<string, string> = {
  a_verifier: "À vérifier", a_verifier_manuellement: "Doute : à vérifier à la main", qualifie: "Qualifiée",
  a_appeler: "À appeler", sans_besoin_visible: "Sans besoin visible", message_pret: "Message prêt",
  contacte: "Contactée", relance_1: "Relance 1", relance_2: "Relance 2", chaud: "🔥 Intéressée",
  pas_maintenant: "Pas maintenant", refus: "Refus", stop: "STOP", sans_reponse: "Sans réponse", exclu: "Exclue",
};

export const BESOINS: Record<string, string> = {
  pas_de_site: "Pas de site", site_date: "Site daté", site_invisible: "Site invisible sur Google",
  pas_de_contact_rdv: "Ni contact ni RDV en ligne", automatisation_liste: "Automatisation repérée", pas_de_video: "Pas de vidéo",
};

export const OFFRES: Record<string, string> = {
  creation_site: "Création de site / SEO", automatisation: "Automatisation & IA", outils_sur_mesure: "Outils sur mesure",
  pub_video: "Pub vidéo & marketing", audit: "Audit gratuit",
};

export const ZONES: Record<number, string> = { 1: "Calvados", 2: "Manche et Orne", 3: "Eure et Seine-Maritime" };

export const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
