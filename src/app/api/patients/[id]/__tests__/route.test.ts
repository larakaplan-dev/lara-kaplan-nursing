import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeClient } from '@/test-helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET } from '../route'

const VALID_ID = '87654321-4321-4321-8321-210987654321'
const INVALID_ID = 'not-a-uuid'

const PARENT = {
  id: '12345678-1234-4234-8678-123456789012',
  client_name: 'Jane Smith',
  contact_number: '082 555 1234',
  medical_aid_name: 'Discovery',
  medical_aid_number: 'DISC123',
}

const PATIENT = {
  id: VALID_ID,
  parent_id: PARENT.id,
  parent: PARENT,
  baby_name: 'Baby Smith',
  baby_dob: '2026-01-01',
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

function req(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init)
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

// ── GET /api/patients/[id] ─────────────────────────────────────────────────────

describe('GET /api/patients/[id]', () => {
  it('returns patient with nested parent object', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: PATIENT, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET(req(`http://localhost/api/patients/${VALID_ID}`), params(VALID_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.patient.id).toBe(VALID_ID)
    expect(body.patient.parent).toBeDefined()
    expect(body.patient.parent.client_name).toBe('Jane Smith')
  })

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET(req(`http://localhost/api/patients/${INVALID_ID}`), params(INVALID_ID))
    expect(res.status).toBe(400)
  })

  it('selects parent fields via join', async () => {
    const client = makeClient({ data: PATIENT, error: null })
    vi.mocked(createAdminClient).mockReturnValue(client as ReturnType<typeof createAdminClient>)

    await GET(req(`http://localhost/api/patients/${VALID_ID}`), params(VALID_ID))
    expect(client._chain.select).toHaveBeenCalledWith(expect.stringContaining('parent'))
  })
})
