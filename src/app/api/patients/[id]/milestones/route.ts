import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = z.string().uuid()

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const [{ data: records, error: recErr }, { data: notes, error: notesErr }] = await Promise.all([
    supabase.from('milestone_records').select('*').eq('patient_id', id).order('checked_at', { ascending: true }),
    supabase.from('milestone_notes').select('*').eq('patient_id', id),
  ])

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })
  if (notesErr) return NextResponse.json({ error: notesErr.message }, { status: 500 })

  return NextResponse.json({ records: records ?? [], notes: notes ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const parsed = z.object({ milestone_key: z.string().min(1) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('milestone_records')
    .insert([{ patient_id: id, milestone_key: parsed.data.milestone_key }])
    .select()
    .single()

  if (error) {
    // UNIQUE violation — already checked, treat as success
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('milestone_records')
        .select('*')
        .eq('patient_id', id)
        .eq('milestone_key', parsed.data.milestone_key)
        .single()
      return NextResponse.json({ record: existing })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAudit(supabase, 'CREATE', 'milestone_records', data.id,
    `Patient ${id} · ${parsed.data.milestone_key}`)

  return NextResponse.json({ record: data }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient()
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const milestoneKey = searchParams.get('milestoneKey')
  if (!milestoneKey) return NextResponse.json({ error: 'milestoneKey required' }, { status: 400 })

  const { error } = await supabase
    .from('milestone_records')
    .delete()
    .eq('patient_id', id)
    .eq('milestone_key', milestoneKey)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'DELETE', 'milestone_records', milestoneKey,
    `Patient ${id} · ${milestoneKey}`)

  return NextResponse.json({ success: true })
}
