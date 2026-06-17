// ============================================================
// Core domain types
// ============================================================

export interface Parent {
  id: string
  client_name: string
  client_id_number: string | null
  partner_name: string | null
  home_address: string | null
  contact_number: string | null
  email: string | null
  medical_aid_name: string | null
  medical_aid_number: string | null
  main_member_name: string | null
  main_member_id: string | null
  maternal_history: string | null
  num_children: number | null
  num_pregnancies: number | null
  gynae_notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deletion_reason: string | null
}

export interface Patient {
  id: string
  parent_id: string
  parent?: Parent
  baby_name: string | null
  baby_dob: string | null
  place_of_birth: string | null
  weeks_gestation: number | null
  birth_weight_grams: number | null
  mode_of_delivery: 'NVD' | 'C-Section' | 'Assisted' | null
  discharge_weight_grams: number | null
  sex: 'male' | 'female' | null
  paed_notes: string | null
  consent_date: string | null
  consent_name: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deletion_reason: string | null
}

export interface GrowthEntry {
  id: string
  patient_id: string
  measurement_date: string
  age_weeks: number | null
  age_months: number | null
  weight_grams: number | null
  length_cm: number | null
  head_circumference_cm: number | null
  notes: string | null
  created_at: string
}

export interface PrevaxQuestionnaire {
  id: string
  patient_id: string
  questionnaire_date: string
  serious_reaction: boolean | null
  seizure_history: boolean | null
  allergies: boolean | null
  vaccinated_last_4_weeks: boolean | null
  currently_sick: boolean | null
  on_medication: boolean | null
  immune_suppressing_agents: boolean | null
  recurrent_illness: boolean | null
  coughing: boolean | null
  runny_nose: boolean | null
  runny_nose_colour: string | null
  mood: string | null
  general_appearance: string | null
  temperature_celsius: number | null
  observation_notes: string | null
  created_at: string
}

export interface VaccineCatalog {
  id: string
  name: string
  nappi_code: string | null
  icd10_code: string | null
  default_price_cents: number
  tariff_code: string
  active: boolean
}

export interface VaccinationRecord {
  id: string
  patient_id: string
  questionnaire_id: string | null
  vaccine_id: string | null
  vaccine_name: string
  age_group_label: string | null
  administered_date: string
  batch_number: string | null
  expiry_date: string | null
  site: string | null
  nappi_code: string | null
  price_cents: number | null
  administered_by_third_party: boolean
  third_party_notes: string | null
  created_at: string
}

export interface ProcedureCode {
  id: string
  code: string
  description: string
  price_cents: number
  category: string
}

export interface Invoice {
  id: string
  patient_id: string
  parent_id: string | null
  invoice_number: string
  invoice_date: string
  patient_name: string
  patient_dob: string | null
  medical_aid_name: string | null
  medical_aid_number: string | null
  main_member_name: string | null
  main_member_id: string | null
  services_total_cents: number
  vaccines_total_cents: number
  grand_total_cents: number
  status: 'draft' | 'sent' | 'paid'
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  service_lines?: InvoiceServiceLine[]
  vaccine_lines?: InvoiceVaccineLine[]
}

export interface InvoiceServiceLine {
  id: string
  invoice_id: string
  service_date: string
  description: string
  icd10_code: string | null
  procedure_code: string
  unit_price_cents: number
  quantity: number
  total_cents: number
  sort_order: number
}

export interface InvoiceVaccineLine {
  id: string
  invoice_id: string
  vaccination_record_id: string | null
  vaccine_date: string
  tariff_code: string
  vaccine_name: string
  icd10_code: string | null
  nappi_code: string | null
  unit_price_cents: number
  quantity: number
  total_cents: number
  sort_order: number
}

// ============================================================
// Form input types (for React Hook Form)
// ============================================================

export type ParentFormData = {
  client_name: string
  client_id_number: string
  partner_name: string
  home_address: string
  contact_number: string
  email: string
  medical_aid_name: string
  medical_aid_number: string
  main_member_name: string
  main_member_id: string
  maternal_history: string
  num_children: string
  num_pregnancies: string
  gynae_notes: string
}

export type PatientFormData = {
  baby_name: string
  baby_dob: string
  place_of_birth: string
  weeks_gestation: string
  birth_weight_grams: string
  mode_of_delivery: string
  discharge_weight_grams: string
  sex: string
  paed_notes: string
  consent_date: string
  consent_name: string
}

export type GrowthEntryFormData = {
  measurement_date: string
  age_weeks: string
  age_months: string
  weight_grams: string
  length_cm: string
  head_circumference_cm: string
  notes: string
}

export type VaccinationFormData = {
  vaccine_id: string
  vaccine_name: string
  age_group_label: string
  administered_date: string
  batch_number: string
  expiry_date: string
  site: string
  nappi_code: string
  price_cents: string
  administered_by_third_party: boolean
  third_party_notes: string
}

export type InvoiceServiceLineForm = {
  service_date: string
  description: string
  icd10_code: string
  procedure_code: string
  unit_price_cents: number
  quantity: number
}

export type InvoiceVaccineLineForm = {
  vaccine_date: string
  tariff_code: string
  vaccine_name: string
  icd10_code: string
  nappi_code: string
  unit_price_cents: number
  quantity: number
  vaccination_record_id?: string
}

export interface InvoicePDFData {
  invoiceNumber: string
  invoiceDate: string
  patientName: string
  patientDob: string | null | undefined
  medicalAidName: string | null | undefined
  medicalAidNumber: string | null | undefined
  mainMemberName: string | null | undefined
  mainMemberId: string | null | undefined
  serviceLines: InvoiceServiceLineForm[]
  vaccineLines: InvoiceVaccineLineForm[]
  servicesTotalCents: number
  vaccinesTotalCents: number
  grandTotalCents: number
  isPaid: boolean
  paidAt: string | null
}

export interface MilestoneRecord {
  id: string
  patient_id: string
  milestone_key: string
  checked_at: string
  created_at: string
}

export interface MilestoneNote {
  id: string
  patient_id: string
  age_group_key: string
  note: string
  updated_at: string
  created_at: string
}

export interface AuditLog {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
  table_name: string
  record_id: string
  record_label: string | null
  changes: Record<string, unknown> | null
  performed_at: string
}

// ============================================================
// OCR result types
// ============================================================

export type OcrGrowthEntry = {
  measurement_date: string
  age_label: string          // e.g. "6 weeks", "3 months"
  weight_grams: number | null
  length_cm: number | null
  head_circumference_cm: number | null
  notes: string
}

export type OcrVaccination = {
  vaccine_name: string
  age_group_label: string    // e.g. "Birth", "6 weeks"
  administered_date: string
  batch_number: string
  site: string
}

export type OcrExtractedData = {
  patientFields: Partial<ParentFormData & PatientFormData>
  growthEntries: OcrGrowthEntry[]
  vaccinations: OcrVaccination[]
}
