'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TopBar } from '@/components/layout/TopBar'
import { PatientForm } from '@/components/patients/PatientForm'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import type { PatientFormData } from '@/types'

function nullify(obj: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === null || v === undefined) {
      out[k] = null
    } else if (['num_children', 'num_pregnancies', 'birth_weight_grams', 'discharge_weight_grams'].includes(k)) {
      out[k] = parseInt(v) || null
    } else if (['weeks_gestation'].includes(k)) {
      out[k] = parseFloat(v) || null
    } else {
      out[k] = v
    }
  }
  return out
}

export default function NewPatientPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: PatientFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nullify(data as unknown as Record<string, string>)),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Patient saved!')
      router.push(`/patients/${json.patient.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save patient')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <TopBar
        title="New Patient"
        subtitle="Fill in the patient details below"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/patients"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Link>
          </Button>
        }
      />
      <PatientForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
