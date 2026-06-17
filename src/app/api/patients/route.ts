import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { listPatients, createPatient } from '@/lib/db/patients'

const CreatePatientSchema = z.object({
  parent_id: z.string().uuid('parent_id must be a valid UUID'),
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
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const { data, error, count } = await listPatients({
    search: searchParams.get('search') ?? '',
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
    archived: searchParams.get('archived') === 'true',
    parent_id: searchParams.get('parent_id') ?? undefined,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ patients: data, total: count })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CreatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await createPatient(parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('CREATE', 'patients', data.id, data.baby_name ?? undefined)
  return NextResponse.json({ patient: data }, { status: 201 })
}
