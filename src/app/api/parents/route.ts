import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const CreateParentSchema = z.object({
  client_name: z.string().min(1, 'client_name is required'),
  client_id_number: z.string().nullable().optional(),
  partner_name: z.string().nullable().optional(),
  home_address: z.string().nullable().optional(),
  contact_number: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  medical_aid_name: z.string().nullable().optional(),
  medical_aid_number: z.string().nullable().optional(),
  main_member_name: z.string().nullable().optional(),
  main_member_id: z.string().nullable().optional(),
  maternal_history: z.string().nullable().optional(),
  num_children: z.number().int().nullable().optional(),
  num_pregnancies: z.number().int().nullable().optional(),
  gynae_notes: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const archived = searchParams.get('archived') === 'true'

  let query = supabase
    .from('parents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (archived) {
    query = query.not('deleted_at', 'is', null)
  } else {
    query = query.is('deleted_at', null)
  }

  if (search) {
    query = query.ilike('client_name', `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ parents: data, total: count })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  const parsed = CreateParentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('parents')
    .insert([parsed.data])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, 'CREATE', 'parents', data.id, data.client_name)

  return NextResponse.json({ parent: data }, { status: 201 })
}
