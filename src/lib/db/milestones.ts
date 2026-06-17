import { createAdminClient } from '@/lib/supabase/admin'
import type { MilestoneRecord, MilestoneNote } from '@/types'

export async function getMilestones(patientId: string): Promise<{
  data: { records: MilestoneRecord[]; notes: MilestoneNote[] } | null
  error: { message: string } | null
}> {
  const db = createAdminClient()
  const [{ data: records, error: recErr }, { data: notes, error: notesErr }] = await Promise.all([
    db.from('milestone_records').select('*').eq('patient_id', patientId).order('checked_at', { ascending: true }),
    db.from('milestone_notes').select('*').eq('patient_id', patientId),
  ])
  if (recErr) return { data: null, error: recErr }
  if (notesErr) return { data: null, error: notesErr }
  return { data: { records: records ?? [], notes: notes ?? [] }, error: null }
}

export async function createMilestoneRecord(patientId: string, milestoneKey: string): Promise<{
  data: MilestoneRecord | null
  error: { message: string; code?: string } | null
}> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('milestone_records')
    .insert([{ patient_id: patientId, milestone_key: milestoneKey }])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // Already checked — fetch and return existing record
      const { data: existing } = await db
        .from('milestone_records')
        .select('*')
        .eq('patient_id', patientId)
        .eq('milestone_key', milestoneKey)
        .single()
      return { data: existing as MilestoneRecord, error: null }
    }
    return { data: null, error }
  }
  return { data: data as MilestoneRecord, error: null }
}

export function deleteMilestoneRecord(patientId: string, milestoneKey: string) {
  return createAdminClient()
    .from('milestone_records')
    .delete()
    .eq('patient_id', patientId)
    .eq('milestone_key', milestoneKey)
}

export function upsertMilestoneNote(patientId: string, ageGroupKey: string, note: string) {
  return createAdminClient()
    .from('milestone_notes')
    .upsert(
      { patient_id: patientId, age_group_key: ageGroupKey, note, updated_at: new Date().toISOString() },
      { onConflict: 'patient_id,age_group_key' },
    )
    .select()
    .single()
}
