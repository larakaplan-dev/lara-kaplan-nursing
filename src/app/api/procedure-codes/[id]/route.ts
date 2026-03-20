import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = z.string().uuid()

const UpdateProcedureCodeSchema = z.object({
  code:        z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price_cents: z.number().int().nonnegative().optional(),
  category:    z.string().min(1).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const parsed = UpdateProcedureCodeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('procedure_codes')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'UPDATE', 'procedure_codes', id, `${data.code} ${data.description}`)
  return NextResponse.json({ code: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  // invoice_service_lines stores procedure_code as a text string (not UUID FK),
  // so hard delete is safe and won't break existing invoice records.
  const { data, error } = await supabase
    .from('procedure_codes')
    .delete()
    .eq('id', id)
    .select('code, description')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'DELETE', 'procedure_codes', id, `${data.code} ${data.description}`)
  return NextResponse.json({ deleted: true })
}
