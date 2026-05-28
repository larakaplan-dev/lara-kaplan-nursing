import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeClient } from '@/test-helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET, POST } from '../route'
import { GET as GET_BY_ID } from '../[id]/route'

const PARENT_ID = '12345678-1234-4234-8678-123456789012'

const PATIENT = {
  id: '87654321-4321-4321-8321-210987654321',
  parent_id: PARENT_ID,
  baby_name: 'Baby Smith',
  baby_dob: '2026-01-01',
  deleted_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

function req(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init)
}

beforeEach(() => vi.clearAllMocks())

// ── GET /api/patients ─────────────────────────────────────────────────────────

describe('GET /api/patients', () => {
  it('returns paginated list', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: [PATIENT], error: null, count: 1 }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET(req('http://localhost/api/patients'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.patients).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it('passes parent_id filter to query when provided', async () => {
    const client = makeClient({ data: [], error: null, count: 0 })
    vi.mocked(createAdminClient).mockReturnValue(client as ReturnType<typeof createAdminClient>)

    await GET(req(`http://localhost/api/patients?parent_id=${PARENT_ID}`))
    expect(client._chain.eq).toHaveBeenCalledWith('parent_id', PARENT_ID)
  })

  it('searches by parent client_name when search param provided', async () => {
    const client = makeClient({ data: [], error: null, count: 0 })
    vi.mocked(createAdminClient).mockReturnValue(client as ReturnType<typeof createAdminClient>)

    await GET(req('http://localhost/api/patients?search=smith'))
    expect(client._chain.or).toHaveBeenCalledWith(
      expect.stringContaining('parents.client_name')
    )
  })
})

// ── GET /api/patients/[id] ────────────────────────────────────────────────────

describe('GET /api/patients/[id]', () => {
  it('returns patient with nested parent object', async () => {
    const patientWithParent = {
      ...PATIENT,
      parent: { id: PARENT_ID, client_name: 'Jane Smith', contact_number: '012 345 6789' },
    }
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: patientWithParent, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET_BY_ID(
      req(`http://localhost/api/patients/${PATIENT.id}`),
      { params: Promise.resolve({ id: PATIENT.id }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.patient.parent).toBeDefined()
    expect(body.patient.parent.client_name).toBe('Jane Smith')
  })

  it('returns 400 for non-UUID id', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET_BY_ID(
      req('http://localhost/api/patients/not-a-uuid'),
      { params: Promise.resolve({ id: 'not-a-uuid' }) }
    )
    expect(res.status).toBe(400)
  })
})

// ── POST /api/patients ────────────────────────────────────────────────────────

describe('POST /api/patients', () => {
  it('creates patient with valid parent_id and returns 201', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: PATIENT, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(req('http://localhost/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: PARENT_ID }),
    }))
    expect(res.status).toBe(201)
  })

  it('returns 400 when parent_id is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(req('http://localhost/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when parent_id is not a valid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(req('http://localhost/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_id: 'not-a-uuid' }),
    }))
    expect(res.status).toBe(400)
  })
})
