'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2 } from 'lucide-react'
import { formatZAR } from '@/lib/utils'
import type { Parent, Patient, ProcedureCode, VaccineCatalog, InvoiceServiceLineForm, InvoiceVaccineLineForm } from '@/types'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const PDFDownloadButton = dynamic(() => import('./PDFDownloadButton'), { ssr: false })

const ICD10_DEFAULTS: Record<string, string> = {
  '88005': 'Z00.1', '88006': 'Z00.1', '88001': 'Z00.1', '88002': 'Z00.1',
  '88420': 'Z34.9', '88421': 'Z39.1', '88450': 'Z00.1', '88452': 'Z27.9',
}

interface InvoiceBuilderProps {
  preselectedPatientId?: string
}

export function InvoiceBuilder({ preselectedPatientId }: InvoiceBuilderProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [parentId, setParentId] = useState('')
  const [childId, setChildId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [serviceLines, setServiceLines] = useState<InvoiceServiceLineForm[]>([])
  const [vaccineLines, setVaccineLines] = useState<InvoiceVaccineLineForm[]>([])
  const [saving, setSaving] = useState(false)
  const [parentOpen, setParentOpen] = useState(false)
  const [childOpen, setChildOpen] = useState(false)

  // Resolve preselected child → parent on mount
  const { data: preselectedPatientData } = useQuery<{ patient: Patient }>({
    queryKey: ['patient', preselectedPatientId],
    queryFn: () => fetch(`/api/patients/${preselectedPatientId}`).then(r => r.json()),
    enabled: !!preselectedPatientId,
  })

  useEffect(() => {
    if (preselectedPatientData?.patient) {
      const p = preselectedPatientData.patient
      setParentId(p.parent_id)
      setChildId(p.id)
    }
  }, [preselectedPatientData])

  // Parents list
  const { data: parentsData } = useQuery<{ parents: Parent[] }>({
    queryKey: ['parents-select'],
    queryFn: () => fetch('/api/parents?limit=200').then(r => r.json()),
    staleTime: 0,
  })

  // Children of selected parent
  const { data: childrenData } = useQuery<{ patients: Patient[] }>({
    queryKey: ['patients-by-parent', parentId],
    queryFn: () => fetch(`/api/patients?parent_id=${parentId}&limit=50`).then(r => r.json()),
    enabled: !!parentId,
    staleTime: 0,
  })

  const { data: codesData } = useQuery<{ codes: ProcedureCode[] }>({
    queryKey: ['procedure-codes'],
    queryFn: () => fetch('/api/procedure-codes').then(r => r.json()),
    staleTime: Infinity,
  })

  const { data: vaccinesData } = useQuery<{ vaccines: VaccineCatalog[] }>({
    queryKey: ['vaccine-catalog'],
    queryFn: () => fetch('/api/vaccines').then(r => r.json()),
    staleTime: Infinity,
  })

  const parents = parentsData?.parents || []
  const children = childrenData?.patients || []
  const codes = (codesData?.codes || []).filter(c => c.category === 'consultation' || c.category === 'immunisation')
  const vaccines = vaccinesData?.vaccines || []

  const selectedParent = parents.find(p => p.id === parentId) ?? preselectedPatientData?.patient?.parent ?? null
  const selectedChild = children.find(c => c.id === childId) ?? preselectedPatientData?.patient ?? null

  const handleParentSelect = (id: string) => {
    setParentId(id)
    setChildId('')
    setParentOpen(false)
  }

  const servicesTotalCents = serviceLines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0)
  const vaccinesTotalCents = vaccineLines.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0)
  const grandTotal = servicesTotalCents + vaccinesTotalCents

  const addServiceLine = () => {
    const firstCode = codes[0]
    setServiceLines(prev => [...prev, {
      service_date: invoiceDate,
      description: firstCode?.description || '',
      icd10_code: firstCode ? (ICD10_DEFAULTS[firstCode.code] || '') : '',
      procedure_code: firstCode?.code || '',
      unit_price_cents: firstCode?.price_cents || 0,
      quantity: 1,
    }])
  }

  const updateServiceLine = (i: number, field: keyof InvoiceServiceLineForm, value: string | number) => {
    setServiceLines(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      if (field === 'procedure_code') {
        const code = codes.find(c => c.code === value)
        if (code) {
          next[i].description = code.description
          next[i].unit_price_cents = code.price_cents
          next[i].icd10_code = ICD10_DEFAULTS[code.code] || ''
        }
      }
      return next
    })
  }

  const addVaccineLine = () => {
    const v = vaccines[0]
    setVaccineLines(prev => [...prev, {
      vaccine_date: invoiceDate,
      tariff_code: '88454',
      vaccine_name: v?.name || '',
      icd10_code: v?.icd10_code || '',
      nappi_code: v?.nappi_code || '',
      unit_price_cents: v?.default_price_cents || 0,
      quantity: 1,
    }])
  }

  const updateVaccineLine = (i: number, field: keyof InvoiceVaccineLineForm, value: string | number) => {
    setVaccineLines(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      if (field === 'vaccine_name') {
        const v = vaccines.find(v => v.name === value)
        if (v) {
          next[i].icd10_code = v.icd10_code || ''
          next[i].nappi_code = v.nappi_code || ''
          next[i].unit_price_cents = v.default_price_cents
        }
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!parentId || !childId) {
      toast.error('Please select a parent and child')
      return
    }
    if (!serviceLines.length && !vaccineLines.length) {
      toast.error('Add at least one service or vaccine line')
      return
    }
    setSaving(true)
    try {
      const body = {
        patient_id: childId,
        parent_id: parentId,
        invoice_date: invoiceDate,
        patient_name: selectedChild?.baby_name || selectedParent?.client_name,
        patient_dob: selectedChild?.baby_dob,
        medical_aid_name: selectedParent?.medical_aid_name,
        medical_aid_number: selectedParent?.medical_aid_number,
        main_member_name: selectedParent?.main_member_name,
        main_member_id: selectedParent?.main_member_id,
        services_total_cents: servicesTotalCents,
        vaccines_total_cents: vaccinesTotalCents,
        grand_total_cents: grandTotal,
        status: 'draft',
        service_lines: serviceLines.map(l => ({ ...l, total_cents: l.unit_price_cents * l.quantity })),
        vaccine_lines: vaccineLines.map(l => ({ ...l, total_cents: l.unit_price_cents * l.quantity })),
      }
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`Invoice ${json.invoice.invoice_number} created`)
      queryClient.invalidateQueries({ queryKey: ['invoices-all'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', childId] })
      router.push(`/invoices/${json.invoice.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const invoiceDataForPDF = selectedChild && selectedParent ? {
    invoiceNumber: 'PREVIEW',
    invoiceDate,
    patientName: selectedChild.baby_name || selectedParent.client_name || '',
    patientDob: selectedChild.baby_dob,
    medicalAidName: selectedParent.medical_aid_name,
    medicalAidNumber: selectedParent.medical_aid_number,
    mainMemberName: selectedParent.main_member_name,
    mainMemberId: selectedParent.main_member_id,
    serviceLines,
    vaccineLines,
    servicesTotalCents,
    vaccinesTotalCents,
    grandTotalCents: grandTotal,
  } : null

  return (
    <div className="space-y-5">
      {/* Parent + Child + Date */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Step 1: Parent */}
          <div className="space-y-1.5">
            <Label className="text-xs">Parent / Guardian <span className="text-destructive">*</span></Label>
            <Popover open={parentOpen} onOpenChange={setParentOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedParent ? selectedParent.client_name : 'Select parent…'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0">
                <Command>
                  <CommandInput placeholder="Search parents…" />
                  <CommandList>
                    <CommandEmpty>No parent found.</CommandEmpty>
                    <CommandGroup>
                      {parents.map(p => (
                        <CommandItem
                          key={p.id}
                          value={p.client_name}
                          onSelect={() => handleParentSelect(p.id)}
                        >
                          <Check className={cn('mr-2 h-4 w-4', parentId === p.id ? 'opacity-100' : 'opacity-0')} />
                          {p.client_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Step 2: Child */}
          <div className="space-y-1.5">
            <Label className="text-xs">Child <span className="text-destructive">*</span></Label>
            <Popover open={childOpen} onOpenChange={v => parentId && setChildOpen(v)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!parentId}
                  className="w-full justify-between font-normal"
                >
                  {selectedChild ? (selectedChild.baby_name || 'Unnamed baby') : (parentId ? 'Select child…' : 'Select parent first')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <Command>
                  <CommandInput placeholder="Search children…" />
                  <CommandList>
                    <CommandEmpty>No children found.</CommandEmpty>
                    <CommandGroup>
                      {children.map(c => (
                        <CommandItem
                          key={c.id}
                          value={c.baby_name || c.id}
                          onSelect={() => { setChildId(c.id); setChildOpen(false) }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', childId === c.id ? 'opacity-100' : 'opacity-0')} />
                          {c.baby_name || 'Unnamed baby'}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Invoice date */}
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice Date</Label>
            <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>

          {/* Medical aid summary — populates from parent */}
          {selectedParent && (
            <div className="sm:col-span-3 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 space-y-0.5">
              <p><strong>Medical Aid:</strong> {selectedParent.medical_aid_name || '—'} · {selectedParent.medical_aid_number || '—'}</p>
              <p><strong>Main Member:</strong> {selectedParent.main_member_name || '—'} · {selectedParent.main_member_id || '—'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Services</CardTitle>
          <Button size="sm" variant="outline" onClick={addServiceLine}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {!serviceLines.length ? (
            <p className="text-xs text-muted-foreground">No services added yet.</p>
          ) : (
            <div className="space-y-2">
              {serviceLines.map((line, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={line.service_date} onChange={e => updateServiceLine(i, 'service_date', e.target.value)} />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs">Code</Label>
                    <Select value={line.procedure_code} onValueChange={v => updateServiceLine(i, 'procedure_code', v)}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {codes.map(c => (
                          <SelectItem key={c.code} value={c.code} className="text-xs">
                            {c.code} — {c.description.substring(0, 30)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={line.description} onChange={e => updateServiceLine(i, 'description', e.target.value)} className="text-xs h-9" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">ICD-10</Label>
                    <Input value={line.icd10_code} onChange={e => updateServiceLine(i, 'icd10_code', e.target.value)} className="text-xs h-9" placeholder="Z00.1" />
                  </div>
                  <div className="sm:col-span-1 space-y-1">
                    <Label className="text-xs">Price (R)</Label>
                    <Input
                      type="number"
                      value={(line.unit_price_cents / 100).toFixed(2)}
                      onChange={e => updateServiceLine(i, 'unit_price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end pb-0.5">
                    <button onClick={() => setServiceLines(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vaccines */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vaccines</CardTitle>
          <Button size="sm" variant="outline" onClick={addVaccineLine}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {!vaccineLines.length ? (
            <p className="text-xs text-muted-foreground">No vaccines added yet.</p>
          ) : (
            <div className="space-y-2">
              {vaccineLines.map((line, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={line.vaccine_date} onChange={e => updateVaccineLine(i, 'vaccine_date', e.target.value)} />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs">Vaccine</Label>
                    <Select value={line.vaccine_name} onValueChange={v => updateVaccineLine(i, 'vaccine_name', v)}>
                      <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {vaccines.map(v => <SelectItem key={v.id} value={v.name} className="text-xs">{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">ICD-10</Label>
                    <Input value={line.icd10_code} onChange={e => updateVaccineLine(i, 'icd10_code', e.target.value)} className="text-xs h-9" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">NAPPI</Label>
                    <Input value={line.nappi_code} onChange={e => updateVaccineLine(i, 'nappi_code', e.target.value)} className="text-xs h-9" />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Price (R)</Label>
                    <Input
                      type="number"
                      value={(line.unit_price_cents / 100).toFixed(2)}
                      onChange={e => updateVaccineLine(i, 'unit_price_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end pb-0.5">
                    <button onClick={() => setVaccineLines(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals + Actions */}
      <div className="flex items-end justify-between">
        <div className="space-y-1 text-sm">
          <div className="flex gap-4">
            <span className="text-muted-foreground w-32">Services</span>
            <span className="font-medium">{formatZAR(servicesTotalCents)}</span>
          </div>
          <div className="flex gap-4">
            <span className="text-muted-foreground w-32">Vaccines</span>
            <span className="font-medium">{formatZAR(vaccinesTotalCents)}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex gap-4">
            <span className="text-muted-foreground w-32 font-semibold">Total</span>
            <span className="font-bold text-lg">{formatZAR(grandTotal)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {invoiceDataForPDF && (serviceLines.length > 0 || vaccineLines.length > 0) && (
            <PDFDownloadButton invoiceData={invoiceDataForPDF} />
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Invoice'}
          </Button>
        </div>
      </div>
    </div>
  )
}
