import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeClient } from '@/test-helpers/supabase-mock'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import { POST } from '../route'

const PATIENT_ID = '11111111-1111-4111-8111-111111111111'
const PARENT_ID  = '22222222-2222-4222-8222-222222222222'

const INVOICE = {
  id: '33333333-3333-4333-8333-333333333333',
  invoice_number: 'INV-001',
  patient_id: PATIENT_ID,
  parent_id: PARENT_ID,
  patient_name: 'Baby Smith',
  invoice_date: '2026-05-28',
  status: 'draft',
}

function req(url: string, body: unknown) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => vi.clearAllMocks())

// ── POST /api/invoices ────────────────────────────────────────────────────────

describe('POST /api/invoices', () => {
  it('creates invoice and returns 201', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }, { data: INVOICE, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(req('http://localhost/api/invoices', {
      patient_id: PATIENT_ID,
      parent_id: PARENT_ID,
      invoice_date: '2026-05-28',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.invoice.invoice_number).toBe('INV-001')
  })

  it('passes parent_id in the RPC payload', async () => {
    const client = makeClient(
      { data: null, error: null },
      { data: INVOICE, error: null }
    )
    vi.mocked(createAdminClient).mockReturnValue(client as ReturnType<typeof createAdminClient>)

    await POST(req('http://localhost/api/invoices', {
      patient_id: PATIENT_ID,
      parent_id: PARENT_ID,
      invoice_date: '2026-05-28',
    }))

    expect(client.rpc).toHaveBeenCalledWith(
      'create_invoice_with_lines',
      expect.objectContaining({
        p_invoice: expect.objectContaining({ parent_id: PARENT_ID }),
      })
    )
  })

  it('returns 400 when patient_id is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(req('http://localhost/api/invoices', {
      parent_id: PARENT_ID,
      invoice_date: '2026-05-28',
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when parent_id is not a valid UUID', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeClient({ data: null, error: null }) as ReturnType<typeof createAdminClient>
    )
    const res = await POST(req('http://localhost/api/invoices', {
      patient_id: PATIENT_ID,
      parent_id: 'not-a-uuid',
      invoice_date: '2026-05-28',
    }))
    expect(res.status).toBe(400)
  })
})
