import type { ParentFormData, PatientFormData } from '@/types'

export const PARENT_KEYS: ReadonlyArray<keyof ParentFormData> = [
  'client_name', 'client_id_number', 'partner_name', 'home_address',
  'contact_number', 'email', 'medical_aid_name', 'medical_aid_number',
  'main_member_name', 'main_member_id', 'maternal_history',
  'num_children', 'num_pregnancies', 'gynae_notes',
]

export const CHILD_KEYS: ReadonlyArray<keyof PatientFormData> = [
  'baby_name', 'baby_dob', 'place_of_birth', 'weeks_gestation',
  'birth_weight_kg', 'mode_of_delivery', 'discharge_weight_kg',
  'paed_notes', 'consent_date', 'consent_name',
]

export function splitOcrFields(fields: Partial<ParentFormData & PatientFormData>): {
  parentFields: Partial<ParentFormData>
  childFields: Partial<PatientFormData>
} {
  const parentFields: Partial<ParentFormData> = {}
  const childFields: Partial<PatientFormData> = {}

  for (const key of PARENT_KEYS) {
    if (key in fields) parentFields[key] = fields[key] as string
  }
  for (const key of CHILD_KEYS) {
    if (key in fields) childFields[key] = fields[key] as string
  }

  return { parentFields, childFields }
}
