-- =====================================================================
-- Journal du site : visites, clics « Réserver un appel », demandes, RDV.
-- Indépendant des fiches : supprimer un prospect NE supprime PAS son passage
-- (on garde son nom dans prospect_name).
-- À exécuter dans Supabase : SQL Editor > coller > Run
-- =====================================================================

create table if not exists site_events (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  type          text not null check (type in ('visite','clic_rdv','clic_lien','formulaire','rdv','rdv_annule')),
  path          text,                 -- page du site (/, /reserver-audit/, ...)
  ref           text,                 -- ref du lien personnalisé, si le visiteur vient d'un email
  prospect_id   uuid references prospects(id) on delete set null,
  prospect_name text,                 -- nom gardé même si la fiche est supprimée
  visitor       text,                 -- identifiant anonyme du jour (empreinte hachée, aucune IP stockée)
  referrer      text,                 -- site d'où vient le visiteur (google.com, ...)
  metadata      jsonb not null default '{}'::jsonb
);

create index if not exists site_events_created_idx on site_events (created_at desc);
create index if not exists site_events_type_idx on site_events (type, created_at desc);

alter table site_events enable row level security;
drop policy if exists "auth_read_site_events" on site_events;
create policy "auth_read_site_events" on site_events for select to authenticated using (true);
drop policy if exists "auth_delete_site_events" on site_events;
create policy "auth_delete_site_events" on site_events for delete to authenticated using (true);
