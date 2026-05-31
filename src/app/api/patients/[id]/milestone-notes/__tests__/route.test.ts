import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeClient } from '@/test-helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { PUT } from '../route'

const VALID_ID = '87654321-4321-4321-8321-210987654321'
const INVALID_ID = 'not-a-uuid'

function req(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init)
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

// ── PUT /api/patients/[id]/milestone-notes ────────────────────────────────────

describe('PUT /api/patients/[id]/milestone-notes', () => {
  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await PUT(
      req(`http://localhost/api/patients/${INVALID_ID}/milestone-notes`, {
        method: 'PUT', body: JSON.stringify({ age_group_key: '2mo', note: 'test' }),
      }),
      params(INVALID_ID),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when body fields are missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await PUT(
      req(`http://localhost/api/patients/${VALID_ID}/milestone-notes`, {
        method: 'PUT', body: JSON.stringify({}),
      }),
      params(VALID_ID),
    )
    expect(res.status).toBe(400)
  })

  it('returns 200 with upserted note', async () => {
    const note = { id: 'note-1', patient_id: VALID_ID, age_group_key: '2mo', note: 'Referred to paed', updated_at: '2026-05-31T00:00:00Z', created_at: '2026-05-31T00:00:00Z' }
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: note, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await PUT(
      req(`http://localhost/api/patients/${VALID_ID}/milestone-notes`, {
        method: 'PUT', body: JSON.stringify({ age_group_key: '2mo', note: 'Referred to paed' }),
      }),
      params(VALID_ID),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.note.age_group_key).toBe('2mo')
    expect(body.note.note).toBe('Referred to paed')
  })
})
