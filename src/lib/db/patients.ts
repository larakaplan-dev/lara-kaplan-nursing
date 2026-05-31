import { createAdminClient } from '@/lib/supabase/admin'
import type { Patient } from '@/types'

type CreatePatientInput = { parent_id: string } & Partial<Omit<Patient,
  'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'deletion_reason' | 'parent_id' | 'parent'
>>

type UpdatePatientInput = Partial<Omit<Patient, 'id' | 'created_at' | 'updated_at' | 'parent'>>

export function listPatients(opts: {
  search?: string
  limit?: number
  offset?: number
  archived?: boolean
  parent_id?: string
} = {}) {
  const { search = '', limit = 50, offset = 0, archived = false, parent_id } = opts
  const db = createAdminClient()
  let q = db
    .from('patients')
    .select(
      '*, parents!parent_id(client_name, contact_number, email, medical_aid_name, medical_aid_number)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  q = archived ? q.not('deleted_at', 'is', null) : q.is('deleted_at', null)
  if (parent_id) q = q.eq('parent_id', parent_id)
  if (search) q = q.or(`baby_name.ilike.%${search}%,parents.client_name.ilike.%${search}%`)
  return q
}

export function getPatient(id: string) {
  return createAdminClient()
    .from('patients')
    .select('*, parent:parents(*)')
    .eq('id', id)
    .single()
}

export function createPatient(input: CreatePatientInput) {
  return createAdminClient().from('patients').insert([input]).select().single()
}

export function updatePatient(id: string, input: UpdatePatientInput) {
  return createAdminClient().from('patients').update(input).eq('id', id).select().single()
}

export function archivePatient(id: string, reason?: string) {
  return createAdminClient()
    .from('patients')
    .update({ deleted_at: new Date().toISOString(), deletion_reason: reason ?? null })
    .eq('id', id)
    .select('baby_name')
    .single()
}
