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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { formatZAR } from '@/lib/utils'
import type { ProcedureCode } from '@/types'

type ProcedureCodeFormData = {
  code:        string
  description: string
  price_rands: string
  category:    string
}

export default function ProcedureCodesAdminPage() {
  const [open, setOpen] = useState(false)
  const [editingCode, setEditingCode] = useState<ProcedureCode | null>(null)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<ProcedureCodeFormData>()

  const { data, isLoading } = useQuery<{ codes: ProcedureCode[] }>({
    queryKey: ['procedure-codes-admin'],
    queryFn: () => fetch('/api/procedure-codes').then(r => r.json()),
  })

  const codes = data?.codes || []

  const openAdd = () => {
    reset({ code: '', description: '', price_rands: '', category: 'consultation' })
    setEditingCode(null)
    setOpen(true)
  }

  const openEdit = (c: ProcedureCode) => {
    reset({
      code:        c.code,
      description: c.description,
      price_rands: (c.price_cents / 100).toFixed(2),
      category:    c.category,
    })
    setEditingCode(c)
    setOpen(true)
  }

  const handleDialogClose = (v: boolean) => {
    setOpen(v)
    if (!v) { setEditingCode(null); reset() }
  }

  const onSubmit = async (formData: ProcedureCodeFormData) => {
    setSaving(true)
    try {
      const body = {
        code:        formData.code,
        description: formData.description,
        price_cents: Math.round(parseFloat(formData.price_rands) * 100),
        category:    formData.category,
      }

      if (editingCode) {
        const res = await fetch(`/api/procedure-codes/${editingCode.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Procedure code updated')
      } else {
        const res = await fetch('/api/procedure-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success('Procedure code added')
      }

      queryClient.invalidateQueries({ queryKey: ['procedure-codes-admin'] })
      queryClient.invalidateQueries({ queryKey: ['procedure-codes'] })
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (c: ProcedureCode) => {
    if (!confirm(`Delete procedure code "${c.code} – ${c.description}"?`)) return
    const res = await fetch(`/api/procedure-codes/${c.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success(`"${c.code}" deleted`)
    queryClient.invalidateQueries({ queryKey: ['procedure-codes-admin'] })
    queryClient.invalidateQueries({ queryKey: ['procedure-codes'] })
  }

  return (
    <div>
      <TopBar
        title="Procedure Codes"
        subtitle={isLoading ? undefined : `${codes.length} codes`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin"><ChevronLeft className="w-4 h-4 mr-1" />Settings</Link>
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" />Add Code
            </Button>
          </div>
        }
      />

      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCode ? 'Edit Procedure Code' : 'Add Procedure Code'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Code <span className="text-destructive">*</span></Label>
                <Input {...register('code', { required: true })} placeholder="e.g. 88001" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category <span className="text-destructive">*</span></Label>
                <Input {...register('category', { required: true })} placeholder="consultation" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description <span className="text-destructive">*</span></Label>
              <Input {...register('description', { required: true })} placeholder="e.g. Consultation 31–45 min" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price (R) <span className="text-destructive">*</span></Label>
              <Input
                {...register('price_rands', { required: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 680.30"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'Saving…' : editingCode ? 'Save Changes' : 'Add Code'}
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
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No procedure codes found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {['Code', 'Description', 'Category', 'Price', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {codes.map(c => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs font-medium">{c.code}</td>
                    <td className="px-4 py-2.5">{c.description}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.category}</td>
                    <td className="px-4 py-2.5 text-xs">{formatZAR(c.price_cents)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(c)}
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
