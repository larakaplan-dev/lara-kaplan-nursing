import { createAdminClient } from '@/lib/supabase/admin'
import type { GrowthEntry } from '@/types'

type CreateGrowthInput = { measurement_date: string } & Partial<Omit<GrowthEntry,
  'id' | 'patient_id' | 'created_at' | 'measurement_date'
>>

export function listGrowthEntries(patientId: string) {
  return createAdminClient()
    .from('growth_entries')
    .select('*')
    .eq('patient_id', patientId)
    .order('measurement_date', { ascending: true })
}

export function createGrowthEntry(patientId: string, input: CreateGrowthInput) {
  return createAdminClient()
    .from('growth_entries')
    .insert([{ ...input, patient_id: patientId }])
    .select()
    .single()
}

export function deleteGrowthEntry(entryId: string) {
  return createAdminClient().from('growth_entries').delete().eq('id', entryId)
}
