import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { getInvoiceWithLines, updateInvoice } from '@/lib/db/invoices'

const UUID = z.string().uuid()

const UpdateInvoiceSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid']).optional(),
  notes: z.string().nullable().optional(),
  invoice_date: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await getInvoiceWithLines(id)
  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ invoice: data })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const body = await req.json()

  const parsed = UpdateInvoiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })

  const { data, error } = await updateInvoice(id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('UPDATE', 'invoices', id,
    `${data.invoice_number} · ${data.patient_name}`,
    body.status ? { status: body.status } : undefined)
  return NextResponse.json({ invoice: data })
}
