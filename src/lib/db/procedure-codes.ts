import { createAdminClient } from '@/lib/supabase/admin'
import type { ProcedureCode } from '@/types'

type CreateProcedureCodeInput = Omit<ProcedureCode, 'id'>
type UpdateProcedureCodeInput = Partial<Omit<ProcedureCode, 'id'>>

export function listProcedureCodes() {
  return createAdminClient().from('procedure_codes').select('*').order('code')
}

export function createProcedureCode(input: CreateProcedureCodeInput) {
  return createAdminClient().from('procedure_codes').insert([input]).select().single()
}

export function updateProcedureCode(id: string, input: UpdateProcedureCodeInput) {
  return createAdminClient().from('procedure_codes').update(input).eq('id', id).select().single()
}

export function deleteProcedureCode(id: string) {
  return createAdminClient()
    .from('procedure_codes')
    .delete()
    .eq('id', id)
    .select('code, description')
    .single()
}
