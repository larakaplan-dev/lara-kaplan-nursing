-- Tags a vaccine catalog entry with its schedule position (e.g. '6 Weeks',
-- '9 Months'), so the Vaccinations tab can batch-populate all vaccines due
-- at a given visit. Nullable: legacy/one-off vaccines aren't forced onto
-- the schedule. Allowed values must stay in sync with
-- VACCINE_CATALOG_AGE_GROUPS in src/lib/ageGroups.ts.

alter table vaccine_catalog
  add column age_group_label text;

alter table vaccine_catalog
  add constraint vaccine_catalog_age_group_label_check
  check (age_group_label is null or age_group_label in (
    'Birth', '6 Weeks', '10 Weeks', '14 Weeks', '6 Months', '9 Months',
    '12 Months', '15 Months', '18 Months', '2 Years', '6 Years', '12 Years'
  ));
