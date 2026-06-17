import { createAdminClient } from '@/lib/supabase/admin'
import type { VaccinationRecord } from '@/types'

type CreateVaccinationInput = {
  vaccine_name: string
  administered_date: string
} & Partial<Omit<VaccinationRecord, 'id' | 'patient_id' | 'created_at' | 'vaccine_name' | 'administered_date'>>

type UpdateVaccinationInput = Partial<Omit<VaccinationRecord, 'id' | 'patient_id' | 'created_at'>>

export function listVaccinationRecords(patientId: string) {
  return createAdminClient()
    .from('vaccination_records')
    .select('*')
    .eq('patient_id', patientId)
    .order('administered_date', { ascending: true })
}

export function createVaccinationRecord(patientId: string, input: CreateVaccinationInput) {
  return createAdminClient()
    .from('vaccination_records')
    .insert([{ ...input, patient_id: patientId }])
    .select()
    .single()
}

export function updateVaccinationRecord(patientId: string, recordId: string, input: UpdateVaccinationInput) {
  return createAdminClient()
    .from('vaccination_records')
    .update(input)
    .eq('id', recordId)
    .eq('patient_id', patientId)
    .select()
    .single()
}

export function deleteVaccinationRecord(recordId: string) {
  return createAdminClient().from('vaccination_records').delete().eq('id', recordId)
}
