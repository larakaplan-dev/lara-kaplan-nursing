import { createAdminClient } from '@/lib/supabase/admin'
import type { Invoice, InvoiceServiceLine, InvoiceVaccineLine } from '@/types'

type UpdateInvoiceInput = Partial<Pick<Invoice, 'status' | 'notes' | 'invoice_date'>>

export function listInvoices(opts: {
  patient_id?: string
  status?: string
  limit?: number
} = {}) {
  const { patient_id, status, limit = 50 } = opts
  const db = createAdminClient()
  let q = db
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('invoice_date', { ascending: false })
    .limit(limit)
  if (patient_id) q = q.eq('patient_id', patient_id)
  if (status) q = q.eq('status', status)
  return q
}

export async function getInvoiceWithLines(id: string): Promise<{
  data: (Invoice & { service_lines: InvoiceServiceLine[]; vaccine_lines: InvoiceVaccineLine[] }) | null
  error: { message: string; code?: string } | null
}> {
  const db = createAdminClient()
  const [invoiceRes, serviceRes, vaccineRes] = await Promise.all([
    db.from('invoices').select('*').eq('id', id).single(),
    db.from('invoice_service_lines').select('*').eq('invoice_id', id).order('sort_order'),
    db.from('invoice_vaccine_lines').select('*').eq('invoice_id', id).order('sort_order'),
  ])
  if (invoiceRes.error) return { data: null, error: invoiceRes.error }
  return {
    data: {
      ...invoiceRes.data as Invoice,
      service_lines: (serviceRes.data ?? []) as InvoiceServiceLine[],
      vaccine_lines: (vaccineRes.data ?? []) as InvoiceVaccineLine[],
    },
    error: null,
  }
}

export function createInvoiceWithLines(payload: {
  invoice: object
  service_lines: object[]
  vaccine_lines: object[]
}) {
  return createAdminClient()
    .rpc('create_invoice_with_lines', {
      p_invoice: payload.invoice,
      p_service_lines: payload.service_lines,
      p_vaccine_lines: payload.vaccine_lines,
    })
    .single()
}

export function updateInvoice(id: string, input: UpdateInvoiceInput) {
  return createAdminClient().from('invoices').update(input).eq('id', id).select().single()
}
