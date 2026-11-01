-- WearCheck 0001: dedicated schema. Additive only.
-- Scope: creates objects inside the `wearcheck` schema and nothing else.
-- It does not touch `public`, `auth`, `storage`, existing roles, grants of other
-- schemas, API schema exposure, or any other application's objects.

create schema if not exists wearcheck;

-- The schema is reached only by the WearCheck server over a direct Postgres
-- connection. It is not exposed to PostgREST, and API roles get no access.
revoke all on schema wearcheck from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema wearcheck from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on schema wearcheck from authenticated';
  end if;
end $$;

create table if not exists wearcheck.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists wearcheck.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists guest_sessions_expires_idx on wearcheck.guest_sessions (expires_at);

create table if not exists wearcheck.checks (
  id uuid primary key default gen_random_uuid(),
  guest_session_id uuid not null references wearcheck.guest_sessions(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'decided', 'deleted')),
  current_step text not null default 'invitation',
  requirements_revision integer not null default 0,
  photo_asset_id uuid,
  demo_case text,
  decision text check (decision in ('keep', 'change')),
  decision_render_job_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists checks_owner_idx on wearcheck.checks (guest_session_id);
create index if not exists checks_expires_idx on wearcheck.checks (expires_at);

create table if not exists wearcheck.consent_records (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references wearcheck.checks(id) on delete cascade,
  statement_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null
);

create table if not exists wearcheck.media_assets (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references wearcheck.checks(id) on delete cascade,
  kind text not null check (kind in ('invitation', 'outfit', 'reference_upload', 'render_result', 'decision_card')),
  storage_key text not null unique,
  mime text not null,
  width integer not null,
  height integer not null,
  bytes integer not null,
  sha256 text not null,
  origin text not null,
  consent_record_id uuid references wearcheck.consent_records(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists media_assets_check_idx on wearcheck.media_assets (check_id);
create index if not exists media_assets_expires_idx on wearcheck.media_assets (expires_at);

create table if not exists wearcheck.event_sources (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references wearcheck.checks(id) on delete cascade,
  source_type text not null check (source_type in ('invitation_image', 'manual', 'demo_manual')),
  asset_id uuid references wearcheck.media_assets(id) on delete set null,
  manual_json jsonb,
  extraction_json jsonb,
  extraction_status text not null default 'none' check (extraction_status in ('none', 'running', 'done', 'failed')),
  extraction_error text,
  model_id text,
  created_at timestamptz not null default now()
);
create index if not exists event_sources_check_idx on wearcheck.event_sources (check_id);

create table if not exists wearcheck.event_requirements (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references wearcheck.checks(id) on delete cascade,
  revision integer not null,
  json jsonb not null,
  confirmed_at timestamptz not null default now(),
  confirmed_by text not null default 'guest',
  model_id text,
  unique (check_id, revision)
);

create table if not exists wearcheck.outfit_observations (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references wearcheck.checks(id) on delete cascade,
  photo_asset_id uuid not null references wearcheck.media_assets(id) on delete cascade,
  json jsonb not null,
  user_corrections jsonb not null default '{}'::jsonb,
  model_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists outfit_observations_check_idx on wearcheck.outfit_observations (check_id, photo_asset_id);

create table if not exists wearcheck.assessments (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references wearcheck.checks(id) on delete cascade,
  requirements_revision integer not null,
  photo_asset_id uuid not null references wearcheck.media_assets(id) on delete cascade,
  observation_id uuid not null references wearcheck.outfit_observations(id) on delete cascade,
  corrections_hash text not null,
  status text not null,
  findings_json jsonb not null,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);
create index if not exists assessments_check_idx on wearcheck.assessments (check_id, created_at desc);

create table if not exists wearcheck.render_jobs (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references wearcheck.checks(id) on delete cascade,
  assessment_id uuid not null references wearcheck.assessments(id) on delete cascade,
  finding_id text,
  provider text not null default 'youcam',
  feature text not null check (feature in ('cloth-v4', 'shoes-transfer')),
  garment_category text,
  catalogue_item_id text,
  user_ref_asset_id uuid references wearcheck.media_assets(id) on delete set null,
  source_asset_id uuid not null references wearcheck.media_assets(id) on delete cascade,
  input_revision text not null,
  idempotency_key text not null unique,
  attempt integer not null default 1,
  status text not null default 'draft',
  provider_task_id text,
  provider_status text,
  result_asset_id uuid references wearcheck.media_assets(id) on delete set null,
  error_code text,
  error_message text,
  lease_until timestamptz,
  last_polled_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists render_jobs_check_idx on wearcheck.render_jobs (check_id);
create index if not exists render_jobs_task_idx on wearcheck.render_jobs (provider_task_id);
create index if not exists render_jobs_status_idx on wearcheck.render_jobs (status);

create table if not exists wearcheck.decision_cards (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references wearcheck.checks(id) on delete cascade,
  assessment_id uuid not null references wearcheck.assessments(id) on delete cascade,
  render_job_id uuid references wearcheck.render_jobs(id) on delete set null,
  disclaimer_version text not null,
  created_at timestamptz not null default now()
);

-- Credit ledger. Contains no personal data; survives check deletion with check_id nulled.
create table if not exists wearcheck.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  render_job_id uuid,
  check_id uuid references wearcheck.checks(id) on delete set null,
  provider text not null,
  feature text not null,
  units_estimated numeric not null default 0,
  units_actual numeric,
  status text not null,
  provider_task_id text,
  latency_ms integer,
  demo_case text,
  created_at timestamptz not null default now()
);
create index if not exists api_usage_events_created_idx on wearcheck.api_usage_events (created_at);

create table if not exists wearcheck.product_events (
  id uuid primary key default gen_random_uuid(),
  check_id uuid references wearcheck.checks(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists wearcheck.rate_events (
  id bigserial primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_lookup_idx on wearcheck.rate_events (bucket, key_hash, created_at);

-- Defence in depth: RLS on, no policies. API roles have no schema usage anyway;
-- the server connects as the table owner.
alter table wearcheck.schema_migrations enable row level security;
alter table wearcheck.guest_sessions enable row level security;
alter table wearcheck.checks enable row level security;
alter table wearcheck.consent_records enable row level security;
alter table wearcheck.media_assets enable row level security;
alter table wearcheck.event_sources enable row level security;
alter table wearcheck.event_requirements enable row level security;
alter table wearcheck.outfit_observations enable row level security;
alter table wearcheck.assessments enable row level security;
alter table wearcheck.render_jobs enable row level security;
alter table wearcheck.decision_cards enable row level security;
alter table wearcheck.api_usage_events enable row level security;
alter table wearcheck.product_events enable row level security;
alter table wearcheck.rate_events enable row level security;
