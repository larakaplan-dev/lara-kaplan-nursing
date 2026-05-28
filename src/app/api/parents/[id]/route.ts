import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = z.string().uuid()

const UpdateParentSchema = z.object({
  client_name: z.string().min(1).optional(),
  client_id_number: z.string().nullable().optional(),
  partner_name: z.string().nullable().optional(),
  home_address: z.string().nullable().optional(),
  contact_number: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  medical_aid_name: z.string().nullable().optional(),
  medical_aid_number: z.string().nullable().optional(),
  main_member_name: z.string().nullable().optional(),
  main_member_id: z.string().nullable().optional(),
  maternal_history: z.string().nullable().optional(),
  num_children: z.number().int().nullable().optional(),
  num_pregnancies: z.number().int().nullable().optional(),
  gynae_notes: z.string().nullable().optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ parent: data })
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const parsed = UpdateParentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('parents')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'UPDATE', 'parents', id, data.client_name)

  return NextResponse.json({ parent: data })
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const reason: string | undefined = body.reason

  const { data, error } = await supabase
    .from('parents')
    .update({ deleted_at: new Date().toISOString(), deletion_reason: reason ?? null })
    .eq('id', id)
    .select('client_name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'DELETE', 'parents', id, data.client_name, reason ? { reason } : undefined)

  return NextResponse.json({ success: true })
}

export async function PUT(_req: NextRequest, { params }: RouteContext) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await supabase
    .from('parents')
    .update({ deleted_at: null, deletion_reason: null })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'RESTORE', 'parents', id, data.client_name)

  return NextResponse.json({ parent: data })
}
