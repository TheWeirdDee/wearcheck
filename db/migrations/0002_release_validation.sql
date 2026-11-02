-- Additive changes confined to WearCheck; existing checks and assets remain valid.
alter table wearcheck.media_assets add column if not exists reference_validation jsonb;
alter table wearcheck.checks add column if not exists create_request_id uuid;
create unique index if not exists checks_create_request_idx on wearcheck.checks (guest_session_id, create_request_id) where create_request_id is not null;
