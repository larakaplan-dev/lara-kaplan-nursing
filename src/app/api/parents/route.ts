import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { listParents, createParent } from '@/lib/db/parents'

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
  const { searchParams } = new URL(req.url)
  const { data, error, count } = await listParents({
    search: searchParams.get('search') ?? '',
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
    archived: searchParams.get('archived') === 'true',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ parents: data, total: count })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CreateParentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await createParent(parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('CREATE', 'parents', data.id, data.client_name)
  return NextResponse.json({ parent: data }, { status: 201 })
}
