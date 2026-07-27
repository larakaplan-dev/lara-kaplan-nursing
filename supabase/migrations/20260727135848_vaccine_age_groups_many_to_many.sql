-- Supersedes 20260722133544_vaccine_catalog_age_group_label.sql: a vaccine
-- can belong to several schedule visits (e.g. a primary-series vaccine given
-- at 6/10/14 Weeks), so the one-to-one age_group_label column is replaced
-- with a proper many-to-many junction table. No backfill: the few values
-- already set in production are dropped and re-entered via the new UI.

alter table vaccine_catalog
  drop constraint vaccine_catalog_age_group_label_check;

alter table vaccine_catalog
  drop column age_group_label;

create table vaccine_catalog_age_groups (
  id               uuid primary key default gen_random_uuid(),
  vaccine_id       uuid not null references vaccine_catalog(id) on delete cascade,
  age_group_label  text not null check (age_group_label in (
                     'Birth', '6 Weeks', '10 Weeks', '14 Weeks', '6 Months', '9 Months',
                     '12 Months', '15 Months', '18 Months', '2 Years', '6 Years', '12 Years'
                   )),
  created_at       timestamptz not null default now(),
  unique (vaccine_id, age_group_label)
);

create index idx_vaccine_catalog_age_groups_vaccine on vaccine_catalog_age_groups(vaccine_id);

alter table vaccine_catalog_age_groups enable row level security;

create policy "authenticated_full_access"
  on vaccine_catalog_age_groups for all to authenticated
  using (true) with check (true);
