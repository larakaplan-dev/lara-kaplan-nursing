import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { listVaccines, createVaccine } from '@/lib/db/vaccines'
import { VACCINE_CATALOG_AGE_GROUPS } from '@/lib/ageGroups'

const CreateVaccineSchema = z.object({
  name:                z.string().min(1, 'Name is required'),
  nappi_code:          z.string().nullable().optional(),
  icd10_code:          z.string().nullable().optional(),
  default_price_cents: z.number().int().nonnegative('Price must be a non-negative integer'),
  tariff_code:         z.string().default('88454'),
  active:              z.boolean().default(true),
  age_group_labels:    z.array(z.enum(VACCINE_CATALOG_AGE_GROUPS))
                         .refine(labels => new Set(labels).size === labels.length, 'Age groups must be unique')
                         .default([]),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const { data, error } = await listVaccines({ showAll: searchParams.get('all') === 'true' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vaccines: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CreateVaccineSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await createVaccine(parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('CREATE', 'vaccine_catalog', data.id, data.name)
  return NextResponse.json({ vaccine: data }, { status: 201 })
}
