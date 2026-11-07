export type ProspectStatus =
  | "nouveau" | "contacte" | "a_visite" | "chaud" | "rdv" | "offre_envoyee" | "valide" | "perdu";

export type ActivityType =
  | "sms_sortant" | "sms_entrant" | "email_sortant" | "email_entrant"
  | "clic_lien" | "formulaire" | "rdv" | "note" | "changement_statut"
  | "offre_envoyee" | "offre_acceptee" | "offre_refusee" | "relance" | "stop";

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
}
