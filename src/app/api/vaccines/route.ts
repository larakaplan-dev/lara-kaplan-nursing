import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const CreateVaccineSchema = z.object({
  name:                z.string().min(1, 'Name is required'),
  nappi_code:          z.string().nullable().optional(),
  icd10_code:          z.string().nullable().optional(),
  default_price_cents: z.number().int().nonnegative('Price must be a non-negative integer'),
  tariff_code:         z.string().default('88454'),
  active:              z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const showAll = searchParams.get('all') === 'true'

  const { data, error } = await (showAll
    ? supabase.from('vaccine_catalog').select('*').order('name')
    : supabase.from('vaccine_catalog').select('*').eq('active', true).order('name'))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vaccines: data })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  const parsed = CreateVaccineSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('vaccine_catalog')
    .insert([parsed.data])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'CREATE', 'vaccine_catalog', data.id, data.name)
  return NextResponse.json({ vaccine: data }, { status: 201 })
}
