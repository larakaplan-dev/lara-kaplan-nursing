import { describe, it, expect } from 'vitest'
import { getWhoData } from './whoGrowthData'

describe('getWhoData', () => {
  it('returns 25 data points covering months 0–24 for weight/male', () => {
    const data = getWhoData('weight', 'male')
    expect(data).toHaveLength(25)
    expect(data[0].month).toBe(0)
    expect(data[24].month).toBe(24)
  })

  it('all rows satisfy p3 < p10 < p25 < p50 < p75 < p90 < p97', () => {
    const data = getWhoData('weight', 'male')
    for (const row of data) {
      expect(row.p3).toBeLessThan(row.p10)
      expect(row.p10).toBeLessThan(row.p25)
      expect(row.p25).toBeLessThan(row.p50)
      expect(row.p50).toBeLessThan(row.p75)
      expect(row.p75).toBeLessThan(row.p90)
      expect(row.p90).toBeLessThan(row.p97)
    }
  })

  it('male and female weight datasets differ', () => {
    const male = getWhoData('weight', 'male')
    const female = getWhoData('weight', 'female')
    expect(male[0].p50).not.toBe(female[0].p50)
  })

  it.each([
    ['weight', 'male'],
    ['weight', 'female'],
    ['length', 'male'],
    ['length', 'female'],
    ['hc', 'male'],
    ['hc', 'female'],
  ] as const)('getWhoData(%s, %s) returns 25 ordered data points', (metric, sex) => {
    const data = getWhoData(metric, sex)
    expect(data).toHaveLength(25)
    expect(data[0].month).toBe(0)
    expect(data[24].month).toBe(24)
    for (const row of data) {
      expect(row.p3).toBeLessThan(row.p97)
    }
  })
})
