'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckCircle2, Circle, Trash2, Pencil, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDate } from '@/lib/utils'
import { AGE_GROUPS } from '@/lib/ageGroups'
import type { VaccinationRecord, VaccineCatalog, VaccinationFormData } from '@/types'

const SITES = ['Left Thigh', 'Right Thigh', 'Left Arm', 'Right Arm', 'Oral']

type BatchRow = {
  vaccineId: string
  vaccineName: string
  nappiCode: string | null
  priceCents: number | null
  administeredDate: string
  batchNumber: string
  expiryDate: string
  site: string
  thirdParty: boolean
  thirdPartyNotes: string
}

export function VaccinationsTab({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedVaccine, setSelectedVaccine] = useState<VaccineCatalog | null>(null)
  const [editingRecord, setEditingRecord] = useState<VaccinationRecord | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchAgeGroup, setBatchAgeGroup] = useState('')
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [batchSaving, setBatchSaving] = useState(false)
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, setValue, watch } = useForm<VaccinationFormData>()

  const ageGroupVal = watch('age_group_label')
  const siteVal = watch('site')
  const vaccineIdVal = watch('vaccine_id')
  const isThirdParty = watch('administered_by_third_party')

  const { data: vaccsData } = useQuery<{ records: VaccinationRecord[] }>({
    queryKey: ['vaccinations', patientId],
    queryFn: () => fetch(`/api/patients/${patientId}/vaccinations`).then(r => r.json()),
  })

  const { data: catalogData } = useQuery<{ vaccines: VaccineCatalog[] }>({
    queryKey: ['vaccine-catalog'],
    queryFn: () => fetch('/api/vaccines').then(r => r.json()),
    staleTime: Infinity,
  })

  const records = vaccsData?.records || []
  const vaccines = catalogData?.vaccines || []

  // Group records by age group
  const grouped = AGE_GROUPS.reduce((acc, group) => {
    acc[group] = records.filter(r => r.age_group_label === group)
    return acc
  }, {} as Record<string, VaccinationRecord[]>)

  const ageGroupsWithVaccines = AGE_GROUPS.filter(g => vaccines.some(v => v.age_group_label === g))

  const openBatchAdd = () => {
    setBatchAgeGroup('')
    setBatchRows([])
    setBatchOpen(true)
  }

  const onSelectBatchAgeGroup = (group: string) => {
    setBatchAgeGroup(group)
    setBatchRows(
      vaccines
        .filter(v => v.age_group_label === group)
        .map(v => ({
          vaccineId: v.id,
          vaccineName: v.name,
          nappiCode: v.nappi_code,
          priceCents: v.default_price_cents,
          administeredDate: format(new Date(), 'yyyy-MM-dd'),
          batchNumber: '',
          expiryDate: '',
          site: '',
          thirdParty: false,
          thirdPartyNotes: '',
        }))
    )
  }

  const updateBatchRow = (vaccineId: string, patch: Partial<BatchRow>) => {
    setBatchRows(rows => rows.map(r => (r.vaccineId === vaccineId ? { ...r, ...patch } : r)))
  }

  const removeBatchRow = (vaccineId: string) => {
    setBatchRows(rows => rows.filter(r => r.vaccineId !== vaccineId))
  }

  const handleBatchDialogClose = (v: boolean) => {
    setBatchOpen(v)
    if (!v) {
      setBatchAgeGroup('')
      setBatchRows([])
    }
  }

  const onSaveBatch = async () => {
    setBatchSaving(true)
    try {
      const results = await Promise.all(
        batchRows.map(async row => {
          const body = {
            vaccine_id:                  row.vaccineId,
            vaccine_name:                row.vaccineName,
            age_group_label:             batchAgeGroup,
            administered_date:           row.administeredDate,
            batch_number:                row.batchNumber || null,
            expiry_date:                 row.expiryDate || null,
            site:                        row.site || null,
            nappi_code:                  row.nappiCode,
            price_cents:                 row.priceCents,
            administered_by_third_party: row.thirdParty,
            third_party_notes:           row.thirdPartyNotes || null,
          }
          const res = await fetch(`/api/patients/${patientId}/vaccinations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          return { row, ok: res.ok }
        })
      )

      const failed = results.filter(r => !r.ok).map(r => r.row)
      const succeededCount = results.length - failed.length

      if (succeededCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['vaccinations', patientId] })
      }

      if (failed.length === 0) {
        toast.success(`${succeededCount} vaccination${succeededCount === 1 ? '' : 's'} recorded`)
        setBatchOpen(false)
        setBatchAgeGroup('')
        setBatchRows([])
      } else {
        setBatchRows(failed)
        toast.error(
          `${succeededCount} of ${results.length} recorded. Failed: ${failed.map(f => f.vaccineName).join(', ')}`
        )
      }
    } finally {
      setBatchSaving(false)
    }
  }

  const openAdd = () => {
    reset({ administered_date: format(new Date(), 'yyyy-MM-dd'), administered_by_third_party: false, third_party_notes: '' })
    setSelectedVaccine(null)
    setEditingRecord(null)
    setOpen(true)
  }

  const onEdit = (record: VaccinationRecord) => {
    setEditingRecord(record)
    reset({
      vaccine_id:                  record.vaccine_id ?? '',
      vaccine_name:                record.vaccine_name,
      age_group_label:             record.age_group_label ?? '',
      administered_date:           record.administered_date,
      batch_number:                record.batch_number ?? '',
      expiry_date:                 record.expiry_date ?? '',
      site:                        record.site ?? '',
      nappi_code:                  record.nappi_code ?? '',
      price_cents:                 record.price_cents?.toString() ?? '',
      administered_by_third_party: record.administered_by_third_party,
      third_party_notes:           record.third_party_notes ?? '',
    })
    setSelectedVaccine(record.vaccine_id ? vaccines.find(v => v.id === record.vaccine_id) ?? null : null)
    setOpen(true)
  }

  const onSelectVaccine = (id: string) => {
    if (id === 'custom') {
      setSelectedVaccine(null)
      setValue('vaccine_id', '')
      return
    }
    const v = vaccines.find(v => v.id === id)
    if (v) {
      setSelectedVaccine(v)
      setValue('vaccine_id', v.id)
      setValue('vaccine_name', v.name)
      setValue('nappi_code', v.nappi_code || '')
      setValue('price_cents', v.default_price_cents.toString())
    }
  }

  const onSubmit = async (formData: VaccinationFormData) => {
    setSaving(true)
    try {
      const body = {
        vaccine_id:                  formData.vaccine_id || null,
        vaccine_name:                formData.vaccine_name,
        age_group_label:             formData.age_group_label || null,
        administered_date:           formData.administered_date,
        batch_number:                formData.batch_number || null,
        expiry_date:                 formData.expiry_date || null,
        site:                        formData.site || null,
        nappi_code:                  formData.nappi_code || null,
        price_cents:                 formData.price_cents ? parseInt(formData.price_cents) : null,
        administered_by_third_party: formData.administered_by_third_party ?? false,
        third_party_notes:           formData.third_party_notes || null,
      }

      if (editingRecord) {
        const res = await fetch(`/api/patients/${patientId}/vaccinations`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId: editingRecord.id, ...body }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Vaccination updated')
      } else {
        const res = await fetch(`/api/patients/${patientId}/vaccinations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Vaccination recorded')
      }

      queryClient.invalidateQueries({ queryKey: ['vaccinations', patientId] })
      reset()
      setSelectedVaccine(null)
      setEditingRecord(null)
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (recordId: string) => {
    if (!confirm('Delete this vaccination record?')) return
    const res = await fetch(`/api/patients/${patientId}/vaccinations?recordId=${recordId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      queryClient.invalidateQueries({ queryKey: ['vaccinations', patientId] })
    }
  }

  const handleDialogClose = (v: boolean) => {
    setOpen(v)
    if (!v) {
      setEditingRecord(null)
      setSelectedVaccine(null)
      reset()
    }
  }

  const groupsWithRecords = AGE_GROUPS.filter(g => grouped[g]?.length > 0)
  const emptyGroups = AGE_GROUPS.filter(g => grouped[g]?.length === 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Vaccination Records</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openBatchAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add by Age Group
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Record Vaccine
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Vaccination' : 'Record Vaccination'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Vaccine <span className="text-destructive">*</span></Label>
              <Select value={vaccineIdVal || undefined} onValueChange={onSelectVaccine}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vaccine…" />
                </SelectTrigger>
                <SelectContent>
                  {vaccines.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                  <SelectItem value="custom">Other (enter manually)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(!selectedVaccine) && (
              <div className="space-y-1.5">
                <Label className="text-xs">Vaccine Name</Label>
                <Input {...register('vaccine_name', { required: true })} placeholder="Vaccine name" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Age Group</Label>
                <Select value={ageGroupVal} onValueChange={v => setValue('age_group_label', v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date Given <span className="text-destructive">*</span></Label>
                <Input {...register('administered_date', { required: true })} type="date" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Batch Number</Label>
                <Input {...register('batch_number')} placeholder="Batch #" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Date</Label>
                <Input {...register('expiry_date')} type="date" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Site</Label>
                <Select value={siteVal} onValueChange={v => setValue('site', v)}>
                  <SelectTrigger><SelectValue placeholder="Injection site…" /></SelectTrigger>
                  <SelectContent>
                    {SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">NAPPI Code</Label>
                <Input {...register('nappi_code')} placeholder="NAPPI" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (cents)</Label>
                <Input {...register('price_cents')} type="number" placeholder="e.g. 75000" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="third-party"
                  checked={!!isThirdParty}
                  onCheckedChange={v => setValue('administered_by_third_party', !!v)}
                />
                <Label htmlFor="third-party" className="text-xs cursor-pointer">Administered by third party</Label>
              </div>
              {isThirdParty && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input {...register('third_party_notes')} placeholder="e.g. Given by Dr Smith at City Clinic" />
                </div>
              )}
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Saving…' : editingRecord ? 'Save Changes' : 'Record Vaccination'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={batchOpen} onOpenChange={handleBatchDialogClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Vaccines by Age Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Age Group</Label>
              <Select value={batchAgeGroup || undefined} onValueChange={onSelectBatchAgeGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select age group…" />
                </SelectTrigger>
                <SelectContent>
                  {ageGroupsWithVaccines.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {batchRows.length > 0 && (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {batchRows.map(row => (
                  <Card key={row.vaccineId} data-testid="batch-row">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{row.vaccineName}</span>
                        <button
                          type="button"
                          onClick={() => removeBatchRow(row.vaccineId)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove"
                          aria-label={`Remove ${row.vaccineName}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Date Given</Label>
                          <Input
                            type="date"
                            value={row.administeredDate}
                            onChange={e => updateBatchRow(row.vaccineId, { administeredDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Batch Number</Label>
                          <Input
                            value={row.batchNumber}
                            placeholder="Batch #"
                            onChange={e => updateBatchRow(row.vaccineId, { batchNumber: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Expiry Date</Label>
                          <Input
                            type="date"
                            value={row.expiryDate}
                            onChange={e => updateBatchRow(row.vaccineId, { expiryDate: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Site</Label>
                          <Select
                            value={row.site || undefined}
                            onValueChange={v => updateBatchRow(row.vaccineId, { site: v })}
                          >
                            <SelectTrigger><SelectValue placeholder="Site…" /></SelectTrigger>
                            <SelectContent>
                              {SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">NAPPI Code</Label>
                          <Input
                            value={row.nappiCode ?? ''}
                            placeholder="NAPPI"
                            onChange={e => updateBatchRow(row.vaccineId, { nappiCode: e.target.value || null })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Price (cents)</Label>
                          <Input
                            type="number"
                            value={row.priceCents ?? ''}
                            placeholder="e.g. 75000"
                            onChange={e => updateBatchRow(row.vaccineId, { priceCents: e.target.value ? parseInt(e.target.value) : null })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`third-party-${row.vaccineId}`}
                          checked={row.thirdParty}
                          onCheckedChange={v => updateBatchRow(row.vaccineId, { thirdParty: !!v })}
                        />
                        <Label htmlFor={`third-party-${row.vaccineId}`} className="text-xs cursor-pointer">
                          Administered by third party
                        </Label>
                      </div>
                      {row.thirdParty && (
                        <Input
                          value={row.thirdPartyNotes}
                          placeholder="e.g. Given by Dr Smith at City Clinic"
                          onChange={e => updateBatchRow(row.vaccineId, { thirdPartyNotes: e.target.value })}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              type="button"
              disabled={batchSaving || batchRows.length === 0}
              className="w-full"
              onClick={onSaveBatch}
            >
              {batchSaving ? 'Saving…' : 'Save All'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recorded vaccinations by age group */}
      {groupsWithRecords.length > 0 && (
        <div className="space-y-3">
          {groupsWithRecords.map(group => (
            <Card key={group} className="overflow-hidden">
              <CardHeader className="py-2.5 px-4 bg-muted/30">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {group}
                  <Badge variant="secondary" className="ml-auto text-xs">{grouped[group].length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Vaccine', 'Date', 'Batch', 'Expiry', 'Site', ''].map(h => (
                        <th key={h} scope="col" className="px-4 py-2 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {grouped[group].map(r => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2 font-medium">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              {r.vaccine_name}
                              {r.administered_by_third_party && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 text-amber-700 border-amber-300 bg-amber-50">3rd Party</Badge>
                              )}
                            </div>
                            {r.administered_by_third_party && r.third_party_notes && (
                              <span className="text-xs text-muted-foreground">{r.third_party_notes}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{formatDate(r.administered_date)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.batch_number || '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.expiry_date ? formatDate(r.expiry_date) : '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.site || '—'}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => onEdit(r)} className="text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onDelete(r.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pending groups */}
      {emptyGroups.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pending Age Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {emptyGroups.map(g => (
                <span key={g} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  <Circle className="w-3 h-3" /> {g}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {records.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No vaccinations recorded yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
