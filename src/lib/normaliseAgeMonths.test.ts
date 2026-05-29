import { describe, it, expect } from 'vitest'
import { normaliseAgeMonths } from './normaliseAgeMonths'

describe('normaliseAgeMonths', () => {
  it('returns age_months directly when present', () => {
    expect(normaliseAgeMonths({ age_months: 3, age_weeks: null })).toBe(3)
  })

  it('converts age_weeks to months when age_months is absent', () => {
    const result = normaliseAgeMonths({ age_months: null, age_weeks: 6 })
    expect(result).toBeCloseTo(6 / 4.33, 5)
  })

  it('returns null when both age_months and age_weeks are absent', () => {
    expect(normaliseAgeMonths({ age_months: null, age_weeks: null })).toBeNull()
  })

  it('returns null when resolved age exceeds 24 months', () => {
    expect(normaliseAgeMonths({ age_months: 25, age_weeks: null })).toBeNull()
  })
})
