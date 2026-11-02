-- Free-text rule IDs may be reused across revisions. Cached model checks and user
-- answers must never be inherited by a differently worded requirement.
alter table wearcheck.outfit_observations add column if not exists requirements_revision integer;
