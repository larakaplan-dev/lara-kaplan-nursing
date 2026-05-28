import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveOcrResults } from './saveOcrResults'
import type { OcrGrowthEntry, OcrVaccination } from '@/types'

const PARENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PATIENT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function mockFetch(responses: Array<{ ok: boolean; json: unknown }>) {
  let call = 0
  return vi.fn(async (_url: string, _init?: RequestInit) => {
    const r = responses[call++] ?? { ok: true, json: {} }
    return {
      ok: r.ok,
      json: async () => r.json,
    }
  })
}

beforeEach(() => vi.clearAllMocks())

describe('saveOcrResults', () => {
  it('creates parent then child when no existing parent', async () => {
    const fetch = mockFetch([
      { ok: true, json: { parent: { id: PARENT_ID } } },
      { ok: true, json: { patient: { id: PATIENT_ID } } },
    ])

    const result = await saveOcrResults({
      parentFields: { client_name: 'Jane Smith' },
      childFields: { baby_name: 'Baby Smith' },
      growthEntries: [],
      vaccinations: [],
      fetch: fetch as unknown as typeof globalThis.fetch,
    })

    expect(result.patientId).toBe(PATIENT_ID)
    expect(fetch).toHaveBeenNthCalledWith(1,
      '/api/parents',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetch).toHaveBeenNthCalledWith(2,
      '/api/patients',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('uses existing parent_id without creating a parent', async () => {
    const fetch = mockFetch([
      { ok: true, json: { patient: { id: PATIENT_ID } } },
    ])

    const result = await saveOcrResults({
      parentFields: { client_name: 'Jane Smith' },
      childFields: { baby_name: 'Baby Smith' },
      existingParentId: PARENT_ID,
      growthEntries: [],
      vaccinations: [],
      fetch: fetch as unknown as typeof globalThis.fetch,
    })

    expect(result.patientId).toBe(PATIENT_ID)
    const firstCall = fetch.mock.calls[0][0]
    expect(firstCall).toBe('/api/patients')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('passes parent_id to the patient POST body', async () => {
    const fetch = mockFetch([
      { ok: true, json: { parent: { id: PARENT_ID } } },
      { ok: true, json: { patient: { id: PATIENT_ID } } },
    ])

    await saveOcrResults({
      parentFields: { client_name: 'Jane' },
      childFields: { baby_name: 'Baby' },
      growthEntries: [],
      vaccinations: [],
      fetch: fetch as unknown as typeof globalThis.fetch,
    })

    const patientCall = fetch.mock.calls[1]
    const body = JSON.parse((patientCall[1] as RequestInit).body as string)
    expect(body.parent_id).toBe(PARENT_ID)
  })

  it('saves growth entries after patient creation', async () => {
    const growth: OcrGrowthEntry[] = [{
      measurement_date: '2026-01-01', age_label: '6 weeks',
      weight_grams: 4000, length_cm: null, head_circumference_cm: null, notes: '',
    }]
    const fetch = mockFetch([
      { ok: true, json: { parent: { id: PARENT_ID } } },
      { ok: true, json: { patient: { id: PATIENT_ID } } },
      { ok: true, json: {} },
    ])

    await saveOcrResults({
      parentFields: { client_name: 'Jane' },
      childFields: {},
      growthEntries: growth,
      vaccinations: [],
      fetch: fetch as unknown as typeof globalThis.fetch,
    })

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[2][0]).toBe(`/api/patients/${PATIENT_ID}/growth`)
  })

  it('saves vaccinations after patient creation', async () => {
    const vax: OcrVaccination[] = [{
      vaccine_name: 'BCG', age_group_label: 'Birth',
      administered_date: '2026-01-01', batch_number: 'B1', site: 'LT',
    }]
    const fetch = mockFetch([
      { ok: true, json: { parent: { id: PARENT_ID } } },
      { ok: true, json: { patient: { id: PATIENT_ID } } },
      { ok: true, json: {} },
    ])

    await saveOcrResults({
      parentFields: { client_name: 'Jane' },
      childFields: {},
      growthEntries: [],
      vaccinations: vax,
      fetch: fetch as unknown as typeof globalThis.fetch,
    })

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[2][0]).toBe(`/api/patients/${PATIENT_ID}/vaccinations`)
  })

  it('throws when parent creation fails', async () => {
    const fetch = mockFetch([
      { ok: false, json: { error: 'client_name required' } },
    ])

    await expect(saveOcrResults({
      parentFields: {},
      childFields: {},
      growthEntries: [],
      vaccinations: [],
      fetch: fetch as unknown as typeof globalThis.fetch,
    })).rejects.toThrow('client_name required')
  })

  it('throws when patient creation fails', async () => {
    const fetch = mockFetch([
      { ok: true, json: { parent: { id: PARENT_ID } } },
      { ok: false, json: { error: 'invalid parent_id' } },
    ])

    await expect(saveOcrResults({
      parentFields: { client_name: 'Jane' },
      childFields: {},
      growthEntries: [],
      vaccinations: [],
      fetch: fetch as unknown as typeof globalThis.fetch,
    })).rejects.toThrow('invalid parent_id')
  })
})
