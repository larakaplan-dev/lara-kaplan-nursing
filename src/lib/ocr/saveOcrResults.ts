import type { ParentFormData, PatientFormData, OcrGrowthEntry, OcrVaccination } from '@/types'

interface SaveOcrOptions {
  parentFields: Partial<ParentFormData>
  childFields: Partial<PatientFormData>
  existingParentId?: string
  growthEntries: OcrGrowthEntry[]
  vaccinations: OcrVaccination[]
  fetch?: typeof globalThis.fetch
}

function coerceParentBody(fields: Partial<ParentFormData>): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (!v || v === '') {
      body[k] = null
    } else if (['num_children', 'num_pregnancies'].includes(k)) {
      body[k] = parseInt(v as string) || null
    } else {
      body[k] = v
    }
  }
  return body
}

function coerceChildBody(fields: Partial<PatientFormData>): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (!v || v === '') {
      body[k] = null
    } else if (['birth_weight_grams', 'discharge_weight_grams'].includes(k)) {
      body[k] = parseInt(v as string) || null
    } else if (k === 'weeks_gestation') {
      body[k] = parseFloat(v as string) || null
    } else {
      body[k] = v
    }
  }
  return body
}

export async function saveOcrResults({
  parentFields,
  childFields,
  existingParentId,
  growthEntries,
  vaccinations,
  fetch: fetchFn = globalThis.fetch,
}: SaveOcrOptions): Promise<{ patientId: string }> {
  let parentId = existingParentId

  if (!parentId) {
    const res = await fetchFn('/api/parents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coerceParentBody(parentFields)),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Failed to create parent')
    parentId = json.parent.id
  }

  const patientRes = await fetchFn('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...coerceChildBody(childFields), parent_id: parentId }),
  })
  const patientJson = await patientRes.json()
  if (!patientRes.ok) throw new Error(patientJson.error ?? 'Failed to create patient')
  const patientId: string = patientJson.patient.id

  for (const entry of growthEntries) {
    if (!entry.measurement_date) continue
    await fetchFn(`/api/patients/${patientId}/growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        measurement_date: entry.measurement_date,
        weight_grams: entry.weight_grams,
        length_cm: entry.length_cm,
        head_circumference_cm: entry.head_circumference_cm,
        notes: entry.age_label
          ? `Age: ${entry.age_label}${entry.notes ? ' — ' + entry.notes : ''}`
          : entry.notes,
      }),
    })
  }

  for (const vax of vaccinations) {
    if (!vax.administered_date || !vax.vaccine_name) continue
    await fetchFn(`/api/patients/${patientId}/vaccinations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaccine_name: vax.vaccine_name,
        age_group_label: vax.age_group_label,
        administered_date: vax.administered_date,
        batch_number: vax.batch_number || null,
        site: vax.site || null,
      }),
    })
  }

  return { patientId }
}
