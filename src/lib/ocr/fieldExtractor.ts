import type { ParentFormData, PatientFormData, OcrGrowthEntry, OcrVaccination, OcrExtractedData } from '@/types'

type PartialPatient = Partial<ParentFormData & PatientFormData>

// ─── Label detection ──────────────────────────────────────────────────────────
// These are the printed form labels. Any line matching these is a label, not a value.
const LABEL_PATTERNS = [
  /^client\s*information/i,
  /^lara\s*kaplan/i,
  /^private\s*nursing/i,
  /^client\s*(name|id|surname)/i,
  /^partners?\s*name/i,
  /^baby'?s?\s*(name|date|dob|d\.o\.b)/i,
  /^place\s*of\s*birth/i,
  /^home\s*address/i,
  /^contact\s*details/i,
  /^email\s*address/i,
  /^medical\s*aid/i,
  /^main\s*member/i,
  /^history\s*of\s*pregnancy/i,
  /^maternal\s*history/i,
  /^number\s*of\s*(children|pregnanc)/i,
  /^gynie/i,
  /^baby'?s?\s*history/i,
  /^weeks?\s*gestation/i,
  /^weight\s*at\s*birth/i,
  /^mode\s*of\s*delivery/i,
  /^discharge\s*weight/i,
  /^paed/i,
  /^consent/i,
  /^signature/i,
  /^date\s*:/i,
]

function isFormLabel(line: string): boolean {
  const t = line.trim()
  if (!t) return true
  // Any line that ends with a colon and is short (< 50 chars) is a label
  if (t.endsWith(':') && t.length < 50) return true
  return LABEL_PATTERNS.some(p => p.test(t))
}

// ─── Date parsing ─────────────────────────────────────────────────────────────
const SA_MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
}

function parseSADate(raw: string): string | null {
  // "01 APRIL 2023" or "1 Apr 2023"
  const wordDate = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (wordDate) {
    const [, d, mon, y] = wordDate
    const m = SA_MONTHS[mon.toLowerCase()]
    if (m) return `${y}-${m}-${d.padStart(2, '0')}`
  }
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const numDate = raw.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (numDate) {
    const [, d, mo, y] = numDate
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

// ─── Value type detection ────────────────────────────────────────────────────
function looksLikeSAId(s: string): boolean {
  const d = s.replace(/\D/g, '')
  return d.length === 13
}

function looksLikePhone(s: string): boolean {
  const d = s.replace(/\D/g, '')
  return (d.length >= 9 && d.length <= 11) && /^0/.test(d)
}

function looksLikeEmail(s: string): boolean {
  return s.includes('@')
}

function looksLikeDate(s: string): boolean {
  return !!parseSADate(s)
}

function looksLikeNumber(s: string): boolean {
  return /^\d[\d\s\-\.]+\d$/.test(s.trim())
}

// ─── Main extractor ──────────────────────────────────────────────────────────
export function extractPatientFields(rawText: string): PartialPatient {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const fields: PartialPatient = {}

  // ── Pass 1: same-line extractions (work regardless of form layout) ────────
  for (const line of lines) {
    // Mode of delivery (often same-line: "Mode of Delivery: NVD")
    if (!fields.mode_of_delivery) {
      const m = line.match(/mode\s*of\s*delivery\s*[:\-]\s*(.+)/i)
      if (m) {
        const v = m[1].toLowerCase()
        if (v.includes('caesar') || v.includes('c/s') || v.includes('c-sec') || v.includes('csec')) {
          fields.mode_of_delivery = 'C-Section'
        } else if (v.includes('assist') || v.includes('ventouse') || v.includes('forcep')) {
          fields.mode_of_delivery = 'Assisted'
        } else {
          fields.mode_of_delivery = 'NVD'
        }
      }
    }
    // Email anywhere in text
    if (!fields.email) {
      const m = line.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/)
      if (m) fields.email = m[1]
    }
  }

  // ── Pass 2: next-line extraction for later form sections ──────────────────
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].toLowerCase().replace(/[:\-\s]+$/, '')
    const next = lines[i + 1]
    if (!next || isFormLabel(next)) continue

    if (line.match(/weeks?\s*gestation/)) {
      const n = next.match(/(\d+(?:\.\d+)?)/)?.[1]
      if (n && !fields.weeks_gestation) fields.weeks_gestation = n
    }
    if (line.match(/weight\s*at\s*birth/)) {
      const wm = next.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)?/i)
      if (wm && !fields.birth_weight_kg) {
        const val = parseFloat(wm[1].replace(',', '.'))
        const unit = (wm[2] || '').toLowerCase()
        const grams = unit === 'kg' || (val < 20 && unit !== 'g') ? val * 1000 : val
        fields.birth_weight_kg = (grams / 1000).toFixed(2)
      }
    }
    if (line.match(/discharge\s*weight/)) {
      const wm = next.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)?/i)
      if (wm && !fields.discharge_weight_kg) {
        const val = parseFloat(wm[1].replace(',', '.'))
        const unit = (wm[2] || '').toLowerCase()
        const grams = unit === 'kg' || (val < 20 && unit !== 'g') ? val * 1000 : val
        fields.discharge_weight_kg = (grams / 1000).toFixed(2)
      }
    }
    if (line.match(/number\s*of\s*children/)) {
      const n = next.match(/(\d+)/)?.[1]
      if (n && !fields.num_children) fields.num_children = n
    }
    if (line.match(/number\s*of\s*pregnanc/)) {
      const n = next.match(/(\d+)/)?.[1]
      if (n && !fields.num_pregnancies) fields.num_pregnancies = n
    }
    // Standalone number after "Maternal History:" — likely num_children (first value)
    if (line.match(/maternal\s*history/)) {
      const n = next.match(/^(\d+)$/)?.[1]
      if (n && !fields.num_children) fields.num_children = n
    }
  }

  // ── Pass 3: sequential block extraction for the first section ─────────────
  // Find the start of the "values block": the first non-label line
  // that appears after we've seen at least 5 consecutive label lines.
  let consecutiveLabels = 0
  let valuesBlockStart = -1

  for (let i = 0; i < lines.length; i++) {
    if (isFormLabel(lines[i])) {
      consecutiveLabels++
    } else {
      if (consecutiveLabels >= 5) {
        valuesBlockStart = i
        break
      }
      consecutiveLabels = 0
    }
  }

  if (valuesBlockStart < 0) return fields

  // Collect all value lines until we hit the next label block
  const valueLines: string[] = []
  let i = valuesBlockStart
  while (i < lines.length) {
    const line = lines[i]
    // Stop when we hit a run of labels again (next section)
    if (isFormLabel(line)) break
    valueLines.push(line)
    i++
  }

  // Now assign value lines to fields using type-based detection.
  // Expected field sequence from the form:
  //   client_name, client_id_number, partner_name, baby_name, baby_dob,
  //   place_of_birth + home_address (multi-line), contact_number, email,
  //   medical_aid_name, medical_aid_number, main_member_name, main_member_id

  let nameIdx = 0 // tracks which name slot we're filling
  const NAME_SLOTS: Array<keyof (ParentFormData & PatientFormData)> = [
    'client_name', 'partner_name', 'baby_name', 'medical_aid_name', 'main_member_name'
  ]

  const addressLines: string[] = []
  let collectingAddress = false
  let addressDone = false

  for (const val of valueLines) {
    // Skip if it looks like a label (shouldn't happen but safety check)
    if (isFormLabel(val)) continue

    // Email (already extracted in Pass 1 but handle here for address boundary)
    if (looksLikeEmail(val)) {
      if (!fields.email) fields.email = val
      collectingAddress = false
      addressDone = true
      continue
    }

    // SA ID number (13 digits)
    if (looksLikeSAId(val)) {
      const digits = val.replace(/\D/g, '')
      if (!fields.client_id_number) {
        fields.client_id_number = digits
      } else if (!fields.main_member_id) {
        fields.main_member_id = digits
      }
      continue
    }

    // Phone number
    if (looksLikePhone(val)) {
      if (!fields.contact_number) {
        fields.contact_number = val.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
        collectingAddress = false
        addressDone = true
      }
      continue
    }

    // Date
    if (looksLikeDate(val)) {
      if (!fields.baby_dob) {
        fields.baby_dob = parseSADate(val)!
        collectingAddress = true // address comes after DOB
      }
      continue
    }

    // Medical aid number (looks like digits, not an SA ID)
    if (looksLikeNumber(val) && fields.medical_aid_name && !fields.medical_aid_number) {
      fields.medical_aid_number = val.replace(/[^\w\-]/g, '').trim()
      continue
    }

    // Address lines (collect between DOB and phone number)
    if (collectingAddress && !addressDone) {
      addressLines.push(val)
      continue
    }

    // Name slot
    if (nameIdx < NAME_SLOTS.length) {
      const slot = NAME_SLOTS[nameIdx]
      // Once we have medical_aid_name, next name is main_member_name
      ;(fields as Record<string, string>)[slot] = val
      nameIdx++
    }
  }

  // Consolidate address
  if (addressLines.length > 0 && !fields.home_address) {
    // First address line might be place of birth (hospital name)
    if (addressLines.length === 1) {
      if (!fields.place_of_birth) fields.place_of_birth = addressLines[0]
    } else {
      if (!fields.place_of_birth) fields.place_of_birth = addressLines[0]
      if (!fields.home_address) fields.home_address = addressLines.slice(1).join(', ')
    }
  }

  // NAME_SLOTS: [client_name=0, partner_name=1, baby_name=2, medical_aid_name=3, main_member_name=4]

  return fields
}

// ─── Page splitting ───────────────────────────────────────────────────────────
// Splits combined multi-page Vision text into per-page sections.
// If no page markers present (e.g. image upload), returns the full text as page 1.
function splitPages(rawText: string): string[] {
  const pageMarker = /^--- PAGE \d+ ---$/m
  if (!pageMarker.test(rawText)) return [rawText]

  return rawText
    .split(/^--- PAGE \d+ ---\s*/m)
    .map(s => s.trim())
    .filter(Boolean)
}

// ─── SA EPI vaccination schedule ─────────────────────────────────────────────
const AGE_GROUP_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Birth',     pattern: /\b(birth|geboorte|at\s*birth|newborn)\b/i },
  { label: '6 weeks',   pattern: /\b6\s*(?:weeks?|weke|wks?)\b/i },
  { label: '10 weeks',  pattern: /\b10\s*(?:weeks?|weke|wks?)\b/i },
  { label: '14 weeks',  pattern: /\b14\s*(?:weeks?|weke|wks?)\b/i },
  { label: '6 months',  pattern: /\b6\s*(?:months?|maande?|mths?)\b/i },
  { label: '9 months',  pattern: /\b9\s*(?:months?|maande?|mths?)\b/i },
  { label: '12 months', pattern: /\b12\s*(?:months?|maande?|mths?)\b/i },
  { label: '18 months', pattern: /\b18\s*(?:months?|maande?|mths?)\b/i },
  { label: '5 years',   pattern: /\b5\s*(?:years?|jaar|yrs?)\b/i },
  { label: '6 years',   pattern: /\b6\s*(?:years?|jaar|yrs?)\b/i },
  { label: '12 years',  pattern: /\b12\s*(?:years?|jaar|yrs?)\b/i },
]

const VACCINE_KEYWORDS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'BCG',                             pattern: /\bBCG\b/i },
  { name: 'Polio (OPV)',                     pattern: /\bpolio\b|\bOPV\b|\bIPV\b/i },
  { name: 'Hepatitis B',                     pattern: /\bhep(?:atitis)?\s*[Bb]\b|\bHBV\b/i },
  { name: 'Hexavalent (DTaP-IPV-Hib-HepB)', pattern: /\bhex(?:avalent)?\b|\binfanrix\b|\bpentaxim\b|\bDTaP\b|\bDTP\b/i },
  { name: 'PCV (Prevenar)',                  pattern: /\bPCV\b|\bprevenar\b|\bpneumo/i },
  { name: 'Rotavirus (Rotarix)',             pattern: /\brota(?:rix|virus)?\b/i },
  { name: 'Measles',                         pattern: /\bmeasles\b|\bmasels\b/i },
  { name: 'MMR (Priorix)',                   pattern: /\bMMR\b|\bpriorix\b/i },
  { name: 'Varicella (Chickenpox)',          pattern: /\bvaricella\b|\bchicken\s*pox\b|\bvarilrix\b/i },
  { name: 'Influenza (Flu)',                 pattern: /\binfluenza\b|\bfluarix\b|\bvaxigrip\b/i },
  { name: 'Meningococcal B',                pattern: /\bbexsero\b|\btrumenba\b/i },
  { name: 'Meningococcal ACWY',             pattern: /\bACWY\b|\bmenactra\b|\bnimenrix\b/i },
  { name: 'Hepatitis A',                    pattern: /\bhep(?:atitis)?\s*[Aa]\b|\bHAV\b|\bhavrix\b/i },
  { name: 'Typhoid',                        pattern: /\btyphoid\b|\btypherix\b/i },
  { name: 'HPV',                            pattern: /\bHPV\b|\bgardasil\b|\bcervarix\b/i },
]

function detectAgeGroup(text: string): string {
  for (const { label, pattern } of AGE_GROUP_PATTERNS) {
    if (pattern.test(text)) return label
  }
  return ''
}

function detectVaccineName(text: string): string {
  for (const { name, pattern } of VACCINE_KEYWORDS) {
    if (pattern.test(text)) return name
  }
  return ''
}

function extractDateFromText(text: string): string {
  // Try full word date first ("12 April 2023")
  const d = parseSADate(text)
  if (d) return d
  // Short numeric date "12/03/24" or "12/03/2024"
  const m = text.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.](\d{2,4}))\b/)
  if (m) {
    const parsed = parseSADate(m[1])
    if (parsed) return parsed
  }
  return ''
}

function extractBatch(text: string): string {
  // Various batch number formats: AB1234, A1234B, 12345AB, ABC-1234, etc.
  const m = text.match(/\b([A-Z0-9]{2,4}[\-]?[0-9]{3,8}[A-Z0-9]*)\b/)
  return m ? m[1] : ''
}

function extractSite(text: string): string {
  const m = text.match(/\b(LT|RT|IM|SC|ID|oral|left\s*thigh|right\s*thigh|deltoid|gluteal|arm)\b/i)
  return m ? m[1] : ''
}

export function extractVaccinationData(rawText: string): OcrVaccination[] {
  const pages = splitPages(rawText)
  // Vaccination table is on page 4. If only 1 page (image), search all.
  const targetText = pages.length >= 4 ? pages[3] : rawText

  const lines = targetText.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)
  const vaccinations: OcrVaccination[] = []
  let currentAgeGroup = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Update running age group from standalone age lines
    const ageFromLine = detectAgeGroup(line)
    if (ageFromLine) currentAgeGroup = ageFromLine

    // Detect vaccine name in this line
    const vaccineName = detectVaccineName(line)
    if (!vaccineName) continue

    // Build a context window: this line + next 3 lines
    const window = lines.slice(i, Math.min(i + 4, lines.length)).join(' | ')

    // Age group: prefer inline on same line, then fall back to running group
    const inlineAge = detectAgeGroup(line)
    const ageGroup = inlineAge || currentAgeGroup

    // Date: look in same line first, then window
    const date = extractDateFromText(line) || extractDateFromText(window)

    // Only record if administered (date is present)
    if (!date) continue

    // Batch and site from the window
    const batch = extractBatch(window)
    const site = extractSite(window)

    vaccinations.push({
      vaccine_name: vaccineName,
      age_group_label: ageGroup,
      administered_date: date,
      batch_number: batch,
      site,
    })
  }

  return vaccinations
}

// ─── Growth measurement extraction ───────────────────────────────────────────
export function extractGrowthData(rawText: string): OcrGrowthEntry[] {
  const pages = splitPages(rawText)
  // Growth table is on page 2. If only 1 page (image), search all.
  const targetText = pages.length >= 2 ? pages[1] : rawText

  const lines = targetText.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)
  const entries: OcrGrowthEntry[] = []

  // Skip header rows
  const isHeader = (l: string) => /^(date|age|weight|length|head\s*circ|hc|notes?|visit|measurements?)\s*$/i.test(l)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isHeader(line)) continue

    // Find a date in this line
    const measurementDate = extractDateFromText(line)
    if (!measurementDate) continue

    // Gather context: ±2 lines around the date line (table rows sometimes split)
    const ctxLines = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 5))
    const ctx = ctxLines.join(' ')

    // ── Weight ──
    let weight_grams: number | null = null
    const wKg = ctx.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i)
    const wG  = ctx.match(/(\d{3,5}(?:[.,]\d+)?)\s*g\b(?!r)/i)  // 3–5 digit grams
    if (wKg) {
      const v = parseFloat(wKg[1].replace(',', '.'))
      weight_grams = v < 30 ? Math.round(v * 1000) : Math.round(v)
    } else if (wG) {
      const v = parseFloat(wG[1].replace(',', '.'))
      weight_grams = Math.round(v)
    }

    // ── Length / Height ──
    let length_cm: number | null = null
    const allCm = [...ctx.matchAll(/(\d+(?:[.,]\d+)?)\s*cm\b/gi)]
    if (allCm.length >= 1) length_cm = parseFloat(allCm[0][1].replace(',', '.'))

    // ── Head circumference ──
    let head_circumference_cm: number | null = null
    const hcLabel = ctx.match(/(?:HC|OFC|head\s*circ(?:umference)?|kop)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i)
    if (hcLabel) {
      head_circumference_cm = parseFloat(hcLabel[1].replace(',', '.'))
    } else if (allCm.length >= 2) {
      // Second cm value is likely HC
      head_circumference_cm = parseFloat(allCm[1][1].replace(',', '.'))
    }

    // ── Age label ──
    let age_label = ''
    const ageLabelMatch = ctx.match(/\b(\d+\s*(?:weeks?|wks?|months?|mths?|years?|yrs?))\b/i)
    if (ageLabelMatch) age_label = ageLabelMatch[1]

    if (weight_grams || length_cm) {
      entries.push({
        measurement_date: measurementDate,
        age_label,
        weight_kg: weight_grams != null ? +(weight_grams / 1000).toFixed(2) : null,
        length_cm,
        head_circumference_cm,
        notes: '',
      })
    }
  }

  return entries
}

// ─── Combined extractor ───────────────────────────────────────────────────────
export function extractAllFields(rawText: string): OcrExtractedData {
  // Patient fields always come from page 1
  const pages = splitPages(rawText)
  const page1 = pages.length >= 1 ? pages[0] : rawText

  return {
    patientFields: extractPatientFields(page1),
    growthEntries: extractGrowthData(rawText),
    vaccinations: extractVaccinationData(rawText),
  }
}
