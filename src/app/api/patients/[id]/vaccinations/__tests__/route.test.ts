import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeClient } from '@/test-helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { POST, PUT } from '../route'

const PATIENT_ID  = '11111111-1111-4111-8111-111111111111'
const RECORD_ID   = '22222222-2222-4222-8222-222222222222'
const INVALID_ID  = 'not-a-uuid'

function req(url: string, init?: RequestInit) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new NextRequest(new URL(url, 'http://localhost'), init as any)
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

// ── POST /api/patients/[id]/vaccinations ──────────────────────────────────────

describe('POST /api/patients/[id]/vaccinations', () => {
  it('persists administered_by_third_party and third_party_notes', async () => {
    const record = {
      id: RECORD_ID,
      patient_id: PATIENT_ID,
      vaccine_name: 'Rotarix',
      administered_date: '2026-05-28',
      administered_by_third_party: true,
      third_party_notes: 'Given by Dr Smith at City Clinic',
    }
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: record, error: null }) as ReturnType<typeof createAdminClient>
    )

    const res = await POST(
      req(`http://localhost/api/patients/${PATIENT_ID}/vaccinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccine_name: 'Rotarix',
          administered_date: '2026-05-28',
          administered_by_third_party: true,
          third_party_notes: 'Given by Dr Smith at City Clinic',
        }),
      }),
      params(PATIENT_ID),
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.record.administered_by_third_party).toBe(true)
    expect(body.record.third_party_notes).toBe('Given by Dr Smith at City Clinic')
  })
})

// ── PUT /api/patients/[id]/vaccinations ───────────────────────────────────────

describe('PUT /api/patients/[id]/vaccinations', () => {
  it('passes administered_by_third_party and third_party_notes to the database update', async () => {
    const updated = {
      id: RECORD_ID,
      patient_id: PATIENT_ID,
      vaccine_name: 'Rotarix',
      administered_date: '2026-05-28',
      administered_by_third_party: true,
      third_party_notes: 'Given at well-baby clinic',
    }
    const client = makeClient({ data: updated, error: null })
    vi.mocked(createAdminClient).mockReturnValue(
      client as ReturnType<typeof createAdminClient>
    )

    const res = await PUT(
      req(`http://localhost/api/patients/${PATIENT_ID}/vaccinations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: RECORD_ID,
          vaccine_name: 'Rotarix',
          administered_date: '2026-05-28',
          administered_by_third_party: true,
          third_party_notes: 'Given at well-baby clinic',
        }),
      }),
      params(PATIENT_ID),
    )

    expect(res.status).toBe(200)
    expect(client._chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        administered_by_third_party: true,
        third_party_notes: 'Given at well-baby clinic',
      })
    )
  })

  it('accepts administered_by_third_party: false with no notes (default case)', async () => {
    const updated = {
      id: RECORD_ID,
      patient_id: PATIENT_ID,
      vaccine_name: 'Infanrix',
      administered_date: '2026-05-28',
      administered_by_third_party: false,
      third_party_notes: null,
    }
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: updated, error: null }) as ReturnType<typeof createAdminClient>
    )

    const res = await PUT(
      req(`http://localhost/api/patients/${PATIENT_ID}/vaccinations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: RECORD_ID,
          vaccine_name: 'Infanrix',
          administered_date: '2026-05-28',
          administered_by_third_party: false,
        }),
      }),
      params(PATIENT_ID),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.record.administered_by_third_party).toBe(false)
  })

  it('returns 400 for invalid patient UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await PUT(
      req(`http://localhost/api/patients/${INVALID_ID}/vaccinations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: RECORD_ID, vaccine_name: 'X', administered_date: '2026-01-01' }),
      }),
      params(INVALID_ID),
    )
    expect(res.status).toBe(400)
  })
})
