-- =====================================================================
-- CRM Prospection — schéma initial
-- À exécuter dans Supabase : SQL Editor > coller > Run
-- =====================================================================

-- gen_random_uuid() est natif depuis Postgres 13 : aucune extension nécessaire

-- ---------------------------------------------------------------------
-- Statuts du pipeline
-- ---------------------------------------------------------------------
do $$ begin
  create type prospect_status as enum (
    'nouveau',        -- trouvé par l'agent, pas encore contacté
    'contacte',       -- 1er SMS / email envoyé
    'a_visite',       -- a cliqué sur le lien de ton site
    'chaud',          -- a répondu positivement / formulaire / RDV
    'rdv',            -- rendez-vous fixé
    'offre_envoyee',  -- offre / devis envoyé
    'valide',         -- offre acceptée ✅
    'perdu'           -- pas intéressé / STOP
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type as enum (
    'sms_sortant', 'sms_entrant',
    'email_sortant', 'email_entrant',
    'clic_lien', 'formulaire', 'rdv',
    'note', 'changement_statut',
    'offre_envoyee', 'offre_acceptee', 'offre_refusee',
    'relance', 'stop'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_status as enum ('brouillon', 'envoyee', 'acceptee', 'refusee');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Prospects
-- ---------------------------------------------------------------------
create table if not exists prospects (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  company_name    text not null,
  contact_name    text,
  sector          text,                 -- métier : boulangerie, garage, ...
  city            text,
  address         text,
  phone           text,                 -- format E.164 conseillé : +33612345678
  email           text,
  website         text,                 -- site actuel du prospect (null = pas de site)
  siret           text,
  size            text check (size in ('tpe','pme','grande')),

  source          text default 'agent', -- google_maps, pappers, formulaire_site, manuel...
  channel         text check (channel in ('sms','email','autre')),
  status          prospect_status not null default 'nouveau',
  score           int check (score between 0 and 100),
  interest        text,                 -- site internet, automatisation, logiciel...
  ai_summary      text,                 -- résumé IA de la situation
  tags            text[] not null default '{}',

  ref_slug        text unique not null default substr(md5(gen_random_uuid()::text), 1, 8),
  link_clicks     int not null default 0,
  opted_out       boolean not null default false,   -- a répondu STOP : ne plus jamais contacter
  last_contact_at timestamptz,
  next_followup_at timestamptz,
  is_unread       boolean not null default false     -- nouvel événement à voir
);

create unique index if not exists prospects_phone_uniq on prospects (phone) where phone is not null;
create unique index if not exists prospects_email_uniq on prospects (lower(email)) where email is not null;
create unique index if not exists prospects_siret_uniq on prospects (siret) where siret is not null;
create index if not exists prospects_status_idx on prospects (status);
create index if not exists prospects_followup_idx on prospects (next_followup_at) where opted_out = false;

-- ---------------------------------------------------------------------
-- Historique (timeline de chaque prospect)
-- ---------------------------------------------------------------------
create table if not exists activities (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  prospect_id  uuid not null references prospects(id) on delete cascade,
  type         activity_type not null,
  content      text,
  metadata     jsonb not null default '{}'::jsonb,
  created_by   text not null default 'n8n'  -- n8n | moi | site | systeme
);
create index if not exists activities_prospect_idx on activities (prospect_id, created_at desc);
create index if not exists activities_created_idx on activities (created_at desc);

-- ---------------------------------------------------------------------
-- Offres / devis
-- ---------------------------------------------------------------------
create table if not exists offers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  prospect_id   uuid not null references prospects(id) on delete cascade,
  title         text not null,
  description   text,
  amount_cents  int not null default 0,
  status        offer_status not null default 'brouillon',
  public_token  text unique not null default replace(gen_random_uuid()::text, '-', ''),
  sent_at       timestamptz,
  answered_at   timestamptz
);
create index if not exists offers_prospect_idx on offers (prospect_id);

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists prospects_updated_at on prospects;
create trigger prospects_updated_at before update on prospects
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Sécurité (RLS) : seul un utilisateur connecté au CRM lit/écrit.
-- n8n et les pages publiques passent par l'API du CRM (clé service).
-- ---------------------------------------------------------------------
alter table prospects  enable row level security;
alter table activities enable row level security;
alter table offers     enable row level security;

drop policy if exists "auth_all_prospects" on prospects;
create policy "auth_all_prospects" on prospects for all to authenticated using (true) with check (true);
drop policy if exists "auth_all_activities" on activities;
create policy "auth_all_activities" on activities for all to authenticated using (true) with check (true);
drop policy if exists "auth_all_offers" on offers;
create policy "auth_all_offers" on offers for all to authenticated using (true) with check (true);
