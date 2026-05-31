import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { getMilestones, createMilestoneRecord, deleteMilestoneRecord } from '@/lib/db/milestones'

const UUID = z.string().uuid()

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await getMilestones(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const parsed = z.object({ milestone_key: z.string().min(1) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await createMilestoneRecord(id, parsed.data.milestone_key)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('CREATE', 'milestone_records', data!.id, `Patient ${id} · ${parsed.data.milestone_key}`)
  return NextResponse.json({ record: data }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const milestoneKey = searchParams.get('milestoneKey')
  if (!milestoneKey) return NextResponse.json({ error: 'milestoneKey required' }, { status: 400 })

  const { error } = await deleteMilestoneRecord(id, milestoneKey)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('DELETE', 'milestone_records', milestoneKey, `Patient ${id} · ${milestoneKey}`)
  return NextResponse.json({ success: true })
}
