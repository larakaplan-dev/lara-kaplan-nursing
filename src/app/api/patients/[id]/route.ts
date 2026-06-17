import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { getPatient, updatePatient, archivePatient } from '@/lib/db/patients'

const UUID = z.string().uuid()

const UpdatePatientSchema = z.object({
  baby_name: z.string().nullable().optional(),
  baby_dob: z.string().nullable().optional(),
  place_of_birth: z.string().nullable().optional(),
  weeks_gestation: z.number().nullable().optional(),
  birth_weight_grams: z.number().int().nullable().optional(),
  mode_of_delivery: z.enum(['NVD', 'C-Section', 'Assisted']).nullable().optional(),
  discharge_weight_grams: z.number().int().nullable().optional(),
  paed_notes: z.string().nullable().optional(),
  consent_date: z.string().nullable().optional(),
  consent_name: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  deletion_reason: z.string().nullable().optional(),
  sex: z.enum(['male', 'female']).nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await getPatient(id)
  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ patient: data })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const body = await req.json()

  const parsed = UpdatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: z.flattenError(parsed.error) }, { status: 400 })

  const { data, error } = await updatePatient(id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const action = parsed.data.deleted_at === null ? 'RESTORE' : 'UPDATE'
  await logAudit(action, 'patients', id, data.baby_name ?? undefined)
  return NextResponse.json({ patient: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const reason: string | undefined = body.reason

  const { data, error } = await archivePatient(id, reason)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('DELETE', 'patients', id, data.baby_name ?? undefined, reason ? { reason } : undefined)
  return NextResponse.json({ success: true })
}
