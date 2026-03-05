'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScanLine, Upload, CheckCircle2, Loader2, Trash2, Activity, Syringe, User } from 'lucide-react'
import type { PatientFormData, OcrGrowthEntry, OcrVaccination } from '@/types'

type ParsedFields = Partial<PatientFormData>

const PATIENT_FIELDS: Array<{ key: keyof PatientFormData; label: string; type?: string }> = [
  { key: 'client_name', label: 'Mom / Client Name' },
  { key: 'client_id_number', label: 'Client ID Number' },
  { key: 'partner_name', label: 'Partner Name' },
  { key: 'contact_number', label: 'Contact Number' },
  { key: 'email', label: 'Email' },
  { key: 'home_address', label: 'Home Address' },
  { key: 'baby_name', label: "Baby's Name" },
  { key: 'baby_dob', label: "Baby's Date of Birth", type: 'date' },
  { key: 'place_of_birth', label: 'Place of Birth' },
  { key: 'medical_aid_name', label: 'Medical Aid Name' },
  { key: 'medical_aid_number', label: 'Medical Aid Number' },
  { key: 'main_member_name', label: 'Main Member Name' },
  { key: 'main_member_id', label: 'Main Member ID' },
  { key: 'weeks_gestation', label: 'Weeks Gestation' },
  { key: 'mode_of_delivery', label: 'Mode of Delivery' },
  { key: 'birth_weight_grams', label: 'Birth Weight (grams)' },
  { key: 'discharge_weight_grams', label: 'Discharge Weight (grams)' },
  { key: 'num_pregnancies', label: 'Number of Pregnancies' },
  { key: 'num_children', label: 'Number of Children' },
  { key: 'gynae_notes', label: 'Gynaecologist' },
  { key: 'paed_notes', label: 'Paediatrician' },
]

export default function OCRPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)

  const [patientFields, setPatientFields] = useState<ParsedFields | null>(null)
  const [growthEntries, setGrowthEntries] = useState<OcrGrowthEntry[]>([])
  const [vaccinations, setVaccinations] = useState<OcrVaccination[]>([])
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  const hasResults = patientFields !== null

  const handleFile = (f: File) => {
    setFile(f)
    setPatientFields(null)
    setGrowthEntries([])
    setVaccinations([])
    setRawText('')
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleScan = async () => {
    if (!file) return
    setScanning(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPatientFields(json.patientFields || {})
      setGrowthEntries(json.growthEntries || [])
      setVaccinations(json.vaccinations || [])
      setRawText(json.rawText || '')
      toast.success('Form scanned successfully!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const handleSaveAll = async () => {
    if (!patientFields) return
    if (!patientFields.client_name) {
      toast.error('Client name is required before saving')
      return
    }
    setSaving(true)
    try {
      // 1. Save patient
      const patientBody: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(patientFields)) {
        if (!v || v === '') {
          patientBody[k] = null
        } else if (['num_children', 'num_pregnancies', 'birth_weight_grams', 'discharge_weight_grams'].includes(k)) {
          patientBody[k] = parseInt(v as string) || null
        } else if (k === 'weeks_gestation') {
          patientBody[k] = parseFloat(v as string) || null
        } else {
          patientBody[k] = v
        }
      }

      const patientRes = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientBody),
      })
      const patientJson = await patientRes.json()
      if (!patientRes.ok) throw new Error(patientJson.error)
      const patientId = patientJson.patient.id

      // 2. Save growth entries
      for (const entry of growthEntries) {
        if (!entry.measurement_date) continue
        await fetch(`/api/patients/${patientId}/growth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            measurement_date: entry.measurement_date,
            weight_grams: entry.weight_grams,
            length_cm: entry.length_cm,
            head_circumference_cm: entry.head_circumference_cm,
            notes: entry.age_label ? `Age: ${entry.age_label}${entry.notes ? ' — ' + entry.notes : ''}` : entry.notes,
          }),
        })
      }

      // 3. Save vaccinations
      for (const vax of vaccinations) {
        if (!vax.administered_date || !vax.vaccine_name) continue
        await fetch(`/api/patients/${patientId}/vaccinations`, {
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

      toast.success('Patient, growth data and vaccinations saved!')
      router.push(`/patients/${patientId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updatePatientField = (key: keyof PatientFormData, value: string) => {
    setPatientFields(prev => ({ ...prev, [key]: value }))
  }

  const updateGrowth = (idx: number, field: keyof OcrGrowthEntry, value: string) => {
    setGrowthEntries(prev => prev.map((e, i) =>
      i === idx ? { ...e, [field]: field.endsWith('_grams') || field.endsWith('_cm') ? (parseFloat(value) || null) : value } : e
    ))
  }

  const removeGrowth = (idx: number) => {
    setGrowthEntries(prev => prev.filter((_, i) => i !== idx))
  }

  const updateVax = (idx: number, field: keyof OcrVaccination, value: string) => {
    setVaccinations(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  const removeVax = (idx: number) => {
    setVaccinations(prev => prev.filter((_, i) => i !== idx))
  }

  const addGrowthRow = () => {
    setGrowthEntries(prev => [...prev, {
      measurement_date: '', age_label: '', weight_grams: null, length_cm: null, head_circumference_cm: null, notes: ''
    }])
  }

  const addVaxRow = () => {
    setVaccinations(prev => [...prev, {
      vaccine_name: '', age_group_label: '', administered_date: '', batch_number: '', site: ''
    }])
  }

  return (
    <div>
      <TopBar
        title="Scan Patient Form"
        subtitle="Upload a handwritten form to extract patient details, growth data and vaccinations"
      />

      <div className="space-y-5">
        {/* Upload zone */}
        <div className="max-w-2xl space-y-4">
          <Card
            className={`border-2 border-dashed transition-colors cursor-pointer
              ${file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/30'}`}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
              {file ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB · Click to change
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Drop PDF or image here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse · PDF, JPG, PNG</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />

          {file && !hasResults && (
            <Button className="w-full" onClick={handleScan} disabled={scanning}>
              {scanning
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning…</>
                : <><ScanLine className="w-4 h-4 mr-2" />Scan with OCR</>
              }
            </Button>
          )}

          {previewUrl && file?.type !== 'application/pdf' && (
            <div className="rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Uploaded form" className="w-full object-contain max-h-[400px]" />
            </div>
          )}
          {previewUrl && file?.type === 'application/pdf' && (
            <div className="rounded-lg overflow-hidden border border-border bg-muted/30 h-[300px]">
              <iframe src={previewUrl} className="w-full h-full" title="PDF preview" />
            </div>
          )}
        </div>

        {/* Results */}
        {hasResults && (
          <div className="space-y-5">
            {/* Action bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleSaveAll} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Save as New Patient'}
              </Button>
              <Button variant="outline" onClick={handleScan} disabled={scanning}>
                {scanning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Rescanning…</> : <><ScanLine className="w-4 h-4 mr-2" />Rescan</>}
              </Button>
              <Button variant="ghost" onClick={() => { setPatientFields(null); setGrowthEntries([]); setVaccinations([]); setRawText(''); setFile(null); setPreviewUrl(null) }}>
                Reset
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {growthEntries.length} growth entries · {vaccinations.length} vaccinations detected
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* ── Patient Fields ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Patient Details — Review &amp; Correct
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {PATIENT_FIELDS.map(({ key, label, type }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      {key === 'home_address' ? (
                        <Textarea
                          value={(patientFields[key] as string) || ''}
                          onChange={e => updatePatientField(key, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      ) : (
                        <Input
                          type={type || 'text'}
                          value={(patientFields[key] as string) || ''}
                          onChange={e => updatePatientField(key, e.target.value)}
                          className={`text-sm ${patientFields[key] ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
                          placeholder="Not detected"
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-5">
                {/* ── Growth Entries ── */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        Growth Measurements ({growthEntries.length})
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={addGrowthRow}>+ Add row</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {growthEntries.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No growth measurements detected. Add manually or leave blank.</p>
                    )}
                    {growthEntries.map((entry, idx) => (
                      <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            {entry.age_label || `Entry ${idx + 1}`}
                          </span>
                          <button onClick={() => removeGrowth(idx)} className="text-destructive hover:opacity-70">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Date</Label>
                            <Input
                              type="date"
                              value={entry.measurement_date || ''}
                              onChange={e => updateGrowth(idx, 'measurement_date', e.target.value)}
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Age label</Label>
                            <Input
                              value={entry.age_label || ''}
                              onChange={e => updateGrowth(idx, 'age_label', e.target.value)}
                              placeholder="e.g. 6 weeks"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Weight (g)</Label>
                            <Input
                              type="number"
                              value={entry.weight_grams ?? ''}
                              onChange={e => updateGrowth(idx, 'weight_grams', e.target.value)}
                              placeholder="grams"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Length (cm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={entry.length_cm ?? ''}
                              onChange={e => updateGrowth(idx, 'length_cm', e.target.value)}
                              placeholder="cm"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Head circ. (cm)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={entry.head_circumference_cm ?? ''}
                              onChange={e => updateGrowth(idx, 'head_circumference_cm', e.target.value)}
                              placeholder="cm"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Notes</Label>
                            <Input
                              value={entry.notes || ''}
                              onChange={e => updateGrowth(idx, 'notes', e.target.value)}
                              placeholder="optional"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* ── Vaccinations ── */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-primary" />
                        Vaccinations ({vaccinations.length})
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={addVaxRow}>+ Add row</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {vaccinations.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No vaccinations detected. Add manually or leave blank.</p>
                    )}
                    {vaccinations.map((vax, idx) => (
                      <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-700">
                            {vax.vaccine_name || `Vaccination ${idx + 1}`}
                          </span>
                          <button onClick={() => removeVax(idx)} className="text-destructive hover:opacity-70">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <Label className="text-xs">Vaccine name</Label>
                            <Input
                              value={vax.vaccine_name || ''}
                              onChange={e => updateVax(idx, 'vaccine_name', e.target.value)}
                              className={`text-xs h-8 ${vax.vaccine_name ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
                              placeholder="Vaccine name"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Age group</Label>
                            <Input
                              value={vax.age_group_label || ''}
                              onChange={e => updateVax(idx, 'age_group_label', e.target.value)}
                              placeholder="e.g. 6 weeks"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Date given</Label>
                            <Input
                              type="date"
                              value={vax.administered_date || ''}
                              onChange={e => updateVax(idx, 'administered_date', e.target.value)}
                              className={`text-xs h-8 ${vax.administered_date ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Batch number</Label>
                            <Input
                              value={vax.batch_number || ''}
                              onChange={e => updateVax(idx, 'batch_number', e.target.value)}
                              placeholder="optional"
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Site</Label>
                            <Input
                              value={vax.site || ''}
                              onChange={e => updateVax(idx, 'site', e.target.value)}
                              placeholder="e.g. LT, RT"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Raw OCR text */}
            {rawText && (
              <Card>
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowRaw(r => !r)}>
                  <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                    {showRaw ? '▾' : '▸'} Raw OCR Text
                  </CardTitle>
                </CardHeader>
                {showRaw && (
                  <CardContent>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-64 overflow-y-auto leading-relaxed">
                      {rawText}
                    </pre>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
