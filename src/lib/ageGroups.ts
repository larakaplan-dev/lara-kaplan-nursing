// Single source of truth for the practice's vaccination schedule age groups.
// Used by: VaccinationsTab (grouping recorded vaccinations), the vaccine
// catalog's age_group_label (admin form + batch add-by-age-group), and the
// vaccine_catalog.age_group_label CHECK constraint (kept in sync manually).
// Vaccine catalog schedule positions — excludes 'Other', which is not a real schedule slot.
export const VACCINE_CATALOG_AGE_GROUPS = [
  'Birth', '6 Weeks', '10 Weeks', '14 Weeks', '6 Months', '9 Months',
  '12 Months', '15 Months', '18 Months', '2 Years', '6 Years', '12 Years',
] as const

export const AGE_GROUPS = [...VACCINE_CATALOG_AGE_GROUPS, 'Other'] as const
