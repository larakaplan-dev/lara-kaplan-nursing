import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeClient } from '@/test-helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET, POST, DELETE } from '../route'

const VALID_ID = '87654321-4321-4321-8321-210987654321'
const INVALID_ID = 'not-a-uuid'

function req(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init)
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

// ── GET /api/patients/[id]/milestones ─────────────────────────────────────────

describe('GET /api/patients/[id]/milestones', () => {
  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET(req(`http://localhost/api/patients/${INVALID_ID}/milestones`), params(INVALID_ID))
    expect(res.status).toBe(400)
  })

  it('returns { records, notes } arrays', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: [], error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET(req(`http://localhost/api/patients/${VALID_ID}/milestones`), params(VALID_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.records)).toBe(true)
    expect(Array.isArray(body.notes)).toBe(true)
  })
})

// ── POST /api/patients/[id]/milestones ────────────────────────────────────────

describe('POST /api/patients/[id]/milestones', () => {
  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(
      req(`http://localhost/api/patients/${INVALID_ID}/milestones`, {
        method: 'POST', body: JSON.stringify({ milestone_key: '2mo_social_1' }),
      }),
      params(INVALID_ID),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when milestone_key is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(
      req(`http://localhost/api/patients/${VALID_ID}/milestones`, {
        method: 'POST', body: JSON.stringify({}),
      }),
      params(VALID_ID),
    )
    expect(res.status).toBe(400)
  })

  it('returns 201 with record on success', async () => {
    const record = { id: 'rec-1', patient_id: VALID_ID, milestone_key: '2mo_social_1', checked_at: '2026-05-31T00:00:00Z', created_at: '2026-05-31T00:00:00Z' }
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: record, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(
      req(`http://localhost/api/patients/${VALID_ID}/milestones`, {
        method: 'POST', body: JSON.stringify({ milestone_key: '2mo_social_1' }),
      }),
      params(VALID_ID),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.record.milestone_key).toBe('2mo_social_1')
  })
})

// ── DELETE /api/patients/[id]/milestones ──────────────────────────────────────

describe('DELETE /api/patients/[id]/milestones', () => {
  it('returns 400 when milestoneKey param is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await DELETE(
      req(`http://localhost/api/patients/${VALID_ID}/milestones`),
      params(VALID_ID),
    )
    expect(res.status).toBe(400)
  })

  it('returns { success: true } on delete', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await DELETE(
      req(`http://localhost/api/patients/${VALID_ID}/milestones?milestoneKey=2mo_social_1`),
      params(VALID_ID),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
