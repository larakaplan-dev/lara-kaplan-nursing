'use client'

import { use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Pencil, FileText, Baby, ArchiveX, ArchiveRestore } from 'lucide-react'
import { formatDate, ageLabel, weightDisplay } from '@/lib/utils'
import type { Patient } from '@/types'
import { GrowthTab } from '@/components/growth/GrowthTab'
import { VaccinationsTab } from '@/components/vaccinations/VaccinationsTab'
import { PatientInvoicesTab } from '@/components/invoices/PatientInvoicesTab'

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs text-muted-foreground w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ patient: Patient }>({
    queryKey: ['patient', id],
    queryFn: () => fetch(`/api/patients/${id}`).then(r => r.json()),
  })

  const patient = data?.patient

  const handleArchive = async () => {
    if (!confirm(
      'Archive this patient? Their records will be retained for at least 6 years as required by HPCSA, then flagged for secure disposal.'
    )) return
    const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Patient archived')
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient', id] })
    } else {
      toast.error('Failed to archive patient')
    }
  }

  const handleRestore = async () => {
    const res = await fetch(`/api/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleted_at: null, deletion_reason: null }),
    })
    if (res.ok) {
      toast.success('Patient restored')
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient', id] })
    } else {
      toast.error('Failed to restore patient')
    }
  }

  if (isLoading) {
    return (
      <div>
        <TopBar title="Loading…" />
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div>
        <TopBar title="Patient not found" />
        <p className="text-muted-foreground">This patient does not exist.</p>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        title={patient.baby_name || 'Unnamed Baby'}
        subtitle={
          [
            patient.baby_dob ? `Born ${formatDate(patient.baby_dob)}` : null,
            patient.baby_dob ? ageLabel(patient.baby_dob) : null,
          ].filter(Boolean).join(' · ') || undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/patients"><ChevronLeft className="w-4 h-4 mr-1" />Back</Link>
            </Button>
            {!patient.deleted_at && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/patients/${id}/edit`}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/invoices/new?patient=${id}`}><FileText className="w-3.5 h-3.5 mr-1" />Invoice</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleArchive} className="text-destructive hover:text-destructive">
                  <ArchiveX className="w-4 h-4" />
                </Button>
              </>
            )}
            {patient.deleted_at && (
              <Button variant="outline" size="sm" onClick={handleRestore}>
                <ArchiveRestore className="w-3.5 h-3.5 mr-1" />Restore
              </Button>
            )}
          </div>
        }
      />

      {patient.deleted_at && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
          <strong>Archived</strong> on {formatDate(patient.deleted_at)}.
          Records are retained for 6 years per HPCSA requirements.
          {new Date(patient.deleted_at) < new Date(Date.now() - 6 * 365.25 * 24 * 60 * 60 * 1000) && (
            <span className="ml-2 font-semibold text-red-700">Ready for secure disposal.</span>
          )}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="growth">Growth Chart</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Client Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Mom Name" value={patient.client_name} />
                <InfoRow label="ID Number" value={patient.client_id_number} />
                <InfoRow label="Partner" value={patient.partner_name} />
                <InfoRow label="Contact" value={patient.contact_number} />
                <InfoRow label="Email" value={patient.email} />
                <InfoRow label="Address" value={patient.home_address} />
              </CardContent>
            </Card>

            {/* Medical Aid */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Medical Aid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Medical Aid" value={patient.medical_aid_name} />
                <InfoRow label="Aid Number" value={patient.medical_aid_number} />
                <InfoRow label="Main Member" value={patient.main_member_name} />
                <InfoRow label="Member ID" value={patient.main_member_id} />
              </CardContent>
            </Card>

            {/* Baby History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5" /> Baby&apos;s History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Place of Birth" value={patient.place_of_birth} />
                <InfoRow label="Weeks Gestation" value={patient.weeks_gestation ? `${patient.weeks_gestation} weeks` : null} />
                <InfoRow label="Mode of Delivery" value={patient.mode_of_delivery} />
                <InfoRow label="Birth Weight" value={weightDisplay(patient.birth_weight_grams)} />
                <InfoRow label="Discharge Weight" value={weightDisplay(patient.discharge_weight_grams)} />
                {patient.paed_notes && <InfoRow label="Paed Notes" value={patient.paed_notes} />}
              </CardContent>
            </Card>

            {/* Pregnancy History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Pregnancy History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Pregnancies" value={patient.num_pregnancies} />
                <InfoRow label="Children" value={patient.num_children} />
                {patient.maternal_history && <InfoRow label="Maternal History" value={patient.maternal_history} />}
                {patient.gynae_notes && <InfoRow label="Gynae Notes" value={patient.gynae_notes} />}
              </CardContent>
            </Card>
          </div>

          {/* Consent */}
          {(patient.consent_date || patient.consent_name) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Consent</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <Badge variant="secondary" className="text-emerald-700 bg-emerald-50">Consent on file</Badge>
                <InfoRow label="Date" value={formatDate(patient.consent_date)} />
                <InfoRow label="Signed by" value={patient.consent_name} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* GROWTH */}
        <TabsContent value="growth">
          <GrowthTab patientId={id} />
        </TabsContent>

        {/* VACCINATIONS */}
        <TabsContent value="vaccinations">
          <VaccinationsTab patientId={id} />
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices">
          <PatientInvoicesTab patientId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
