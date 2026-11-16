-- supabase/migrations/20261114000001_initial_schema.sql
-- Migrasi Skema Inti SadarIklim (PostgreSQL + PostGIS + Storage + RLS)

-- 1. Schema & Ekstensi PostGIS (PRD Bab 6.2)
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

-- 2. Fungsi Trigger updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3. Fungsi Trigger Kalkulasi Deterministik Survival Rate Mangrove (PRD Bab 2.2 & 6.3.2)
create or replace function public.compute_mangrove_survival_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.planted_count is not null and new.planted_count > 0 and new.surviving_count is not null then
    new.survival_rate = round((new.surviving_count::numeric / new.planted_count::numeric) * 100.0, 2);
  else
    new.survival_rate = null;
  end if;
  return new;
end;
$$;

-- 4. Tabel Utama & Pendukung (PRD Bab 6.2 - 6.4)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name varchar(120) not null,
  role text not null default 'citizen' check (role in ('citizen','community','bpbd_admin','super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.simulation_scenarios (
  id uuid primary key default gen_random_uuid(),
  scenario_code varchar(60) not null unique,
  name varchar(180) not null,
  description text not null,
  hazard_type text not null check (hazard_type in ('coastal_flood','wildfire','earthquake','multi_hazard')),
  payload jsonb not null,
  sample_asset_paths jsonb not null default '[]'::jsonb,
  expected_checks jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  schema_version varchar(32) not null default '1.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id),
  report_type text not null check (report_type in ('flood_report','road_damage','coastal_hazard','other')),
  title varchar(160) not null,
  description text,
  location extensions.geography(Point,4326),
  adm4_code varchar(20),
  village_name varchar(120),
  photo_bucket text not null default 'incident-media-private',
  photo_path text not null,
  observed_at timestamptz,
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted' check (status in ('submitted','processing','needs_review','verified','rejected','duplicate','resolved')),
  severity text not null default 'unknown' check (severity in ('low','moderate','high','critical','unknown')),
  ai_result jsonb,
  ai_model text,
  schema_version varchar(32),
  prompt_version varchar(32),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  data_mode text not null default 'live' check (data_mode in ('live','simulation')),
  scenario_id uuid references public.simulation_scenarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_simulation_consistency check (
    (data_mode = 'live' and scenario_id is null) or
    (data_mode = 'simulation' and scenario_id is not null)
  )
);

create table if not exists public.mangrove_audits (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references auth.users(id),
  plot_code varchar(80) not null,
  plot_name varchar(160) not null,
  location extensions.geography(Point,4326) not null,
  photo_bucket text not null default 'mangrove-audit-private',
  photo_path text not null,
  observed_at timestamptz not null,
  planted_count integer check (planted_count >= 0),
  surviving_count integer check (surviving_count >= 0),
  survival_rate numeric(5,2),
  ai_result jsonb,
  erosion_risk text not null default 'unknown' check (erosion_risk in ('low','moderate','high','unknown')),
  human_notes text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  data_mode text not null default 'live' check (data_mode in ('live','simulation')),
  scenario_id uuid references public.simulation_scenarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mangrove_counts_consistency check (
    surviving_count is null or (planted_count is not null and surviving_count <= planted_count)
  ),
  constraint mangrove_rate_range check (
    survival_rate is null or (survival_rate >= 0 and survival_rate <= 100)
  )
);

create table if not exists public.critical_facilities (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  name varchar(200) not null,
  facility_type text not null check (facility_type in ('school','puskesmas','hospital')),
  location extensions.geography(Point,4326) not null,
  address text,
  adm4_code varchar(20),
  source text not null,
  source_layer text,
  source_attributes jsonb not null default '{}'::jsonb,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','checked','confirmed','inactive')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create table if not exists public.kitabisa_campaigns (
  id uuid primary key default gen_random_uuid(),
  title varchar(220) not null,
  campaign_url text not null,
  category text not null check (category in ('flood','wildfire','mangrove','earthquake','humanitarian','other')),
  summary text not null,
  beneficiary_area text not null,
  location extensions.geography(Point,4326),
  status text not null default 'unverified' check (status in ('active','ended','unverified','hidden')),
  verification_status text not null default 'needs_recheck' check (verification_status in ('verified','needs_recheck','invalid')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  campaign_start_at timestamptz,
  campaign_end_at timestamptz,
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hazard_events (
  id uuid primary key default gen_random_uuid(),
  hazard_type text not null,
  title varchar(180) not null,
  geom extensions.geometry(MultiPolygon,4326) not null,
  source text not null,
  source_reference text,
  severity text not null default 'unknown',
  status text not null default 'active' check (status in ('active','expired','resolved','simulation')),
  valid_from timestamptz,
  valid_until timestamptz,
  data_mode text not null default 'live' check (data_mode in ('live','simulation')),
  scenario_id uuid references public.simulation_scenarios(id),
  source_snapshot_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evacuation_shelters (
  id uuid primary key default gen_random_uuid(),
  name varchar(180) not null,
  location extensions.geography(Point,4326) not null,
  address text,
  capacity integer check (capacity is null or capacity >= 0),
  availability_status text not null default 'unknown'
    check (availability_status in ('available','limited','full','closed','unknown')),
  source text not null,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.road_segments (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  name varchar(180),
  road_class text,
  geom extensions.geometry(LineString,4326) not null,
  access text,
  source text not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create table if not exists public.road_segment_status (
  id uuid primary key default gen_random_uuid(),
  road_segment_id uuid not null references public.road_segments(id) on delete cascade,
  status text not null check (status in ('OPEN','CAUTION','BLOCKED','UNKNOWN')),
  reason text,
  evidence_report_id uuid references public.reports(id),
  evidence_source text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.logistics_price_catalog (
  id uuid primary key default gen_random_uuid(),
  item_code varchar(60) not null unique,
  item_name varchar(120) not null,
  unit text not null check (unit in ('paket','unit','buah','lembar','bibit','set','hari')),
  basis text not null default 'per_person' check (basis in ('per_person_day','per_person','fixed')),
  unit_cost_idr numeric(14,2) check (unit_cost_idr is null or unit_cost_idr >= 0),
  currency varchar(8) not null default 'IDR',
  cost_source varchar(240),
  region_scope varchar(120),
  is_active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  source_url text not null,
  region_key text,
  fetched_at timestamptz not null default now(),
  source_updated_at timestamptz,
  freshness text not null check (freshness in ('FRESH','STALE','ERROR')),
  checksum text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  actor_id uuid references auth.users(id),
  model_id text not null,
  prompt_version varchar(32) not null,
  schema_version varchar(32) not null,
  input_hash text not null,
  status text not null check (status in ('succeeded','failed','rejected_by_guard')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  token_usage jsonb,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);

-- 5. Indexes Spasial (GiST) & Relasional (B-Tree)
create index if not exists hazard_events_geom_gix on public.hazard_events using gist (geom);
create index if not exists evacuation_shelters_location_gix on public.evacuation_shelters using gist (location);
create index if not exists road_segments_geom_gix on public.road_segments using gist (geom);
create index if not exists road_segment_status_current_idx on public.road_segment_status (road_segment_id, valid_from desc, valid_until);
create index if not exists reports_location_gix on public.reports using gist (location);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists mangrove_audits_location_gix on public.mangrove_audits using gist (location);
create index if not exists critical_facilities_location_gix on public.critical_facilities using gist (location);
create index if not exists critical_facilities_type_idx on public.critical_facilities (facility_type, verification_status);
create index if not exists kitabisa_campaigns_category_status_idx on public.kitabisa_campaigns (category, status, verification_status);

-- 6. Pasang Trigger updated_at & survival_rate
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_simulation_scenarios_updated_at on public.simulation_scenarios;
create trigger trg_simulation_scenarios_updated_at before update on public.simulation_scenarios for each row execute function public.set_updated_at();

drop trigger if exists trg_reports_updated_at on public.reports;
create trigger trg_reports_updated_at before update on public.reports for each row execute function public.set_updated_at();

drop trigger if exists trg_mangrove_audits_updated_at on public.mangrove_audits;
create trigger trg_mangrove_audits_updated_at before update on public.mangrove_audits for each row execute function public.set_updated_at();

drop trigger if exists trg_mangrove_audits_survival_rate on public.mangrove_audits;
create trigger trg_mangrove_audits_survival_rate before insert or update of planted_count, surviving_count on public.mangrove_audits for each row execute function public.compute_mangrove_survival_rate();

drop trigger if exists trg_critical_facilities_updated_at on public.critical_facilities;
create trigger trg_critical_facilities_updated_at before update on public.critical_facilities for each row execute function public.set_updated_at();

drop trigger if exists trg_kitabisa_campaigns_updated_at on public.kitabisa_campaigns;
create trigger trg_kitabisa_campaigns_updated_at before update on public.kitabisa_campaigns for each row execute function public.set_updated_at();

drop trigger if exists trg_hazard_events_updated_at on public.hazard_events;
create trigger trg_hazard_events_updated_at before update on public.hazard_events for each row execute function public.set_updated_at();

drop trigger if exists trg_evacuation_shelters_updated_at on public.evacuation_shelters;
create trigger trg_evacuation_shelters_updated_at before update on public.evacuation_shelters for each row execute function public.set_updated_at();

drop trigger if exists trg_road_segments_updated_at on public.road_segments;
create trigger trg_road_segments_updated_at before update on public.road_segments for each row execute function public.set_updated_at();

drop trigger if exists trg_logistics_price_catalog_updated_at on public.logistics_price_catalog;
create trigger trg_logistics_price_catalog_updated_at before update on public.logistics_price_catalog for each row execute function public.set_updated_at();

-- 7. Trigger Otomatis Pembuatan Profil saat User Registrasi di Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text := 'citizen';
  assigned_name text;
begin
  if new.email = 'petugas.demo@sadariklim.example' then
    assigned_role := 'bpbd_admin';
    assigned_name := 'Petugas BPBD Demo';
  elsif new.email = 'warga.demo@sadariklim.example' then
    assigned_role := 'citizen';
    assigned_name := 'Warga Demo';
  else
    assigned_name := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Warga');
  end if;

  insert into public.profiles (id, display_name, role)
  values (new.id, left(assigned_name, 120), assigned_role)
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 8. Inisialisasi Private Storage Buckets (PRD Bab 3.6 & 6.3)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('incident-media-private', 'incident-media-private', false, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('mangrove-audit-private', 'mangrove-audit-private', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 9. Row Level Security (RLS) & Kebijakan Akses (PRD Bab 6.6)
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.simulation_scenarios enable row level security;
alter table public.reports enable row level security;
alter table public.mangrove_audits enable row level security;
alter table public.critical_facilities enable row level security;
alter table public.kitabisa_campaigns enable row level security;
alter table public.hazard_events enable row level security;
alter table public.evacuation_shelters enable row level security;
alter table public.road_segments enable row level security;
alter table public.road_segment_status enable row level security;
alter table public.logistics_price_catalog enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.ai_analysis_runs enable row level security;
alter table public.audit_logs enable row level security;

-- Policies: profiles
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_user_role() in ('bpbd_admin', 'super_admin'));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Policies: simulation_scenarios
drop policy if exists "scenarios_select_active" on public.simulation_scenarios;
create policy "scenarios_select_active" on public.simulation_scenarios
  for select to anon, authenticated
  using (is_active = true or public.current_user_role() = 'super_admin');

-- Policies: reports
drop policy if exists "reports_select_public_verified" on public.reports;
create policy "reports_select_public_verified" on public.reports
  for select to anon
  using (status = 'verified');

drop policy if exists "reports_select_authenticated" on public.reports;
create policy "reports_select_authenticated" on public.reports
  for select to authenticated
  using (
    status = 'verified'
    or submitted_by = auth.uid()
    or public.current_user_role() in ('bpbd_admin', 'super_admin')
  );

drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated" on public.reports
  for insert to authenticated
  with check (submitted_by = auth.uid());

drop policy if exists "reports_update_bpbd_or_admin" on public.reports;
create policy "reports_update_bpbd_or_admin" on public.reports
  for update to authenticated
  using (public.current_user_role() in ('bpbd_admin', 'super_admin'))
  with check (public.current_user_role() in ('bpbd_admin', 'super_admin'));

-- Policies: mangrove_audits
drop policy if exists "mangrove_select_verified_public" on public.mangrove_audits;
create policy "mangrove_select_verified_public" on public.mangrove_audits
  for select to anon
  using (verification_status = 'verified');

drop policy if exists "mangrove_select_authenticated" on public.mangrove_audits;
create policy "mangrove_select_authenticated" on public.mangrove_audits
  for select to authenticated
  using (
    verification_status = 'verified'
    or submitted_by = auth.uid()
    or public.current_user_role() in ('bpbd_admin', 'super_admin')
  );

drop policy if exists "mangrove_insert_authenticated" on public.mangrove_audits;
create policy "mangrove_insert_authenticated" on public.mangrove_audits
  for insert to authenticated
  with check (submitted_by = auth.uid());

drop policy if exists "mangrove_update_bpbd_or_admin" on public.mangrove_audits;
create policy "mangrove_update_bpbd_or_admin" on public.mangrove_audits
  for update to authenticated
  using (public.current_user_role() in ('bpbd_admin', 'super_admin'))
  with check (public.current_user_role() in ('bpbd_admin', 'super_admin'));

-- Policies: critical_facilities, evacuation_shelters, hazard_events, road_segments
drop policy if exists "facilities_select_public" on public.critical_facilities;
create policy "facilities_select_public" on public.critical_facilities
  for select to anon, authenticated
  using (verification_status <> 'inactive');

drop policy if exists "shelters_select_public" on public.evacuation_shelters;
create policy "shelters_select_public" on public.evacuation_shelters
  for select to anon, authenticated
  using (true);

drop policy if exists "hazards_select_public" on public.hazard_events;
create policy "hazards_select_public" on public.hazard_events
  for select to anon, authenticated
  using (status in ('active', 'simulation'));

drop policy if exists "roads_select_public" on public.road_segments;
create policy "roads_select_public" on public.road_segments
  for select to anon, authenticated
  using (true);

drop policy if exists "road_status_select_public" on public.road_segment_status;
create policy "road_status_select_public" on public.road_segment_status
  for select to anon, authenticated
  using (true);

-- Policies: kitabisa_campaigns
drop policy if exists "campaigns_select_active_verified" on public.kitabisa_campaigns;
create policy "campaigns_select_active_verified" on public.kitabisa_campaigns
  for select to anon, authenticated
  using (
    (status = 'active' and verification_status = 'verified')
    or public.current_user_role() = 'super_admin'
  );

-- Policies: logistics_price_catalog
drop policy if exists "logistics_catalog_select_active" on public.logistics_price_catalog;
create policy "logistics_catalog_select_active" on public.logistics_price_catalog
  for select to anon, authenticated
  using (is_active = true);

-- Policies: audit_logs
drop policy if exists "audit_logs_select_officers" on public.audit_logs;
create policy "audit_logs_select_officers" on public.audit_logs
  for select to authenticated
  using (public.current_user_role() in ('bpbd_admin', 'super_admin'));

-- Seed Katalog Harga Dasar Logistik (PRD Bab 4.4.5 & docs/kampanye.md)
insert into public.logistics_price_catalog (item_code, item_name, unit, basis, unit_cost_idr, cost_source, region_scope, is_active)
values
  ('FOOD', 'Paket pangan', 'paket', 'per_person_day', 35000, 'Katalog harga dasar referensi darurat', 'Nasional', true),
  ('WATER', 'Air bersih', 'paket', 'per_person_day', 15000, 'Katalog harga dasar referensi darurat', 'Nasional', true),
  ('BLANKET', 'Selimut', 'lembar', 'per_person', 45000, 'Katalog harga dasar referensi darurat', 'Nasional', true),
  ('BOAT', 'Perahu karet', 'unit', 'fixed', null, 'Harga belum tersedia (cost_unknown)', 'Nasional', true)
on conflict (item_code) do nothing;