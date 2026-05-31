'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { MILESTONE_GROUPS, getDefaultOpenGroup } from '@/lib/milestoneData'
import type { MilestoneRecord, MilestoneNote } from '@/types'

interface Props {
  patientId: string
  dob: string | null
}

type QueryData = { records: MilestoneRecord[]; notes: MilestoneNote[] }

export function MilestonesTab({ patientId, dob }: Props) {
  const queryClient = useQueryClient()
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set())

  const { data } = useQuery<QueryData>({
    queryKey: ['milestones', patientId],
    queryFn: () => fetch(`/api/patients/${patientId}/milestones`).then(r => r.json()),
    staleTime: 0,
  })

  const checkedKeys = new Set((data?.records ?? []).map(r => r.milestone_key))
  const noteMap = Object.fromEntries((data?.notes ?? []).map(n => [n.age_group_key, n.note]))

  const toggleMilestone = async (key: string, checked: boolean) => {
    const queryKey = ['milestones', patientId]
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData<QueryData>(queryKey)

    queryClient.setQueryData<QueryData>(queryKey, old => {
      if (!old) return old
      const records = checked
        ? [...old.records, { id: '', patient_id: patientId, milestone_key: key, checked_at: new Date().toISOString(), created_at: new Date().toISOString() }]
        : old.records.filter(r => r.milestone_key !== key)
      return { ...old, records }
    })

    try {
      if (checked) {
        const res = await fetch(`/api/patients/${patientId}/milestones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ milestone_key: key }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      } else {
        const res = await fetch(`/api/patients/${patientId}/milestones?milestoneKey=${encodeURIComponent(key)}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error((await res.json()).error)
      }
      queryClient.invalidateQueries({ queryKey })
    } catch {
      queryClient.setQueryData(queryKey, previous)
      toast.error('Failed to save milestone')
    }
  }

  const saveNote = async (ageGroupKey: string, note: string) => {
    setSavingNotes(prev => new Set(prev).add(ageGroupKey))
    try {
      const res = await fetch(`/api/patients/${patientId}/milestone-notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age_group_key: ageGroupKey, note }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      queryClient.invalidateQueries({ queryKey: ['milestones', patientId] })
    } catch {
      toast.error('Failed to save note')
    } finally {
      setSavingNotes(prev => { const s = new Set(prev); s.delete(ageGroupKey); return s })
    }
  }

  const defaultGroup = getDefaultOpenGroup(dob)

  return (
    <Accordion type="single" collapsible defaultValue={defaultGroup} className="space-y-2">
      {MILESTONE_GROUPS.map(group => {
        const allItems = group.categories.flatMap(c => c.items)
        const checkedCount = allItems.filter(i => checkedKeys.has(i.key)).length
        const total = allItems.length

        return (
          <AccordionItem key={group.key} value={group.key} className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold hover:no-underline">
              <span>{group.label}</span>
              <span className="ml-auto mr-4 text-xs font-normal text-muted-foreground tabular-nums">
                {checkedCount} / {total}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              {group.categories.map(cat => (
                <div key={cat.label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {cat.label}
                  </p>
                  <div className="space-y-2">
                    {cat.items.map(item => (
                      <div key={item.key} className="flex items-start gap-2.5">
                        <Checkbox
                          id={item.key}
                          checked={checkedKeys.has(item.key)}
                          onCheckedChange={checked => toggleMilestone(item.key, !!checked)}
                          className="mt-0.5 flex-shrink-0"
                        />
                        <label
                          htmlFor={item.key}
                          className="text-sm leading-snug cursor-pointer select-none"
                        >
                          {item.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Clinical Notes
                </p>
                <Textarea
                  defaultValue={noteMap[group.key] ?? ''}
                  key={noteMap[group.key] ?? group.key}
                  placeholder="Add observations, referrals, or concerns…"
                  className="text-sm resize-none"
                  rows={2}
                  disabled={savingNotes.has(group.key)}
                  onBlur={e => {
                    const val = e.currentTarget.value
                    if (val !== (noteMap[group.key] ?? '')) {
                      saveNote(group.key, val)
                    }
                  }}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
