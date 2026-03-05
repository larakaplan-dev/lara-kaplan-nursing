import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = z.string().uuid()

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

  const { data, error } = await supabase
    .from('patients')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const action = body.deleted_at === null ? 'RESTORE' : 'UPDATE'
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
