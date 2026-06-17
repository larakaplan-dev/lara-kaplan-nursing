import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { listGrowthEntries, createGrowthEntry, deleteGrowthEntry } from '@/lib/db/growth'

const UUID = z.string().uuid()

const CreateGrowthSchema = z.object({
  measurement_date: z.string().min(1, 'measurement_date is required'),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await listGrowthEntries(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entries: data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const body = await req.json()

  const parsed = CreateGrowthSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await createGrowthEntry(id, body)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('CREATE', 'growth_entries', data.id, `Patient ${id} · ${data.measurement_date}`)
  return NextResponse.json({ entry: data }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const entryId = searchParams.get('entryId')

  if (!entryId) return NextResponse.json({ error: 'entryId required' }, { status: 400 })
  if (!UUID.safeParse(entryId).success) return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 })

  const { error } = await deleteGrowthEntry(entryId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('DELETE', 'growth_entries', entryId, `Patient ${id}`)
  return NextResponse.json({ success: true })
}
