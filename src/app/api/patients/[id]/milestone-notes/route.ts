import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { upsertMilestoneNote } from '@/lib/db/milestones'

const UUID = z.string().uuid()

const UpsertSchema = z.object({
  age_group_key: z.string().min(1),
  note: z.string(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const parsed = UpsertSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await upsertMilestoneNote(id, parsed.data.age_group_key, parsed.data.note)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('UPDATE', 'milestone_notes', data.id, `Patient ${id} · ${parsed.data.age_group_key}`)
  return NextResponse.json({ note: data })
}
