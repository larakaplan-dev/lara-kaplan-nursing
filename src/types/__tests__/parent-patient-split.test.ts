import { describe, it, expectTypeOf } from 'vitest'
import type { Parent, ParentFormData, Patient, PatientFormData, OcrExtractedData } from '../index'

// Compile-time assertion: fails if T has property K
type AssertNoProperty<T, K extends string> = K extends keyof T ? never : true

// ── Parent ────────────────────────────────────────────────────────────────────

describe('Parent', () => {
  it('has required identity and audit fields', () => {
    expectTypeOf<Parent['id']>().toEqualTypeOf<string>()
    expectTypeOf<Parent['created_at']>().toEqualTypeOf<string>()
    expectTypeOf<Parent['updated_at']>().toEqualTypeOf<string>()
    expectTypeOf<Parent['deleted_at']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['deletion_reason']>().toEqualTypeOf<string | null>()
  })

  it('has required guardian name field', () => {
    expectTypeOf<Parent['client_name']>().toEqualTypeOf<string>()
  })

  it('has nullable guardian contact fields', () => {
    expectTypeOf<Parent['client_id_number']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['partner_name']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['home_address']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['contact_number']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['email']>().toEqualTypeOf<string | null>()
  })

  it('has nullable medical aid fields', () => {
    expectTypeOf<Parent['medical_aid_name']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['medical_aid_number']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['main_member_name']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['main_member_id']>().toEqualTypeOf<string | null>()
  })

  it('has nullable pregnancy history fields', () => {
    expectTypeOf<Parent['maternal_history']>().toEqualTypeOf<string | null>()
    expectTypeOf<Parent['num_children']>().toEqualTypeOf<number | null>()
    expectTypeOf<Parent['num_pregnancies']>().toEqualTypeOf<number | null>()
    expectTypeOf<Parent['gynae_notes']>().toEqualTypeOf<string | null>()
  })
})

// ── ParentFormData ────────────────────────────────────────────────────────────

describe('ParentFormData', () => {
  it('has string fields for all guardian data (React Hook Form pattern)', () => {
    expectTypeOf<ParentFormData['client_name']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['client_id_number']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['partner_name']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['home_address']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['contact_number']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['email']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['medical_aid_name']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['medical_aid_number']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['main_member_name']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['main_member_id']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['maternal_history']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['num_children']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['num_pregnancies']>().toEqualTypeOf<string>()
    expectTypeOf<ParentFormData['gynae_notes']>().toEqualTypeOf<string>()
  })
})

// ── Patient ───────────────────────────────────────────────────────────────────

describe('Patient', () => {
  it('has parent_id linking to parent', () => {
    expectTypeOf<Patient['parent_id']>().toEqualTypeOf<string>()
  })

  it('has optional eagerly-loaded parent relation', () => {
    expectTypeOf<Patient['parent']>().toEqualTypeOf<Parent | undefined>()
  })

  it('retains child-specific clinical fields', () => {
    expectTypeOf<Patient['baby_name']>().toEqualTypeOf<string | null>()
    expectTypeOf<Patient['baby_dob']>().toEqualTypeOf<string | null>()
    expectTypeOf<Patient['place_of_birth']>().toEqualTypeOf<string | null>()
    expectTypeOf<Patient['weeks_gestation']>().toEqualTypeOf<number | null>()
    expectTypeOf<Patient['birth_weight_grams']>().toEqualTypeOf<number | null>()
    expectTypeOf<Patient['mode_of_delivery']>().toEqualTypeOf<'NVD' | 'C-Section' | 'Assisted' | null>()
    expectTypeOf<Patient['discharge_weight_grams']>().toEqualTypeOf<number | null>()
    expectTypeOf<Patient['paed_notes']>().toEqualTypeOf<string | null>()
  })

  it('does not have moved guardian fields', () => {
    const _1: AssertNoProperty<Patient, 'client_id_number'> = true
    const _2: AssertNoProperty<Patient, 'partner_name'> = true
    const _3: AssertNoProperty<Patient, 'home_address'> = true
    const _4: AssertNoProperty<Patient, 'contact_number'> = true
    const _5: AssertNoProperty<Patient, 'email'> = true
    const _6: AssertNoProperty<Patient, 'medical_aid_name'> = true
    const _7: AssertNoProperty<Patient, 'medical_aid_number'> = true
    const _8: AssertNoProperty<Patient, 'main_member_name'> = true
    const _9: AssertNoProperty<Patient, 'main_member_id'> = true
    const _10: AssertNoProperty<Patient, 'maternal_history'> = true
    const _11: AssertNoProperty<Patient, 'num_children'> = true
    const _12: AssertNoProperty<Patient, 'num_pregnancies'> = true
    const _13: AssertNoProperty<Patient, 'gynae_notes'> = true
    void [_1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13]
  })
})

// ── PatientFormData ───────────────────────────────────────────────────────────

describe('PatientFormData', () => {
  it('has child-specific form fields', () => {
    expectTypeOf<PatientFormData['baby_name']>().toEqualTypeOf<string>()
    expectTypeOf<PatientFormData['baby_dob']>().toEqualTypeOf<string>()
    expectTypeOf<PatientFormData['weeks_gestation']>().toEqualTypeOf<string>()
    expectTypeOf<PatientFormData['mode_of_delivery']>().toEqualTypeOf<string>()
  })

  it('does not have moved guardian fields', () => {
    const _1: AssertNoProperty<PatientFormData, 'client_id_number'> = true
    const _2: AssertNoProperty<PatientFormData, 'medical_aid_name'> = true
    const _3: AssertNoProperty<PatientFormData, 'maternal_history'> = true
    const _4: AssertNoProperty<PatientFormData, 'num_children'> = true
    const _5: AssertNoProperty<PatientFormData, 'gynae_notes'> = true
    void [_1, _2, _3, _4, _5]
  })
})

// ── OcrExtractedData ──────────────────────────────────────────────────────────

describe('OcrExtractedData', () => {
  it('patientFields accepts fields from both ParentFormData and PatientFormData', () => {
    expectTypeOf<OcrExtractedData['patientFields']>().toEqualTypeOf<Partial<ParentFormData & PatientFormData>>()
  })
})
