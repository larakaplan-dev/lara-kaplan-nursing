const MAX_MONTHS = 24
const WEEKS_PER_MONTH = 4.33

export function normaliseAgeMonths(entry: {
  age_months: number | null
  age_weeks: number | null
}): number | null {
  const months =
    entry.age_months != null
      ? entry.age_months
      : entry.age_weeks != null
        ? entry.age_weeks / WEEKS_PER_MONTH
        : null

  if (months == null || months > MAX_MONTHS) return null
  return months
}
