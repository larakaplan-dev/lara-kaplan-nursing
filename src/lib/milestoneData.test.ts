import { describe, it, expect } from 'vitest'
import { getDefaultOpenGroup, MILESTONE_GROUPS } from './milestoneData'

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const monthsAgo = (months: number) => daysAgo(Math.round(months * 30.4375))

describe('MILESTONE_GROUPS dataset', () => {
  it('contains all 12 age group keys', () => {
    const expected = ['2mo','4mo','6mo','9mo','12mo','15mo','18mo','24mo','30mo','36mo','48mo','60mo']
    const actual = MILESTONE_GROUPS.map(g => g.key)
    expect(actual).toEqual(expected)
  })

  it('has no duplicate milestone keys', () => {
    const keys = MILESTONE_GROUPS.flatMap(g => g.categories.flatMap(c => c.items.map(i => i.key)))
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })

  it('has a total of 159 milestone items', () => {
    const total = MILESTONE_GROUPS.flatMap(g => g.categories.flatMap(c => c.items)).length
    expect(total).toBe(159)
  })
})

describe('getDefaultOpenGroup', () => {
  it('returns 2mo for null dob', () => {
    expect(getDefaultOpenGroup(null)).toBe('2mo')
  })

  it('returns 2mo for a baby under 2 months old', () => {
    const dob = monthsAgo(1).toISOString()
    expect(getDefaultOpenGroup(dob)).toBe('2mo')
  })

  it('returns 4mo for a child aged 5 months', () => {
    const dob = monthsAgo(5).toISOString()
    expect(getDefaultOpenGroup(dob)).toBe('4mo')
  })

  it('returns 12mo for a child aged exactly 12 months', () => {
    const now = new Date('2026-06-01')
    const dob = new Date('2025-06-01').toISOString()
    expect(getDefaultOpenGroup(dob, now)).toBe('12mo')
  })

  it('returns 60mo for a child aged 72 months', () => {
    const dob = monthsAgo(72).toISOString()
    expect(getDefaultOpenGroup(dob)).toBe('60mo')
  })
})
