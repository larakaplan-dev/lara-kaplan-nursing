import { createAdminClient } from '@/lib/supabase/admin'
import type { VaccineCatalog } from '@/types'

type AdminClient = ReturnType<typeof createAdminClient>

type CreateVaccineInput = Omit<VaccineCatalog, 'id' | 'nappi_code' | 'icd10_code' | 'age_group_labels'> & {
  nappi_code?: string | null
  icd10_code?: string | null
  age_group_labels?: string[]
}
type UpdateVaccineInput = Partial<Omit<VaccineCatalog, 'id'>>

type VaccineRow = Omit<VaccineCatalog, 'age_group_labels'> & {
  vaccine_catalog_age_groups: { age_group_label: string }[] | null
}

function withAgeGroupLabels(row: VaccineRow): VaccineCatalog {
  const { vaccine_catalog_age_groups, ...vaccine } = row
  return { ...vaccine, age_group_labels: (vaccine_catalog_age_groups ?? []).map(g => g.age_group_label) }
}

async function replaceAgeGroups(db: AdminClient, vaccineId: string, labels: string[]) {
  const { error: deleteError } = await db.from('vaccine_catalog_age_groups').delete().eq('vaccine_id', vaccineId)
  if (deleteError) return deleteError
  if (labels.length === 0) return null
  const { error: insertError } = await db
    .from('vaccine_catalog_age_groups')
    .insert(labels.map(age_group_label => ({ vaccine_id: vaccineId, age_group_label })))
  return insertError
}

async function fetchVaccineWithAgeGroups(db: AdminClient, id: string) {
  const { data, error } = await db
    .from('vaccine_catalog')
    .select('*, vaccine_catalog_age_groups(age_group_label)')
    .eq('id', id)
    .single()
  if (error) return { data: null, error }
  return { data: withAgeGroupLabels(data as unknown as VaccineRow), error: null }
}

export async function listVaccines(opts: { showAll?: boolean } = {}) {
  const db = createAdminClient()
  let q = db.from('vaccine_catalog').select('*, vaccine_catalog_age_groups(age_group_label)').order('name')
  if (!opts.showAll) q = q.eq('active', true)
  const { data, error } = await q
  if (error) return { data: null, error }
  return { data: (data as unknown as VaccineRow[]).map(withAgeGroupLabels), error: null }
}

export async function createVaccine(input: CreateVaccineInput) {
  const { age_group_labels, ...vaccineFields } = input
  const db = createAdminClient()
  const { data, error } = await db.from('vaccine_catalog').insert([vaccineFields]).select().single()
  if (error) return { data: null, error }

  const groupsError = await replaceAgeGroups(db, data.id, age_group_labels ?? [])
  if (groupsError) return { data: null, error: groupsError }

  return fetchVaccineWithAgeGroups(db, data.id)
}

export async function updateVaccine(id: string, input: UpdateVaccineInput) {
  const { age_group_labels, ...vaccineFields } = input
  const db = createAdminClient()

  if (Object.keys(vaccineFields).length > 0) {
    const { error } = await db.from('vaccine_catalog').update(vaccineFields).eq('id', id)
    if (error) return { data: null, error }
  }

  if (age_group_labels !== undefined) {
    const groupsError = await replaceAgeGroups(db, id, age_group_labels)
    if (groupsError) return { data: null, error: groupsError }
  }

  return fetchVaccineWithAgeGroups(db, id)
}

export async function deleteVaccine(id: string): Promise<{
  data: { deleted?: boolean; deactivated?: boolean; name: string } | null
  error: { message: string } | null
}> {
  const db = createAdminClient()
  const { count, error: checkError } = await db
    .from('vaccination_records')
    .select('id', { count: 'exact', head: true })
    .eq('vaccine_id', id)

  if (checkError) return { data: null, error: checkError }

  if (count && count > 0) {
    const { data, error } = await db
      .from('vaccine_catalog')
      .update({ active: false })
      .eq('id', id)
      .select('name')
      .single()
    if (error) return { data: null, error }
    return { data: { deactivated: true, name: (data as { name: string }).name }, error: null }
  }

  const { data, error } = await db
    .from('vaccine_catalog')
    .delete()
    .eq('id', id)
    .select('name')
    .single()
  if (error) return { data: null, error }
  return { data: { deleted: true, name: (data as { name: string }).name }, error: null }
}
