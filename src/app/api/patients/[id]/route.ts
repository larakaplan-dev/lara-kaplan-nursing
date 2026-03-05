import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = z.string().uuid()

const UpdatePatientSchema = z.object({
  client_name: z.string().min(1).optional(),
  client_id_number: z.string().nullable().optional(),
  partner_name: z.string().nullable().optional(),
  home_address: z.string().nullable().optional(),
  contact_number: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  baby_name: z.string().nullable().optional(),
  baby_dob: z.string().nullable().optional(),
  place_of_birth: z.string().nullable().optional(),
  medical_aid_name: z.string().nullable().optional(),
  medical_aid_number: z.string().nullable().optional(),
  main_member_name: z.string().nullable().optional(),
  main_member_id: z.string().nullable().optional(),
  maternal_history: z.string().nullable().optional(),
  num_children: z.number().int().nullable().optional(),
  num_pregnancies: z.number().int().nullable().optional(),
  gynae_notes: z.string().nullable().optional(),
  weeks_gestation: z.number().nullable().optional(),
  birth_weight_grams: z.number().int().nullable().optional(),
  mode_of_delivery: z.enum(['NVD', 'C-Section', 'Assisted']).nullable().optional(),
  discharge_weight_grams: z.number().int().nullable().optional(),
  paed_notes: z.string().nullable().optional(),
  consent_date: z.string().nullable().optional(),
  consent_name: z.string().nullable().optional(),
  // Allowed for restore flow (sets deleted_at: null)
  deleted_at: z.string().nullable().optional(),
  deletion_reason: z.string().nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ patient: data })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const body = await req.json()

  const parsed = UpdatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })

  const { data, error } = await supabase
    .from('patients')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const action = parsed.data.deleted_at === null ? 'RESTORE' : 'UPDATE'
  await logAudit(supabase, action, 'patients', id,
    [data.baby_name, data.client_name].filter(Boolean).join(' / '))

  return NextResponse.json({ patient: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const reason: string | undefined = body.reason

  // Soft delete — record is retained for HPCSA 6-year minimum
  const { data, error } = await supabase
    .from('patients')
    .update({ deleted_at: new Date().toISOString(), deletion_reason: reason ?? null })
    .eq('id', id)
    .select('baby_name, client_name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'DELETE', 'patients', id,
    [data.baby_name, data.client_name].filter(Boolean).join(' / '),
    reason ? { reason } : undefined)

  return NextResponse.json({ success: true })
}
