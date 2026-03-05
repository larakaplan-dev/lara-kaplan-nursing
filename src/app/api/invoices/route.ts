import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const CreateInvoiceSchema = z.object({
  patient_id: z.string().uuid('patient_id must be a valid UUID'),
  invoice_date: z.string().min(1, 'invoice_date is required'),
})

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patient_id')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('invoice_date', { ascending: false })
    .limit(limit)

  if (patientId) query = query.eq('patient_id', patientId)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data, total: count })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  const parsed = CreateInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { service_lines, vaccine_lines, ...invoiceData } = body

  // Atomic creation via DB function — wraps header + line inserts in a single transaction
  const { data: invoice, error: invErr } = await supabase
    .rpc('create_invoice_with_lines', {
      p_invoice: invoiceData,
      p_service_lines: service_lines ?? [],
      p_vaccine_lines: vaccine_lines ?? [],
    })
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  await logAudit(supabase, 'CREATE', 'invoices', invoice.id,
    `${invoice.invoice_number} · ${invoice.patient_name}`)

  return NextResponse.json({ invoice }, { status: 201 })
}
