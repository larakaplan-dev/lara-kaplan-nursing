alter table patients
  add column sex text check (sex in ('male', 'female'));
