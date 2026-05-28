'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ParentFormData, Parent } from '@/types'

interface ParentFormProps {
  defaultValues?: Partial<ParentFormData>
  onSubmit: (data: ParentFormData) => Promise<void>
  isLoading?: boolean
  parent?: Parent
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

export function ParentForm({ defaultValues, onSubmit, isLoading, parent }: ParentFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ParentFormData>({
    defaultValues: defaultValues ?? {
      client_name: parent?.client_name ?? '',
      client_id_number: parent?.client_id_number ?? '',
      partner_name: parent?.partner_name ?? '',
      home_address: parent?.home_address ?? '',
      contact_number: parent?.contact_number ?? '',
      email: parent?.email ?? '',
      medical_aid_name: parent?.medical_aid_name ?? '',
      medical_aid_number: parent?.medical_aid_number ?? '',
      main_member_name: parent?.main_member_name ?? '',
      main_member_id: parent?.main_member_id ?? '',
      maternal_history: parent?.maternal_history ?? '',
      num_children: parent?.num_children?.toString() ?? '',
      num_pregnancies: parent?.num_pregnancies?.toString() ?? '',
      gynae_notes: parent?.gynae_notes ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Section title="Client Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Mom / Client Name" required>
            <Input
              {...register('client_name', { required: 'Client name is required' })}
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
        </div>
      </Section>

      <Section title="Medical Aid">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      </Section>

      <Section title="History of Pregnancy">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </Section>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
