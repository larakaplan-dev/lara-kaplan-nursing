'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { PatientFormData, Patient } from '@/types'

interface PatientFormProps {
  defaultValues?: Partial<PatientFormData>
  onSubmit: (data: PatientFormData) => Promise<void>
  isLoading?: boolean
  patient?: Patient
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

export function PatientForm({ defaultValues, onSubmit, isLoading, patient }: PatientFormProps) {
  const { register, handleSubmit, setValue, watch } = useForm<PatientFormData>({
    defaultValues: defaultValues ?? {
      baby_name: patient?.baby_name ?? '',
      baby_dob: patient?.baby_dob ?? '',
      place_of_birth: patient?.place_of_birth ?? '',
      weeks_gestation: patient?.weeks_gestation?.toString() ?? '',
      birth_weight_grams: patient?.birth_weight_grams?.toString() ?? '',
      mode_of_delivery: patient?.mode_of_delivery ?? '',
      discharge_weight_grams: patient?.discharge_weight_grams?.toString() ?? '',
      sex: patient?.sex ?? '',
      paed_notes: patient?.paed_notes ?? '',
      consent_date: patient?.consent_date ?? '',
      consent_name: patient?.consent_name ?? '',
    },
  })

  const modeOfDelivery = watch('mode_of_delivery')
  const sex = watch('sex')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Section title="Baby Details">
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
            <Select value={sex} onValueChange={v => setValue('sex', v === 'unspecified' ? '' : v)}>
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
        </div>
      </Section>

      <Section title="Baby's History">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      </Section>

      <Section title="Consent">
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          I hereby give consent for vaccines to be administered to my child according to the recommended vaccination
          schedule in South Africa. The schedule and side effects have been explained by the nursing practitioner and
          I accept the risks associated with vaccine administration.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Consent Date">
            <Input {...register('consent_date')} type="date" />
          </Field>
          <Separator className="sm:col-span-2 my-1" />
          <Field label="Consenting Person Name">
            <Input {...register('consent_name')} placeholder="Full name of person consenting" />
          </Field>
        </div>
      </Section>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save Baby Details'}
        </Button>
      </div>
    </form>
  )
}
