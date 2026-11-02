-- Exact byte identities and provider file IDs are private to the owning check.
alter table wearcheck.render_jobs add column if not exists input_provenance jsonb;
