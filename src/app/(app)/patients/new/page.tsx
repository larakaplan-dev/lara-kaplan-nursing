'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import { ChevronLeft, ChevronsUpDown, Check } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ParentFormData, PatientFormData, Parent } from '@/types'

type NewPatientFormData = ParentFormData & PatientFormData & {
  existing_parent_id: string
  use_existing_parent: boolean
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function nullifyParent(obj: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === null || v === undefined) {
      out[k] = null
    } else if (['num_children', 'num_pregnancies'].includes(k)) {
      out[k] = parseInt(v) || null
    } else {
      out[k] = v
    }
  }
  return out
}

function nullifyPatient(obj: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === null || v === undefined) {
      out[k] = null
    } else if (['birth_weight_grams', 'discharge_weight_grams'].includes(k)) {
      out[k] = parseInt(v) || null
    } else if (k === 'weeks_gestation') {
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
  const [useExisting, setUseExisting] = useState(false)
  const [parentSearch, setParentSearch] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<NewPatientFormData>({
    defaultValues: {
      existing_parent_id: '',
      use_existing_parent: false,
      client_name: '', client_id_number: '', partner_name: '', home_address: '',
      contact_number: '', email: '', medical_aid_name: '', medical_aid_number: '',
      main_member_name: '', main_member_id: '', maternal_history: '', num_children: '',
      num_pregnancies: '', gynae_notes: '',
      baby_name: '', baby_dob: '', place_of_birth: '', weeks_gestation: '',
      birth_weight_grams: '', mode_of_delivery: '', discharge_weight_grams: '',
      sex: '', paed_notes: '', consent_date: '', consent_name: '',
    },
  })

  const modeOfDelivery = watch('mode_of_delivery')
  const sexValue = watch('sex')

  const { data: parentsData } = useQuery<{ parents: Parent[]; total: number }>({
    queryKey: ['parents', parentSearch],
    queryFn: () =>
      fetch(`/api/parents?search=${encodeURIComponent(parentSearch)}&limit=20`).then(r => r.json()),
    enabled: useExisting,
    staleTime: 0,
  })

  const handleSubmitForm = async (data: NewPatientFormData) => {
    setIsLoading(true)
    try {
      let parentId: string

      if (useExisting) {
        if (!selectedParent) {
          toast.error('Please select a parent')
          setIsLoading(false)
          return
        }
        parentId = selectedParent.id
      } else {
        // Create new parent first
        const parentPayload = nullifyParent({
          client_name: data.client_name,
          client_id_number: data.client_id_number,
          partner_name: data.partner_name,
          home_address: data.home_address,
          contact_number: data.contact_number,
          email: data.email,
          medical_aid_name: data.medical_aid_name,
          medical_aid_number: data.medical_aid_number,
          main_member_name: data.main_member_name,
          main_member_id: data.main_member_id,
          maternal_history: data.maternal_history,
          num_children: data.num_children,
          num_pregnancies: data.num_pregnancies,
          gynae_notes: data.gynae_notes,
        })
        const parentRes = await fetch('/api/parents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parentPayload),
        })
        const parentJson = await parentRes.json()
        if (!parentRes.ok) throw new Error(parentJson.error?.formErrors?.[0] ?? 'Failed to create parent')
        parentId = parentJson.parent.id
      }

      // Create patient linked to parent
      const patientPayload = {
        parent_id: parentId,
        ...nullifyPatient({
          baby_name: data.baby_name,
          baby_dob: data.baby_dob,
          place_of_birth: data.place_of_birth,
          sex: data.sex,
          weeks_gestation: data.weeks_gestation,
          birth_weight_grams: data.birth_weight_grams,
          mode_of_delivery: data.mode_of_delivery,
          discharge_weight_grams: data.discharge_weight_grams,
          paed_notes: data.paed_notes,
          consent_date: data.consent_date,
          consent_name: data.consent_name,
        }),
      }

      const patientRes = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientPayload),
      })
      const patientJson = await patientRes.json()
      if (!patientRes.ok) throw new Error(patientJson.error?.formErrors?.[0] ?? 'Failed to create patient')

      toast.success('Patient saved!')
      router.push(`/patients/${patientJson.patient.id}`)
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
        subtitle="Section 1: parent details · Section 2: baby details"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/patients"><ChevronLeft className="w-4 h-4 mr-1" />Back</Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-5">
        {/* ── Section 1: Parent ─────────────────────────────────────────── */}
        <Section title="Section 1 — Parent">
          <div className="space-y-4">
            {/* Toggle: existing vs new */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={useExisting ? 'outline' : 'default'}
                size="sm"
                onClick={() => setUseExisting(false)}
              >
                New parent
              </Button>
              <Button
                type="button"
                variant={useExisting ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseExisting(true)}
              >
                Existing parent
              </Button>
            </div>

            {useExisting ? (
              /* ── Existing parent combobox ─────────────────────────── */
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/80">Search parent <span className="text-destructive">*</span></Label>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={comboOpen} className="w-full justify-between font-normal">
                      {selectedParent ? selectedParent.client_name : 'Select parent…'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search by name…"
                        value={parentSearch}
                        onValueChange={setParentSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No parents found.</CommandEmpty>
                        <CommandGroup>
                          {(parentsData?.parents ?? []).map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.client_name}
                              onSelect={() => {
                                setSelectedParent(p)
                                setComboOpen(false)
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${selectedParent?.id === p.id ? 'opacity-100' : 'opacity-0'}`} />
                              <div>
                                <p className="text-sm font-medium">{p.client_name}</p>
                                {p.contact_number && <p className="text-xs text-muted-foreground">{p.contact_number}</p>}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              /* ── New parent inline fields ─────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Mom / Client Name" required>
                  <Input
                    {...register('client_name', { required: !useExisting ? 'Client name is required' : false })}
                    placeholder="e.g. Jane Smith"
                    className={errors.client_name ? 'border-destructive' : ''}
                  />
                  {errors.client_name && (
                    <p className="text-xs text-destructive mt-1">{errors.client_name.message}</p>
                  )}
                </Field>
                <Field label="Client ID Number">
                  <Input {...register('client_id_number')} placeholder="13-digit SA ID" />
                </Field>
                <Field label="Partner Name">
                  <Input {...register('partner_name')} placeholder="e.g. John Smith" />
                </Field>
                <Field label="Contact Number">
                  <Input {...register('contact_number')} placeholder="e.g. 082 555 1234" type="tel" />
                </Field>
                <Field label="Email Address">
                  <Input {...register('email')} placeholder="e.g. jane@email.com" type="email" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Home Address">
                    <Textarea {...register('home_address')} placeholder="Full home address" rows={2} />
                  </Field>
                </div>
                <Separator className="sm:col-span-2 my-1" />
                <Field label="Medical Aid Name">
                  <Input {...register('medical_aid_name')} placeholder="e.g. Discovery Health" />
                </Field>
                <Field label="Medical Aid Number">
                  <Input {...register('medical_aid_number')} placeholder="Scheme number" />
                </Field>
                <Field label="Main Member Name">
                  <Input {...register('main_member_name')} placeholder="Main member full name" />
                </Field>
                <Field label="Main Member ID Number">
                  <Input {...register('main_member_id')} placeholder="13-digit SA ID" />
                </Field>
                <Separator className="sm:col-span-2 my-1" />
                <Field label="Number of Pregnancies">
                  <Input {...register('num_pregnancies')} type="number" min="0" placeholder="e.g. 2" />
                </Field>
                <Field label="Number of Children">
                  <Input {...register('num_children')} type="number" min="0" placeholder="e.g. 1" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Maternal History">
                    <Textarea {...register('maternal_history')} placeholder="Relevant maternal history…" rows={2} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Gynae Notes">
                    <Textarea {...register('gynae_notes')} placeholder="Gynaecologist notes…" rows={2} />
                  </Field>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Section 2: Baby ───────────────────────────────────────────── */}
        <Section title="Section 2 — Baby">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Baby's Name">
              <Input {...register('baby_name')} placeholder="e.g. Baby Smith" />
            </Field>
            <Field label="Baby's Date of Birth">
              <Input {...register('baby_dob')} type="date" />
            </Field>
            <Field label="Place of Birth">
              <Input {...register('place_of_birth')} placeholder="e.g. Sandton Clinic" />
            </Field>
            <Field label="Sex">
              <Select value={sexValue} onValueChange={v => setValue('sex', v === 'unspecified' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Not specified</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Weeks Gestation at Birth">
              <Input {...register('weeks_gestation')} type="number" step="0.1" min="20" max="45" placeholder="e.g. 38" />
            </Field>
            <Field label="Mode of Delivery">
              <Select value={modeOfDelivery} onValueChange={v => setValue('mode_of_delivery', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NVD">NVD (Normal Vaginal Delivery)</SelectItem>
                  <SelectItem value="C-Section">C-Section</SelectItem>
                  <SelectItem value="Assisted">Assisted Delivery</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Weight at Birth (grams)">
              <Input {...register('birth_weight_grams')} type="number" min="0" placeholder="e.g. 3200" />
            </Field>
            <Field label="Discharge Weight (grams)">
              <Input {...register('discharge_weight_grams')} type="number" min="0" placeholder="e.g. 3050" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Paed Notes">
                <Textarea {...register('paed_notes')} placeholder="Paediatrician notes…" rows={2} />
              </Field>
            </div>
            <Separator className="sm:col-span-2 my-1" />
            <Field label="Consent Date">
              <Input {...register('consent_date')} type="date" />
            </Field>
            <Field label="Consenting Person Name">
              <Input {...register('consent_name')} placeholder="Full name of person consenting" />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save Patient'}
          </Button>
        </div>
      </form>
    </div>
  )
}
