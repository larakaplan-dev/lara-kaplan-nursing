import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = z.string().uuid()

const UpdateVaccineSchema = z.object({
  name:                z.string().min(1, 'Name is required').optional(),
  nappi_code:          z.string().nullable().optional(),
  icd10_code:          z.string().nullable().optional(),
  default_price_cents: z.number().int().nonnegative().optional(),
  tariff_code:         z.string().optional(),
  active:              z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const parsed = UpdateVaccineSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('vaccine_catalog')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'UPDATE', 'vaccine_catalog', id, data.name)
  return NextResponse.json({ vaccine: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  // Check if this vaccine is referenced by any vaccination_records
  const { count, error: checkError } = await supabase
    .from('vaccination_records')
    .select('id', { count: 'exact', head: true })
    .eq('vaccine_id', id)

  if (checkError) return NextResponse.json({ error: checkError.message }, { status: 500 })

  if (count && count > 0) {
    // Soft delete: vaccine is still referenced by records, only deactivate
    const { data, error } = await supabase
      .from('vaccine_catalog')
      .update({ active: false })
      .eq('id', id)
      .select('name')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logAudit(supabase, 'UPDATE', 'vaccine_catalog', id, `${data.name} (deactivated)`)
    return NextResponse.json({ deactivated: true })
  }

  // Hard delete: no references
  const { data, error } = await supabase
    .from('vaccine_catalog')
    .delete()
    .eq('id', id)
    .select('name')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAudit(supabase, 'DELETE', 'vaccine_catalog', id, data.name)
  return NextResponse.json({ deleted: true })
}
