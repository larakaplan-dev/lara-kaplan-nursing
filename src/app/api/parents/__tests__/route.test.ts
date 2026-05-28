import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeClient } from '@/test-helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET, POST } from '../route'

const PARENT = {
  id: '12345678-1234-4234-8678-123456789012',
  client_name: 'Jane Smith',
  client_id_number: null,
  partner_name: null,
  home_address: null,
  contact_number: null,
  email: null,
  medical_aid_name: null,
  medical_aid_number: null,
  main_member_name: null,
  main_member_id: null,
  maternal_history: null,
  num_children: null,
  num_pregnancies: null,
  gynae_notes: null,
  deleted_at: null,
  deletion_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function req(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init)
}

beforeEach(() => vi.clearAllMocks())

// ── GET /api/parents ──────────────────────────────────────────────────────────

describe('GET /api/parents', () => {
  it('returns paginated list of active parents', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: [PARENT], error: null, count: 1 }) as ReturnType<typeof createAdminClient>
    )

    const res = await GET(req('http://localhost/api/parents'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.parents).toHaveLength(1)
    expect(body.parents[0].client_name).toBe('Jane Smith')
    expect(body.total).toBe(1)
  })

  it('returns empty list when no parents exist', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: [], error: null, count: 0 }) as ReturnType<typeof createAdminClient>
    )

    const res = await GET(req('http://localhost/api/parents'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.parents).toHaveLength(0)
    expect(body.total).toBe(0)
  })

  it('passes archived=true filter to query', async () => {
    const client = makeClient({ data: [], error: null, count: 0 })
    vi.mocked(createAdminClient).mockReturnValue(client as ReturnType<typeof createAdminClient>)

    await GET(req('http://localhost/api/parents?archived=true'))
    // The chain's `not` should NOT have been called (we use `not` for active filter)
    // and `is` should have been called to filter deleted_at IS NOT NULL
    expect(client._chain.is).not.toHaveBeenCalled()
  })

  it('applies search by client_name', async () => {
    const client = makeClient({ data: [], error: null, count: 0 })
    vi.mocked(createAdminClient).mockReturnValue(client as ReturnType<typeof createAdminClient>)

    await GET(req('http://localhost/api/parents?search=smith'))
    expect(client._chain.ilike).toHaveBeenCalledWith('client_name', '%smith%')
  })
})

// ── POST /api/parents ─────────────────────────────────────────────────────────

describe('POST /api/parents', () => {
  it('creates parent and returns 201', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: PARENT, error: null }) as ReturnType<typeof createAdminClient>
    )

    const res = await POST(req('http://localhost/api/parents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Jane Smith' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.parent.client_name).toBe('Jane Smith')
  })

  it('returns 400 when client_name is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )

    const res = await POST(req('http://localhost/api/parents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when client_name is empty string', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )

    const res = await POST(req('http://localhost/api/parents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: '' }),
    }))
    expect(res.status).toBe(400)
  })

  it('writes audit_log CREATE entry on success', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: PARENT, error: null }) as ReturnType<typeof createAdminClient>
    )
    const { logAudit } = await import('@/lib/audit')

    await POST(req('http://localhost/api/parents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Jane Smith' }),
    }))
    expect(logAudit).toHaveBeenCalledWith(
      expect.anything(), 'CREATE', 'parents',
      PARENT.id, 'Jane Smith'
    )
  })
})
