import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { listInvoices, createInvoiceWithLines } from '@/lib/db/invoices'
import type { Invoice } from '@/types'

const CreateInvoiceSchema = z.object({
  patient_id: z.string().uuid('patient_id must be a valid UUID'),
  parent_id: z.string().uuid('parent_id must be a valid UUID'),
  invoice_date: z.string().min(1, 'invoice_date is required'),
  patient_name: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const { data, error, count } = await listInvoices({
    patient_id: searchParams.get('patient_id') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data, total: count })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CreateInvoiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { service_lines, vaccine_lines, ...invoiceData } = body
  const { data: invoiceRaw, error } = await createInvoiceWithLines({
    invoice: invoiceData,
    service_lines: service_lines ?? [],
    vaccine_lines: vaccine_lines ?? [],
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const invoice = invoiceRaw as Invoice
  await logAudit('CREATE', 'invoices', invoice.id, `${invoice.invoice_number} · ${invoice.patient_name}`)
  return NextResponse.json({ invoice }, { status: 201 })
}
