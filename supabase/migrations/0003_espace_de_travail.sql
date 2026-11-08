-- =====================================================================
-- Espace de travail : boîte mail + plateformes, page Agent, ventes,
-- suivis mensuels et chiffre d'affaires.
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run
-- (on peut le relancer sans risque : rien n'est effacé)
-- =====================================================================

-- Nouveau type d'historique : demande reçue sur une plateforme (Codeur, Fiverr, Malt…)
alter type activity_type add value if not exists 'demande_plateforme';

-- ---------------------------------------------------------------------
-- Messages : ta boîte mail pro + les demandes des plateformes
-- ---------------------------------------------------------------------
create table if not exists messages (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  received_at   timestamptz not null default now(),
  prospect_id   uuid references prospects(id) on delete set null,
  direction     text not null default 'entrant' check (direction in ('entrant','sortant')),
  source        text not null default 'email',      -- email, site, codeur, fiverr, malt, comeup…
  category      text not null default 'client'
                check (category in ('client','plateforme','autre')),
  verdict       text not null default 'ok'          -- filtre anti-spam
                check (verdict in ('ok','a_verifier','spam')),
  from_email    text,
  from_name     text,
  to_email      text,
  subject       text,
  body          text,
  ai_summary    text,                                -- résumé IA en une ligne
  thread_id     text,                                -- conversation Gmail
  external_id   text unique,                         -- id du message Gmail (évite les doublons)
  platform_url  text,                                -- lien direct vers la conversation sur la plateforme
  is_read       boolean not null default false,
  send_status   text check (send_status in ('a_envoyer','envoye','erreur')), -- pour les emails envoyés depuis le CRM
  error         text,
  metadata      jsonb not null default '{}'::jsonb
);
create index if not exists messages_received_idx on messages (received_at desc);
create index if not exists messages_prospect_idx on messages (prospect_id, received_at desc);
create index if not exists messages_thread_idx on messages (thread_id);
create index if not exists messages_unread_idx on messages (is_read) where is_read = false;

-- ---------------------------------------------------------------------
-- Agent : les ordres que tu donnes depuis le CRM (recherche, envoi…)
-- ---------------------------------------------------------------------
create table if not exists agent_tasks (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  type          text not null check (type in ('recherche','envoi','relances','consigne')),
  params        jsonb not null default '{}'::jsonb,
  status        text not null default 'en_attente'
                check (status in ('en_attente','envoye','en_cours','termine','erreur','annule')),
  summary       text,                                -- compte-rendu de l'agent
  result        jsonb not null default '{}'::jsonb,
  error         text
);
create index if not exists agent_tasks_created_idx on agent_tasks (created_at desc);
create index if not exists agent_tasks_status_idx on agent_tasks (status);

drop trigger if exists agent_tasks_updated_at on agent_tasks;
create trigger agent_tasks_updated_at before update on agent_tasks
  for each row execute function set_updated_at();

-- Réglages (cibles de l'agent, pause, signature…)
create table if not exists settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Ventes : type de prestation + paiements sur les offres
-- ---------------------------------------------------------------------
alter table offers add column if not exists service_type   text;            -- site_internet, automatisation…
alter table offers add column if not exists monthly_cents  int not null default 0; -- suivi mensuel proposé avec l'offre
alter table offers add column if not exists payment_status text not null default 'non_paye';
alter table offers add column if not exists paid_cents     int not null default 0;
alter table offers add column if not exists paid_at        timestamptz;
do $$ begin
  alter table offers add constraint offers_payment_status_chk check (payment_status in ('non_paye','acompte','paye'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Suivis mensuels (maintenance, mises à jour, assistance…)
-- ---------------------------------------------------------------------
create table if not exists subscriptions (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  prospect_id    uuid not null references prospects(id) on delete cascade,
  offer_id       uuid references offers(id) on delete set null,
  title          text not null,
  service_type   text,
  monthly_cents  int not null default 0,
  start_date     date not null default current_date,
  end_date       date,
  status         text not null default 'actif' check (status in ('actif','pause','termine')),
  notes          text
);
create index if not exists subscriptions_prospect_idx on subscriptions (prospect_id);

-- ---------------------------------------------------------------------
-- Sécurité (RLS) : comme le reste, seul toi (connecté) lis / écris
-- ---------------------------------------------------------------------
alter table messages      enable row level security;
alter table agent_tasks   enable row level security;
alter table settings      enable row level security;
alter table subscriptions enable row level security;

drop policy if exists "auth_all_messages" on messages;
create policy "auth_all_messages" on messages for all to authenticated using (true) with check (true);
drop policy if exists "auth_all_agent_tasks" on agent_tasks;
create policy "auth_all_agent_tasks" on agent_tasks for all to authenticated using (true) with check (true);
drop policy if exists "auth_all_settings" on settings;
create policy "auth_all_settings" on settings for all to authenticated using (true) with check (true);
drop policy if exists "auth_all_subscriptions" on subscriptions;
create policy "auth_all_subscriptions" on subscriptions for all to authenticated using (true) with check (true);
