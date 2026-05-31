import { createAdminClient } from '@/lib/supabase/admin'
import type { VaccineCatalog } from '@/types'

type CreateVaccineInput = Omit<VaccineCatalog, 'id' | 'nappi_code' | 'icd10_code'> & {
  nappi_code?: string | null
  icd10_code?: string | null
}
type UpdateVaccineInput = Partial<Omit<VaccineCatalog, 'id'>>

export function listVaccines(opts: { showAll?: boolean } = {}) {
  const db = createAdminClient()
  const q = db.from('vaccine_catalog').select('*').order('name')
  return opts.showAll ? q : q.eq('active', true)
}

export function createVaccine(input: CreateVaccineInput) {
  return createAdminClient().from('vaccine_catalog').insert([input]).select().single()
}

export function updateVaccine(id: string, input: UpdateVaccineInput) {
  return createAdminClient().from('vaccine_catalog').update(input).eq('id', id).select().single()
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
