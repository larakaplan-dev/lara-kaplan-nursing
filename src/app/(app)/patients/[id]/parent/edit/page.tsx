'use client'

import { use, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { ParentForm } from '@/components/parents/ParentForm'
import { Button } from '@/components/ui/button'
import type { Patient, ParentFormData } from '@/types'

function nullifyParent(data: ParentFormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === '' || v === null || v === undefined) {
      out[k] = null
    } else if (['num_children', 'num_pregnancies'].includes(k)) {
      out[k] = parseInt(v as string) || null
    } else {
      out[k] = v
    }
  }
  return out
}

export default function ParentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const { data } = useQuery<{ patient: Patient }>({
    queryKey: ['patient', id],
    queryFn: () => fetch(`/api/patients/${id}`).then(r => r.json()),
    staleTime: 0,
  })

  const patient = data?.patient
  const parent = patient?.parent

  const handleSubmit = async (formData: ParentFormData) => {
    if (!parent?.id) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/parents/${parent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nullifyParent(formData)),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Parent details updated!')
      queryClient.invalidateQueries({ queryKey: ['patient', id] })
      router.push(`/patients/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update parent')
    } finally {
      setIsLoading(false)
    }
  }

  if (!patient || !parent) {
    return <div className="p-6 text-muted-foreground">Loading…</div>
  }

  return (
    <div>
      <TopBar
        title={`Edit Parent — ${parent.client_name}`}
        subtitle={patient.baby_name ? `Parent of ${patient.baby_name}` : undefined}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/patients/${id}`}><ChevronLeft className="w-4 h-4 mr-1" />Cancel</Link>
          </Button>
        }
      />
      <ParentForm parent={parent} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
