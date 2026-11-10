export type ProspectStatus =
  | "nouveau" | "contacte" | "a_visite" | "chaud" | "rdv" | "offre_envoyee" | "valide" | "perdu";

export type ActivityType =
  | "sms_sortant" | "sms_entrant" | "email_sortant" | "email_entrant"
  | "clic_lien" | "formulaire" | "rdv" | "note" | "changement_statut"
  | "offre_envoyee" | "offre_acceptee" | "offre_refusee" | "relance" | "stop"
  | "demande_plateforme";

export type OfferStatus = "brouillon" | "envoyee" | "acceptee" | "refusee";

export interface Prospect {
  id: string;
  created_at: string;
  updated_at: string;
  company_name: string;
  contact_name: string | null;
  sector: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  siret: string | null;
  size: "tpe" | "pme" | "grande" | null;
  source: string | null;
  channel: "sms" | "email" | "autre" | null;
  status: ProspectStatus;
  score: number | null;
  interest: string | null;
  ai_summary: string | null;
  tags: string[];
  ref_slug: string;
  link_clicks: number;
  opted_out: boolean;
  last_contact_at: string | null;
  next_followup_at: string | null;
  is_unread: boolean;
}

export interface Activity {
  id: string;
  created_at: string;
  prospect_id: string;
  type: ActivityType;
  content: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
}

export interface Offer {
  id: string;
  created_at: string;
  prospect_id: string;
  title: string;
  description: string | null;
  amount_cents: number;
  status: OfferStatus;
  public_token: string;
  sent_at: string | null;
  answered_at: string | null;
  service_type: string | null;
  monthly_cents: number;
  payment_status: PaymentStatus;
  paid_cents: number;
  paid_at: string | null;
  avis_demande_at?: string | null;
}

export type PaymentStatus = "non_paye" | "acompte" | "paye";

export type MessageCategory = "client" | "plateforme" | "autre";
export type MessageVerdict = "ok" | "a_verifier" | "spam";

export interface Message {
  id: string;
  created_at: string;
  received_at: string;
  prospect_id: string | null;
  direction: "entrant" | "sortant";
  source: string;
  category: MessageCategory;
  verdict: MessageVerdict;
  from_email: string | null;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  body: string | null;
  ai_summary: string | null;
  thread_id: string | null;
  external_id: string | null;
  platform_url: string | null;
  is_read: boolean;
  send_status: "a_envoyer" | "envoye" | "erreur" | null;
  error: string | null;
  metadata: Record<string, unknown>;
}

export type AgentTaskType = "recherche" | "envoi" | "relances" | "consigne";
export type AgentTaskStatus = "en_attente" | "envoye" | "en_cours" | "termine" | "erreur" | "annule";

export interface AgentTask {
  id: string;
  created_at: string;
  updated_at: string;
  type: AgentTaskType;
  params: Record<string, unknown>;
  status: AgentTaskStatus;
  summary: string | null;
  result: Record<string, unknown>;
  error: string | null;
}

export interface Subscription {
  id: string;
  created_at: string;
  prospect_id: string;
  offer_id: string | null;
  title: string;
  service_type: string | null;
  monthly_cents: number;
  start_date: string;
  end_date: string | null;
  status: "actif" | "pause" | "termine";
  notes: string | null;
}
