'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScanLine, Upload, CheckCircle2, Loader2, Trash2, Activity, Syringe, User, Users, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { splitOcrFields, PARENT_KEYS, CHILD_KEYS } from '@/lib/ocr/splitOcrFields'
import { saveOcrResults } from '@/lib/ocr/saveOcrResults'
import type { Parent, ParentFormData, PatientFormData, OcrGrowthEntry, OcrVaccination } from '@/types'

type CombinedFormData = ParentFormData & PatientFormData

const PARENT_FIELD_META: Array<{ key: keyof ParentFormData; label: string; type?: string; multiline?: boolean }> = [
  { key: 'client_name', label: 'Mom / Client Name' },
  { key: 'client_id_number', label: 'Client ID Number' },
  { key: 'partner_name', label: 'Partner Name' },
  { key: 'contact_number', label: 'Contact Number' },
  { key: 'email', label: 'Email' },
  { key: 'home_address', label: 'Home Address', multiline: true },
  { key: 'medical_aid_name', label: 'Medical Aid Name' },
  { key: 'medical_aid_number', label: 'Medical Aid Number' },
  { key: 'main_member_name', label: 'Main Member Name' },
  { key: 'main_member_id', label: 'Main Member ID' },
  { key: 'num_pregnancies', label: 'Number of Pregnancies' },
  { key: 'num_children', label: 'Number of Children' },
  { key: 'maternal_history', label: 'Maternal History', multiline: true },
  { key: 'gynae_notes', label: 'Gynaecologist Notes', multiline: true },
]

const CHILD_FIELD_META: Array<{ key: keyof PatientFormData; label: string; type?: string }> = [
  { key: 'baby_name', label: "Baby's Name" },
  { key: 'baby_dob', label: "Baby's Date of Birth", type: 'date' },
  { key: 'place_of_birth', label: 'Place of Birth' },
  { key: 'weeks_gestation', label: 'Weeks Gestation' },
  { key: 'mode_of_delivery', label: 'Mode of Delivery' },
  { key: 'birth_weight_grams', label: 'Birth Weight (grams)' },
  { key: 'discharge_weight_grams', label: 'Discharge Weight (grams)' },
  { key: 'paed_notes', label: 'Paediatrician Notes' },
  { key: 'consent_date', label: 'Consent Date', type: 'date' },
  { key: 'consent_name', label: 'Consenting Person Name' },
]

export default function OCRPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)

  const [parentFields, setParentFields] = useState<Partial<ParentFormData> | null>(null)
  const [childFields, setChildFields] = useState<Partial<PatientFormData> | null>(null)
  const [growthEntries, setGrowthEntries] = useState<OcrGrowthEntry[]>([])
  const [vaccinations, setVaccinations] = useState<OcrVaccination[]>([])
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [existingParentId, setExistingParentId] = useState<string | undefined>()
  const [parentPickerOpen, setParentPickerOpen] = useState(false)

  const { data: parentsData } = useQuery<{ parents: Parent[] }>({
    queryKey: ['parents-select'],
    queryFn: () => fetch('/api/parents?limit=200').then(r => r.json()),
    enabled: parentFields !== null,
    staleTime: 0,
  })
  const parents = parentsData?.parents ?? []
  const selectedExistingParent = parents.find(p => p.id === existingParentId)

  const hasResults = parentFields !== null

  const handleFile = (f: File) => {
    setFile(f)
    setParentFields(null)
    setChildFields(null)
    setGrowthEntries([])
    setVaccinations([])
    setRawText('')
    setExistingParentId(undefined)
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
      const flat: Partial<CombinedFormData> = json.patientFields || {}
      const split = splitOcrFields(flat)
      setParentFields(split.parentFields)
      setChildFields(split.childFields)
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
    if (!parentFields || !childFields) return
    if (!existingParentId && !parentFields.client_name) {
      toast.error('Client name is required before saving')
      return
    }
    setSaving(true)
    try {
      const { patientId } = await saveOcrResults({
        parentFields,
        childFields,
        existingParentId,
        growthEntries,
        vaccinations,
      })
      toast.success('Parent, child, growth data and vaccinations saved!')
      router.push(`/patients/${patientId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateParent = (key: keyof ParentFormData, value: string) =>
    setParentFields(prev => ({ ...prev, [key]: value }))

  const updateChild = (key: keyof PatientFormData, value: string) =>
    setChildFields(prev => ({ ...prev, [key]: value }))

  const updateGrowth = (idx: number, field: keyof OcrGrowthEntry, value: string) => {
    setGrowthEntries(prev => prev.map((e, i) =>
      i === idx ? { ...e, [field]: field.endsWith('_grams') || field.endsWith('_cm') ? (parseFloat(value) || null) : value } : e
    ))
  }

  const updateVax = (idx: number, field: keyof OcrVaccination, value: string) =>
    setVaccinations(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))

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
              <Button variant="ghost" onClick={() => {
                setParentFields(null); setChildFields(null)
                setGrowthEntries([]); setVaccinations([])
                setRawText(''); setFile(null); setPreviewUrl(null)
                setExistingParentId(undefined)
              }}>
                Reset
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {growthEntries.length} growth entries · {vaccinations.length} vaccinations detected
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* ── Parent Section ── */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Parent / Guardian
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Link to existing parent */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Link to existing parent (optional)</Label>
                      <Popover open={parentPickerOpen} onOpenChange={setParentPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal text-sm h-9">
                            {selectedExistingParent ? selectedExistingParent.client_name : 'Create new parent from OCR…'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0">
                          <Command>
                            <CommandInput placeholder="Search parents…" />
                            <CommandList>
                              <CommandEmpty>No parent found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="__new__"
                                  onSelect={() => { setExistingParentId(undefined); setParentPickerOpen(false) }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', !existingParentId ? 'opacity-100' : 'opacity-0')} />
                                  Create new parent from OCR data
                                </CommandItem>
                                {parents.map(p => (
                                  <CommandItem
                                    key={p.id}
                                    value={p.client_name}
                                    onSelect={() => { setExistingParentId(p.id); setParentPickerOpen(false) }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', existingParentId === p.id ? 'opacity-100' : 'opacity-0')} />
                                    {p.client_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {existingParentId && (
                        <p className="text-xs text-emerald-700 font-medium mt-1">
                          Using existing parent — OCR parent fields below will be ignored on save.
                        </p>
                      )}
                    </div>

                    {/* OCR-extracted parent fields */}
                    <div className={cn('space-y-3', existingParentId && 'opacity-40 pointer-events-none')}>
                      {PARENT_FIELD_META.map(({ key, label, type, multiline }) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs">{label}</Label>
                          {multiline ? (
                            <Textarea
                              value={(parentFields?.[key] as string) || ''}
                              onChange={e => updateParent(key, e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                          ) : (
                            <Input
                              type={type || 'text'}
                              value={(parentFields?.[key] as string) || ''}
                              onChange={e => updateParent(key, e.target.value)}
                              className={`text-sm ${parentFields?.[key] ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
                              placeholder="Not detected"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── Right column: Child + Growth + Vaccinations ── */}
              <div className="space-y-5">
                {/* Child Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Child Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {CHILD_FIELD_META.map(({ key, label, type }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          type={type || 'text'}
                          value={(childFields?.[key] as string) || ''}
                          onChange={e => updateChild(key, e.target.value)}
                          className={`text-sm ${childFields?.[key] ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
                          placeholder="Not detected"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Growth Entries */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        Growth Measurements ({growthEntries.length})
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setGrowthEntries(prev => [...prev, {
                        measurement_date: '', age_label: '', weight_grams: null, length_cm: null, head_circumference_cm: null, notes: ''
                      }])}>+ Add row</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {growthEntries.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No growth measurements detected.</p>
                    )}
                    {growthEntries.map((entry, idx) => (
                      <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            {entry.age_label || `Entry ${idx + 1}`}
                          </span>
                          <button onClick={() => setGrowthEntries(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:opacity-70">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(['measurement_date', 'age_label', 'weight_grams', 'length_cm', 'head_circumference_cm', 'notes'] as const).map(field => (
                            <div key={field}>
                              <Label className="text-xs capitalize">{field.replace(/_/g, ' ')}</Label>
                              <Input
                                type={field === 'measurement_date' ? 'date' : field.endsWith('_grams') || field.endsWith('_cm') ? 'number' : 'text'}
                                step={field.endsWith('_cm') ? '0.1' : undefined}
                                value={entry[field] ?? ''}
                                onChange={e => updateGrowth(idx, field, e.target.value)}
                                placeholder={field === 'age_label' ? 'e.g. 6 weeks' : 'optional'}
                                className="text-xs h-8"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Vaccinations */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Syringe className="w-4 h-4 text-primary" />
                        Vaccinations ({vaccinations.length})
                      </CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setVaccinations(prev => [...prev, {
                        vaccine_name: '', age_group_label: '', administered_date: '', batch_number: '', site: ''
                      }])}>+ Add row</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {vaccinations.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No vaccinations detected.</p>
                    )}
                    {vaccinations.map((vax, idx) => (
                      <div key={idx} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-700">
                            {vax.vaccine_name || `Vaccination ${idx + 1}`}
                          </span>
                          <button onClick={() => setVaccinations(prev => prev.filter((_, i) => i !== idx))} className="text-destructive hover:opacity-70">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(['vaccine_name', 'age_group_label', 'administered_date', 'batch_number', 'site'] as const).map(field => (
                            <div key={field} className={field === 'vaccine_name' ? 'col-span-2' : ''}>
                              <Label className="text-xs capitalize">{field.replace(/_/g, ' ')}</Label>
                              <Input
                                type={field === 'administered_date' ? 'date' : 'text'}
                                value={vax[field] || ''}
                                onChange={e => updateVax(idx, field, e.target.value)}
                                className={`text-xs h-8 ${vax[field] ? 'border-emerald-300 bg-emerald-50/30' : ''}`}
                              />
                            </div>
                          ))}
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
