import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = z.string().uuid()

const CreateVaccinationSchema = z.object({
  vaccine_name: z.string().min(1, 'vaccine_name is required'),
  administered_date: z.string().min(1, 'administered_date is required'),
})

const UpdateVaccinationSchema = z.object({
  recordId:          z.string().uuid('Invalid recordId'),
  vaccine_id:        z.string().uuid().nullable().optional(),
  vaccine_name:      z.string().min(1, 'vaccine_name is required'),
  age_group_label:   z.string().nullable().optional(),
  administered_date: z.string().min(1, 'administered_date is required'),
  batch_number:      z.string().nullable().optional(),
  expiry_date:       z.string().nullable().optional(),
  site:              z.string().nullable().optional(),
  nappi_code:        z.string().nullable().optional(),
  price_cents:       z.number().int().nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await supabase
    .from('vaccination_records')
    .select('*')
    .eq('patient_id', id)
    .order('administered_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const body = await req.json()

  const parsed = CreateVaccinationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('vaccination_records')
    .insert([{ ...body, patient_id: id }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'CREATE', 'vaccination_records', data.id,
    `Patient ${id} · ${data.vaccine_name} · ${data.administered_date}`)

  return NextResponse.json({ record: data }, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const parsed = UpdateVaccinationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { recordId, ...fields } = parsed.data

  const { data, error } = await supabase
    .from('vaccination_records')
    .update(fields)
    .eq('id', recordId)
    .eq('patient_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'UPDATE', 'vaccination_records', recordId,
    `Patient ${id} · ${data.vaccine_name} · ${data.administered_date}`)

  return NextResponse.json({ record: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const recordId = searchParams.get('recordId')

  if (!recordId) return NextResponse.json({ error: 'recordId required' }, { status: 400 })
  if (!UUID.safeParse(recordId).success) return NextResponse.json({ error: 'Invalid recordId' }, { status: 400 })

  const { error } = await supabase.from('vaccination_records').delete().eq('id', recordId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'DELETE', 'vaccination_records', recordId, `Patient ${id}`)

  return NextResponse.json({ success: true })
}
