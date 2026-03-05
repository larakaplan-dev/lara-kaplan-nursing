import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = z.string().uuid()

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const [invoiceRes, serviceRes, vaccineRes] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase.from('invoice_service_lines').select('*').eq('invoice_id', id).order('sort_order'),
    supabase.from('invoice_vaccine_lines').select('*').eq('invoice_id', id).order('sort_order'),
  ])

  if (invoiceRes.error) {
    const status = invoiceRes.error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: invoiceRes.error.message }, { status })
  }

  return NextResponse.json({
    invoice: {
      ...invoiceRes.data,
      service_lines: serviceRes.data || [],
      vaccine_lines: vaccineRes.data || [],
    },
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const body = await req.json()

  const { data, error } = await supabase
    .from('invoices')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'UPDATE', 'invoices', id,
    `${data.invoice_number} · ${data.patient_name}`,
    body.status ? { status: body.status } : undefined)

  return NextResponse.json({ invoice: data })
}
