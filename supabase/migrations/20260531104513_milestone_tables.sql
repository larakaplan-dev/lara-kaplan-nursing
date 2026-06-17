-- milestone_records: sparse table — one row per checked milestone per patient.
-- Identified by a stable slug key defined in src/lib/milestoneData.ts.
-- No row = unchecked. Delete the row to uncheck; checked_at records when it was achieved.
--
-- milestone_notes: one free-text note per age group per patient, upserted on save.

create table milestone_records (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  milestone_key text not null,
  checked_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (patient_id, milestone_key)
);

create index idx_milestone_records_patient on milestone_records(patient_id);

create table milestone_notes (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  age_group_key text not null,
  note          text not null default '',
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (patient_id, age_group_key)
);

create index idx_milestone_notes_patient on milestone_notes(patient_id);

alter table milestone_records enable row level security;
alter table milestone_notes   enable row level security;

create policy "authenticated_full_access"
  on milestone_records for all to authenticated
  using (true) with check (true);

create policy "authenticated_full_access"
  on milestone_notes for all to authenticated
  using (true) with check (true);
