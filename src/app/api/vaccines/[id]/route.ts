import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { updateVaccine, deleteVaccine } from '@/lib/db/vaccines'
import { VACCINE_CATALOG_AGE_GROUPS } from '@/lib/ageGroups'

const UUID = z.string().uuid()

const UpdateVaccineSchema = z.object({
  name:                z.string().min(1, 'Name is required').optional(),
  nappi_code:          z.string().nullable().optional(),
  icd10_code:          z.string().nullable().optional(),
  default_price_cents: z.number().int().nonnegative().optional(),
  tariff_code:         z.string().optional(),
  active:              z.boolean().optional(),
  age_group_label:     z.enum(VACCINE_CATALOG_AGE_GROUPS).nullable().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await req.json()
  const parsed = UpdateVaccineSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await updateVaccine(id, parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('UPDATE', 'vaccine_catalog', id, data.name)
  return NextResponse.json({ vaccine: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.safeParse(id).success) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { data, error } = await deleteVaccine(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const auditLabel = data!.name + (data!.deactivated ? ' (deactivated)' : '')
  await logAudit(data!.deactivated ? 'UPDATE' : 'DELETE', 'vaccine_catalog', id, auditLabel)
  return NextResponse.json(data!.deactivated ? { deactivated: true } : { deleted: true })
}
