import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeClient } from '@/test-helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { GET, PATCH, DELETE, PUT } from '../route'

const PARENT = {
  id: '12345678-1234-4234-8678-123456789012',
  client_name: 'Jane Smith',
  deleted_at: null,
  deletion_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const VALID_ID = '12345678-1234-4234-8678-123456789012'
const INVALID_ID = 'not-a-uuid'

function req(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init)
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => vi.clearAllMocks())

// ── GET /api/parents/[id] ─────────────────────────────────────────────────────

describe('GET /api/parents/[id]', () => {
  it('returns parent for valid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: PARENT, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET(req(`http://localhost/api/parents/${VALID_ID}`), params(VALID_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.parent.id).toBe(VALID_ID)
  })

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET(req(`http://localhost/api/parents/${INVALID_ID}`), params(INVALID_ID))
    expect(res.status).toBe(400)
  })

  it('returns 404 when parent not found', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: { message: 'Row not found', code: 'PGRST116' } }) as ReturnType<typeof createAdminClient>
    )
    const res = await GET(req(`http://localhost/api/parents/${VALID_ID}`), params(VALID_ID))
    expect(res.status).toBe(404)
  })
})

// ── PATCH /api/parents/[id] ───────────────────────────────────────────────────

describe('PATCH /api/parents/[id]', () => {
  it('updates parent and returns 200', async () => {
    const updated = { ...PARENT, client_name: 'Jane Updated' }
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: updated, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await PATCH(
      req(`http://localhost/api/parents/${VALID_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: 'Jane Updated' }),
      }),
      params(VALID_ID),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.parent.client_name).toBe('Jane Updated')
  })

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await PATCH(
      req(`http://localhost/api/parents/${INVALID_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: 'X' }),
      }),
      params(INVALID_ID),
    )
    expect(res.status).toBe(400)
  })

  it('writes audit_log UPDATE entry', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: PARENT, error: null }) as ReturnType<typeof createAdminClient>
    )
    const { logAudit } = await import('@/lib/audit')

    await PATCH(
      req(`http://localhost/api/parents/${VALID_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: 'Jane Smith' }),
      }),
      params(VALID_ID),
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.anything(), 'UPDATE', 'parents', VALID_ID, 'Jane Smith'
    )
  })
})

// ── DELETE /api/parents/[id] ──────────────────────────────────────────────────

describe('DELETE /api/parents/[id]', () => {
  it('soft-deletes parent and returns 200', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: { client_name: 'Jane Smith' }, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await DELETE(
      req(`http://localhost/api/parents/${VALID_ID}`, { method: 'DELETE' }),
      params(VALID_ID),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await DELETE(
      req(`http://localhost/api/parents/${INVALID_ID}`, { method: 'DELETE' }),
      params(INVALID_ID),
    )
    expect(res.status).toBe(400)
  })

  it('writes audit_log DELETE entry', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: { client_name: 'Jane Smith' }, error: null }) as ReturnType<typeof createAdminClient>
    )
    const { logAudit } = await import('@/lib/audit')

    await DELETE(
      req(`http://localhost/api/parents/${VALID_ID}`, { method: 'DELETE' }),
      params(VALID_ID),
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.anything(), 'DELETE', 'parents', VALID_ID, 'Jane Smith', undefined
    )
  })
})

// ── PUT /api/parents/[id] ─────────────────────────────────────────────────────

describe('PUT /api/parents/[id]', () => {
  it('restores soft-deleted parent and returns 200', async () => {
    const restored = { ...PARENT, deleted_at: null }
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: restored, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await PUT(
      req(`http://localhost/api/parents/${VALID_ID}`, { method: 'PUT' }),
      params(VALID_ID),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.parent.deleted_at).toBeNull()
  })

  it('returns 400 for invalid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await PUT(
      req(`http://localhost/api/parents/${INVALID_ID}`, { method: 'PUT' }),
      params(INVALID_ID),
    )
    expect(res.status).toBe(400)
  })

  it('writes audit_log RESTORE entry', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: PARENT, error: null }) as ReturnType<typeof createAdminClient>
    )
    const { logAudit } = await import('@/lib/audit')

    await PUT(
      req(`http://localhost/api/parents/${VALID_ID}`, { method: 'PUT' }),
      params(VALID_ID),
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.anything(), 'RESTORE', 'parents', VALID_ID, 'Jane Smith'
    )
  })
})
