import { describe, it, expect } from 'vitest'
import { extractAllFields, extractGrowthData, extractVaccinationData, extractPatientFields } from './fieldExtractor'

// Realistic page-1 text: label block followed by value block, matching Lara's intake form layout.
const PAGE_1 = `Lara Kaplan
Private Nursing
Client Information
Client Name:
Client ID Number:
Partner's Name:
Baby's Name:
Baby's Date of Birth:
Home Address:
Contact Number:
Email Address:
Medical Aid:
Medical Aid Number:
Main Member Name:
Main Member ID:
Jane Smith
8501015012082
John Smith
Baby Smith
01/03/2026
Cape Town Hospital
45 Long Street, Cape Town
0825551234
jane@example.com
Discovery Health
78901234
Jane Smith
8501015012093`

// Page 2: growth table rows with date, age, weight and measurements.
const PAGE_2 = `Growth Measurements
01/04/2026 6 weeks 4500g 58 cm 38 cm`

// Page 4: vaccination entries — one administered (BCG with date), one not (OPV without date).
const PAGE_4 = `Vaccination Record
BCG
01/03/2026
LT
AB1234
Polio (OPV)`

describe('extractAllFields', () => {
  it('extracts patient fields from a single-page text', () => {
    const { patientFields, growthEntries, vaccinations } = extractAllFields(PAGE_1)

    expect(patientFields.client_name).toBe('Jane Smith')
    expect(patientFields.client_id_number).toBe('8501015012082')
    expect(patientFields.partner_name).toBe('John Smith')
    expect(patientFields.baby_name).toBe('Baby Smith')
    expect(patientFields.baby_dob).toBe('2026-03-01')
    expect(patientFields.email).toBe('jane@example.com')
    expect(patientFields.contact_number).toBe('082 555 1234')
    expect(patientFields.medical_aid_name).toBe('Discovery Health')
    expect(patientFields.medical_aid_number).toBe('78901234')
    expect(growthEntries).toHaveLength(0)
    expect(vaccinations).toHaveLength(0)
  })

  it('routes growth data from page 2 and vaccinations from page 4 in multi-page text', () => {
    const combined = `--- PAGE 1 ---\n${PAGE_1}\n--- PAGE 2 ---\n${PAGE_2}\n--- PAGE 4 ---\n${PAGE_4}`
    const { patientFields, growthEntries, vaccinations } = extractAllFields(combined)

    // Patient fields still come from page 1
    expect(patientFields.client_name).toBe('Jane Smith')
    expect(patientFields.client_id_number).toBe('8501015012082')

    // Growth data routed from page 2
    expect(growthEntries.length).toBeGreaterThan(0)
    expect(growthEntries[0].weight_kg).toBe(4.5)

    // Vaccination data routed from page 4
    expect(vaccinations.length).toBeGreaterThan(0)
    expect(vaccinations[0].vaccine_name).toBe('BCG')

    // Growth data does not bleed into patient fields
    expect(patientFields).not.toHaveProperty('weight_grams')
  })

  it('returns empty vaccinations when only pages 1 and 2 are present', () => {
    const combined = `--- PAGE 1 ---\n${PAGE_1}\n--- PAGE 2 ---\n${PAGE_2}`
    const { growthEntries, vaccinations } = extractAllFields(combined)

    expect(growthEntries.length).toBeGreaterThan(0)
    expect(vaccinations).toHaveLength(0)
  })
})

describe('extractGrowthData', () => {
  it('converts kg weight to grams', () => {
    const text = `--- PAGE 2 ---\n15/05/2026 2 months 3.5 kg 60 cm 40 cm`
    const entries = extractGrowthData(text)

    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].weight_kg).toBe(3.5)
  })

  it('preserves weight already in grams', () => {
    const text = `--- PAGE 2 ---\n01/04/2026 6 weeks 4500g 58 cm 38 cm`
    const entries = extractGrowthData(text)

    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].weight_kg).toBe(4.5)
  })

  it('extracts age label from the measurement row', () => {
    const text = `--- PAGE 2 ---\n01/04/2026 6 weeks 4500g 58 cm`
    const entries = extractGrowthData(text)

    expect(entries[0].age_label).toMatch(/6\s*weeks/i)
  })
})

describe('extractVaccinationData', () => {
  it('includes vaccinations that have an administered date', () => {
    const text = `--- PAGE 4 ---\nBCG\n01/03/2026\nLT`
    const entries = extractVaccinationData(text)

    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].vaccine_name).toBe('BCG')
    expect(entries[0].administered_date).toBe('2026-03-01')
  })

  it('excludes vaccinations with no administered date', () => {
    const text = `--- PAGE 4 ---\nPolio (OPV)`
    const entries = extractVaccinationData(text)

    expect(entries).toHaveLength(0)
  })

  it('extracts batch number and injection site when present', () => {
    const text = `--- PAGE 4 ---\nBCG\n01/03/2026\nLT\nAB1234`
    const entries = extractVaccinationData(text)

    expect(entries[0].site).toBeTruthy()
    expect(entries[0].batch_number).toBeTruthy()
  })
})

describe('extractPatientFields', () => {
  it('correctly identifies a 13-digit SA ID number', () => {
    const fields = extractPatientFields(PAGE_1)
    expect(fields.client_id_number).toMatch(/^\d{13}$/)
  })

  it('formats a South African phone number', () => {
    const fields = extractPatientFields(PAGE_1)
    // Should be formatted with spaces and start with 0
    expect(fields.contact_number).toMatch(/^0\d{2}\s\d{3}\s\d{4}$/)
  })

  it('extracts an email address', () => {
    const fields = extractPatientFields(PAGE_1)
    expect(fields.email).toBe('jane@example.com')
  })
})
