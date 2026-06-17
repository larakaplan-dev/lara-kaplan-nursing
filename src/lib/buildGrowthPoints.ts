import { normaliseAgeMonths } from './normaliseAgeMonths'
import type { GrowthEntry } from '@/types'

export interface GrowthPoint {
  ageMonths: number
  value: number
}

const MAX_MONTHS = 24
const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000

export function buildGrowthPoints(
  entries: GrowthEntry[],
  metric: 'weight' | 'length' | 'hc',
  dob?: string | null,
): GrowthPoint[] {
  const points: GrowthPoint[] = []

  for (const e of entries) {
    let ageMonths = normaliseAgeMonths(e)

    if (ageMonths === null && dob && e.measurement_date) {
      const ms = new Date(e.measurement_date).getTime() - new Date(dob).getTime()
      if (ms > 0) {
        const computed = ms / MS_PER_MONTH
        if (computed <= MAX_MONTHS) ageMonths = computed
      }
    }

    if (ageMonths === null) continue

    let value: number | null
    if (metric === 'weight') {
      value = e.weight_grams != null ? +(e.weight_grams / 1000).toFixed(3) : null
    } else if (metric === 'length') {
      value = e.length_cm
    } else {
      value = e.head_circumference_cm
    }

    if (value === null) continue
    points.push({ ageMonths, value })
  }

  return points.sort((a, b) => a.ageMonths - b.ageMonths)
}
