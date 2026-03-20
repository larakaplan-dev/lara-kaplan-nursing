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
import { Plus, CheckCircle2, Circle, Trash2, Pencil } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { VaccinationRecord, VaccineCatalog, VaccinationFormData } from '@/types'

const AGE_GROUPS = [
  'Birth', '6 Weeks', '10 Weeks', '14 Weeks', '6 Months', '9 Months',
  '12 Months', '15 Months', '18 Months', '2 Years', '6 Years', '12 Years', 'Other'
]

const SITES = ['Left Thigh', 'Right Thigh', 'Left Arm', 'Right Arm', 'Oral']

export function VaccinationsTab({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedVaccine, setSelectedVaccine] = useState<VaccineCatalog | null>(null)
  const [editingRecord, setEditingRecord] = useState<VaccinationRecord | null>(null)
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, setValue, watch } = useForm<VaccinationFormData>()

  const ageGroupVal = watch('age_group_label')
  const siteVal = watch('site')
  const vaccineIdVal = watch('vaccine_id')

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

  const openAdd = () => {
    reset({ administered_date: format(new Date(), 'yyyy-MM-dd') })
    setSelectedVaccine(null)
    setEditingRecord(null)
    setOpen(true)
  }

  const onEdit = (record: VaccinationRecord) => {
    setEditingRecord(record)
    reset({
      vaccine_id:        record.vaccine_id ?? '',
      vaccine_name:      record.vaccine_name,
      age_group_label:   record.age_group_label ?? '',
      administered_date: record.administered_date,
      batch_number:      record.batch_number ?? '',
      expiry_date:       record.expiry_date ?? '',
      site:              record.site ?? '',
      nappi_code:        record.nappi_code ?? '',
      price_cents:       record.price_cents?.toString() ?? '',
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
        vaccine_id:        formData.vaccine_id || null,
        vaccine_name:      formData.vaccine_name,
        age_group_label:   formData.age_group_label || null,
        administered_date: formData.administered_date,
        batch_number:      formData.batch_number || null,
        expiry_date:       formData.expiry_date || null,
        site:              formData.site || null,
        nappi_code:        formData.nappi_code || null,
        price_cents:       formData.price_cents ? parseInt(formData.price_cents) : null,
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
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Record Vaccine
        </Button>
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

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Saving…' : editingRecord ? 'Save Changes' : 'Record Vaccination'}
            </Button>
          </form>
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
                        <td className="px-4 py-2 font-medium">{r.vaccine_name}</td>
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
