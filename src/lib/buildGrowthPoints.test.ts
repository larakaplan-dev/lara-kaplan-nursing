import { describe, it, expect } from 'vitest'
import { buildGrowthPoints } from './buildGrowthPoints'
import type { GrowthEntry } from '@/types'

function entry(overrides: Partial<GrowthEntry>): GrowthEntry {
  return {
    id: '1',
    patient_id: 'p1',
    measurement_date: '2024-01-01',
    age_weeks: null,
    age_months: null,
    weight_grams: null,
    length_cm: null,
    head_circumference_cm: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildGrowthPoints', () => {
  it('includes entry with age_months and weight value', () => {
    const points = buildGrowthPoints([entry({ age_months: 3, weight_grams: 6000 })], 'weight')
    expect(points).toHaveLength(1)
    expect(points[0].ageMonths).toBe(3)
    expect(points[0].value).toBeCloseTo(6.0)
  })

  it('converts age_weeks to fractional months when age_months is absent', () => {
    const points = buildGrowthPoints([entry({ age_weeks: 6, weight_grams: 4500 })], 'weight')
    expect(points).toHaveLength(1)
    expect(points[0].ageMonths).toBeCloseTo(6 / 4.33, 5)
  })

  it('excludes entry with no age fields', () => {
    const points = buildGrowthPoints([entry({ weight_grams: 5000 })], 'weight')
    expect(points).toHaveLength(0)
  })

  it('excludes entry with age exceeding 24 months', () => {
    const points = buildGrowthPoints([entry({ age_months: 25, weight_grams: 12000 })], 'weight')
    expect(points).toHaveLength(0)
  })

  it('excludes entry where the requested metric value is null', () => {
    const points = buildGrowthPoints([entry({ age_months: 2, weight_grams: null })], 'weight')
    expect(points).toHaveLength(0)
  })

  it('converts weight from grams to kg', () => {
    const points = buildGrowthPoints([entry({ age_months: 1, weight_grams: 4200 })], 'weight')
    expect(points[0].value).toBeCloseTo(4.2, 3)
  })

  it('uses length_cm directly for length metric', () => {
    const points = buildGrowthPoints([entry({ age_months: 6, length_cm: 67.5 })], 'length')
    expect(points[0].value).toBe(67.5)
  })

  it('uses head_circumference_cm directly for hc metric', () => {
    const points = buildGrowthPoints([entry({ age_months: 6, head_circumference_cm: 43.2 })], 'hc')
    expect(points[0].value).toBe(43.2)
  })

  it('returns points sorted by ageMonths ascending', () => {
    const points = buildGrowthPoints([
      entry({ age_months: 6, weight_grams: 7500 }),
      entry({ age_months: 2, weight_grams: 5000 }),
      entry({ age_months: 12, weight_grams: 9000 }),
    ], 'weight')
    expect(points.map(p => p.ageMonths)).toEqual([2, 6, 12])
  })
})
