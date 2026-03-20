'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { cn, formatZAR } from '@/lib/utils'
import type { VaccineCatalog } from '@/types'

type VaccineFormData = {
  name:                string
  nappi_code:          string
  icd10_code:          string
  default_price_rands: string
  tariff_code:         string
}

export default function VaccinesAdminPage() {
  const [open, setOpen] = useState(false)
  const [editingVaccine, setEditingVaccine] = useState<VaccineCatalog | null>(null)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<VaccineFormData>()

  const { data, isLoading } = useQuery<{ vaccines: VaccineCatalog[] }>({
    queryKey: ['vaccine-catalog-admin'],
    queryFn: () => fetch('/api/vaccines?all=true').then(r => r.json()),
  })

  const vaccines = data?.vaccines || []

  const openAdd = () => {
    reset({ name: '', nappi_code: '', icd10_code: '', default_price_rands: '', tariff_code: '88454' })
    setEditingVaccine(null)
    setOpen(true)
  }

  const openEdit = (v: VaccineCatalog) => {
    reset({
      name:                v.name,
      nappi_code:          v.nappi_code ?? '',
      icd10_code:          v.icd10_code ?? '',
      default_price_rands: (v.default_price_cents / 100).toFixed(2),
      tariff_code:         v.tariff_code,
    })
    setEditingVaccine(v)
    setOpen(true)
  }

  const handleDialogClose = (v: boolean) => {
    setOpen(v)
    if (!v) { setEditingVaccine(null); reset() }
  }

  const onSubmit = async (formData: VaccineFormData) => {
    setSaving(true)
    try {
      const body = {
        name:                formData.name,
        nappi_code:          formData.nappi_code || null,
        icd10_code:          formData.icd10_code || null,
        default_price_cents: Math.round(parseFloat(formData.default_price_rands) * 100),
        tariff_code:         formData.tariff_code || '88454',
      }

      if (editingVaccine) {
        const res = await fetch(`/api/vaccines/${editingVaccine.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Vaccine updated')
      } else {
        const res = await fetch('/api/vaccines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, active: true }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Vaccine added')
      }

      queryClient.invalidateQueries({ queryKey: ['vaccine-catalog-admin'] })
      queryClient.invalidateQueries({ queryKey: ['vaccine-catalog'] })
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (v: VaccineCatalog) => {
    if (!confirm(`Delete or deactivate "${v.name}"?`)) return
    const res = await fetch(`/api/vaccines/${v.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed'); return }
    const json = await res.json()
    toast.success(json.deactivated
      ? `"${v.name}" deactivated (still referenced by vaccination records)`
      : `"${v.name}" deleted`)
    queryClient.invalidateQueries({ queryKey: ['vaccine-catalog-admin'] })
    queryClient.invalidateQueries({ queryKey: ['vaccine-catalog'] })
  }

  return (
    <div>
      <TopBar
        title="Vaccine Catalog"
        subtitle={isLoading ? undefined : `${vaccines.length} vaccines`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin"><ChevronLeft className="w-4 h-4 mr-1" />Settings</Link>
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" />Add Vaccine
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVaccine ? 'Edit Vaccine' : 'Add Vaccine'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
              <Input {...register('name', { required: true })} placeholder="Vaccine name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">NAPPI Code</Label>
                <Input {...register('nappi_code')} placeholder="e.g. 719637001" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ICD-10 Code</Label>
                <Input {...register('icd10_code')} placeholder="e.g. Z27.8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Price (R) <span className="text-destructive">*</span></Label>
                <Input
                  {...register('default_price_rands', { required: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 750.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tariff Code</Label>
                <Input {...register('tariff_code')} placeholder="88454" />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Saving…' : editingVaccine ? 'Save Changes' : 'Add Vaccine'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : vaccines.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No vaccines in catalog.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {['Name', 'NAPPI', 'ICD-10', 'Tariff', 'Price', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vaccines.map(v => (
                  <tr key={v.id} className={cn('hover:bg-muted/20', !v.active && 'opacity-50')}>
                    <td className="px-4 py-2.5 font-medium">{v.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{v.nappi_code || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{v.icd10_code || '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{v.tariff_code}</td>
                    <td className="px-4 py-2.5 text-xs">{formatZAR(v.default_price_cents)}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={v.active ? 'secondary' : 'outline'}
                        className={v.active ? 'text-emerald-700 bg-emerald-50 text-xs' : 'text-xs'}
                      >
                        {v.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(v)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(v)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
