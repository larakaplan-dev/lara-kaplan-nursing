import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logAudit } from '@/lib/audit'
import { listProcedureCodes, createProcedureCode } from '@/lib/db/procedure-codes'

const CreateProcedureCodeSchema = z.object({
  code:        z.string().min(1, 'Code is required'),
  description: z.string().min(1, 'Description is required'),
  price_cents: z.number().int().nonnegative('Price must be a non-negative integer'),
  category:    z.string().min(1, 'Category is required'),
})

export async function GET() {
  const { data, error } = await listProcedureCodes()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ codes: data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = CreateProcedureCodeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await createProcedureCode(parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit('CREATE', 'procedure_codes', data.id, `${data.code} ${data.description}`)
  return NextResponse.json({ code: data }, { status: 201 })
}
