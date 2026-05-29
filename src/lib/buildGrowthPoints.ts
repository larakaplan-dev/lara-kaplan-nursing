import { normaliseAgeMonths } from './normaliseAgeMonths'
import type { GrowthEntry } from '@/types'

export interface GrowthPoint {
  ageMonths: number
  value: number
}

export function buildGrowthPoints(
  entries: GrowthEntry[],
  metric: 'weight' | 'length' | 'hc',
): GrowthPoint[] {
  const points: GrowthPoint[] = []

  for (const e of entries) {
    const ageMonths = normaliseAgeMonths(e)
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
