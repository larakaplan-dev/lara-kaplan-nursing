'use client'

import { use } from 'react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { PatientForm } from '@/components/patients/PatientForm'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import type { Patient, PatientFormData } from '@/types'

function nullify(obj: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === null || v === undefined) {
      out[k] = null
    } else if (['num_children', 'num_pregnancies', 'birth_weight_grams', 'discharge_weight_grams'].includes(k)) {
      out[k] = parseInt(v) || null
    } else if (k === 'weeks_gestation') {
      out[k] = parseFloat(v) || null
    } else {
      out[k] = v
    }
  }
  return out
}

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const { data } = useQuery<{ patient: Patient }>({
    queryKey: ['patient', id],
    queryFn: () => fetch(`/api/patients/${id}`).then(r => r.json()),
  })

  const patient = data?.patient

  const handleSubmit = async (data: PatientFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nullify(data as unknown as Record<string, string>)),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Patient updated!')
      queryClient.invalidateQueries({ queryKey: ['patient', id] })
      router.push(`/patients/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update patient')
    } finally {
      setIsLoading(false)
    }
  }

  if (!patient) return <div className="p-6 text-muted-foreground">Loading…</div>

  return (
    <div>
      <TopBar
        title={`Edit — ${patient.baby_name || patient.client_name}`}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/patients/${id}`}><ChevronLeft className="w-4 h-4 mr-1" />Cancel</Link>
          </Button>
        }
      />
      <PatientForm patient={patient} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
