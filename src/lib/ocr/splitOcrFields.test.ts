import { describe, it, expect } from 'vitest'
import { splitOcrFields, PARENT_KEYS, CHILD_KEYS } from './splitOcrFields'

describe('splitOcrFields', () => {
  it('routes parent fields to parentFields', () => {
    const { parentFields, childFields } = splitOcrFields({
      client_name: 'Jane Smith',
      medical_aid_name: 'Discovery',
    })
    expect(parentFields.client_name).toBe('Jane Smith')
    expect(parentFields.medical_aid_name).toBe('Discovery')
    expect(childFields).toEqual({})
  })

  it('routes child fields to childFields', () => {
    const { parentFields, childFields } = splitOcrFields({
      baby_name: 'Baby Smith',
      baby_dob: '2026-01-01',
      mode_of_delivery: 'NVD',
    })
    expect(childFields.baby_name).toBe('Baby Smith')
    expect(childFields.baby_dob).toBe('2026-01-01')
    expect(childFields.mode_of_delivery).toBe('NVD')
    expect(parentFields).toEqual({})
  })

  it('splits mixed fields correctly', () => {
    const { parentFields, childFields } = splitOcrFields({
      client_name: 'Jane Smith',
      contact_number: '082 555 1234',
      baby_name: 'Baby Smith',
      birth_weight_kg: '3.20',
    })
    expect(Object.keys(parentFields)).toEqual(
      expect.arrayContaining(['client_name', 'contact_number'])
    )
    expect(Object.keys(childFields)).toEqual(
      expect.arrayContaining(['baby_name', 'birth_weight_kg'])
    )
    expect(parentFields).not.toHaveProperty('baby_name')
    expect(childFields).not.toHaveProperty('client_name')
  })

  it('omits keys not present in the input', () => {
    const { parentFields, childFields } = splitOcrFields({ client_name: 'Jane' })
    expect(Object.keys(parentFields)).toEqual(['client_name'])
    expect(Object.keys(childFields)).toHaveLength(0)
  })

  it('handles empty input', () => {
    const { parentFields, childFields } = splitOcrFields({})
    expect(parentFields).toEqual({})
    expect(childFields).toEqual({})
  })

  it('PARENT_KEYS covers all ParentFormData keys', () => {
    const allParentKeys = [
      'client_name', 'client_id_number', 'partner_name', 'home_address',
      'contact_number', 'email', 'medical_aid_name', 'medical_aid_number',
      'main_member_name', 'main_member_id', 'maternal_history',
      'num_children', 'num_pregnancies', 'gynae_notes',
    ]
    expect(PARENT_KEYS).toEqual(expect.arrayContaining(allParentKeys))
    expect(PARENT_KEYS).toHaveLength(allParentKeys.length)
  })

  it('CHILD_KEYS covers all PatientFormData keys', () => {
    const allChildKeys = [
      'baby_name', 'baby_dob', 'place_of_birth', 'weeks_gestation',
      'birth_weight_kg', 'mode_of_delivery', 'discharge_weight_kg',
      'paed_notes', 'consent_date', 'consent_name',
    ]
    expect(CHILD_KEYS).toEqual(expect.arrayContaining(allChildKeys))
    expect(CHILD_KEYS).toHaveLength(allChildKeys.length)
  })
})
