'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Label,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label as UILabel } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate, weightDisplay } from '@/lib/utils'
import { getWhoData } from '@/lib/whoGrowthData'
import { buildGrowthPoints } from '@/lib/buildGrowthPoints'
import type { GrowthEntry, GrowthEntryFormData } from '@/types'

interface GrowthTabProps {
  patientId: string
  sex: 'male' | 'female' | null
  dob: string | null
}

const PERCENTILES = ['p3', 'p10', 'p25', 'p50', 'p75', 'p90', 'p97'] as const
type Percentile = typeof PERCENTILES[number]

const PERCENTILE_LABEL: Record<Percentile, string> = {
  p3: 'P3', p10: 'P10', p25: 'P25', p50: 'P50', p75: 'P75', p90: 'P90', p97: 'P97',
}

const PERCENTILE_STYLE: Record<Percentile, { stroke: string; strokeWidth: number; strokeDasharray?: string }> = {
  p3:  { stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4 3' },
  p10: { stroke: '#f97316', strokeWidth: 1 },
  p25: { stroke: '#84cc16', strokeWidth: 1 },
  p50: { stroke: '#0ea5e9', strokeWidth: 2 },
  p75: { stroke: '#84cc16', strokeWidth: 1 },
  p90: { stroke: '#f97316', strokeWidth: 1 },
  p97: { stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4 3' },
}

function WhoLines({ metric, sex }: { metric: 'weight' | 'length' | 'hc'; sex: 'male' | 'female' }) {
  const data = getWhoData(metric, sex)
  return (
    <>
      {PERCENTILES.map(p => (
        data.map(row => (
          <ReferenceLine
            key={`${p}-${row.month}`}
            segment={[
              { x: row.month, y: row[p] },
              { x: row.month, y: row[p] },
            ]}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray={p === 'p3' || p === 'p97' ? '4 3' : undefined}
          />
        ))
      ))}
    </>
  )
}

interface MetricChartProps {
  title: string
  metric: 'weight' | 'length' | 'hc'
  unit: string
  color: string
  yDomain: [number, number]
  entries: GrowthEntry[]
  sex: 'male' | 'female' | null
  patientId: string
  dob: string | null
}

function MetricChart({ title, metric, unit, color, yDomain, entries, sex, patientId, dob }: MetricChartProps) {
  const points = buildGrowthPoints(entries, metric, dob)

  // Build WHO reference lines as individual segment pairs for each percentile
  const whoLineData: Array<{ month: number } & Record<Percentile, number>> =
    sex ? getWhoData(metric, sex).map(row => ({
      month: row.month,
      p3: row.p3, p10: row.p10, p25: row.p25, p50: row.p50,
      p75: row.p75, p90: row.p90, p97: row.p97,
    })) : []

  // Merge WHO reference data and child points by x (ageMonths)
  // Use a combined dataset with separate keys so Recharts renders them together
  type DataPoint = {
    x: number
    value?: number
    p3?: number; p10?: number; p25?: number; p50?: number
    p75?: number; p90?: number; p97?: number
  }

  const xValues = new Set<number>()
  whoLineData.forEach(d => xValues.add(d.month))
  points.forEach(p => xValues.add(p.ageMonths))

  const combined: DataPoint[] = Array.from(xValues)
    .sort((a, b) => a - b)
    .map(x => {
      const who = whoLineData.find(d => d.month === x)
      const pt = points.find(p => p.ageMonths === x)
      return {
        x,
        value: pt?.value,
        p3: who?.p3, p10: who?.p10, p25: who?.p25, p50: who?.p50,
        p75: who?.p75, p90: who?.p90, p97: who?.p97,
      }
    })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {!sex && (
          <p className="text-sm text-muted-foreground mb-3">
            WHO reference lines require sex to be recorded.{' '}
            <Link href={`/patients/${patientId}/edit`} className="underline text-foreground">
              Add sex on the edit form
            </Link>{' '}
            and they will appear automatically.
          </p>
        )}
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={combined} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="x"
              type="number"
              domain={[0, 24]}
              ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
              tick={{ fontSize: 11 }}
              label={{ value: 'Age (months)', position: 'insideBottom', offset: -2, fontSize: 11 }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11 }}
              unit={unit}
              width={48}
            />

            {/* WHO percentile reference lines */}
            {sex && PERCENTILES.map(p => {
              const style = PERCENTILE_STYLE[p]
              return (
                <Line
                  key={p}
                  dataKey={p}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                  dot={false}
                  activeDot={false}
                  connectNulls
                  legendType="none"
                  isAnimationActive={false}
                />
              )
            })}

            {/* Child's measurements */}
            <Line
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4, fill: color }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
              legendType="none"
            />
          </LineChart>
        </ResponsiveContainer>
        {sex && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 justify-center">
            {PERCENTILES.map(p => {
              const style = PERCENTILE_STYLE[p]
              return (
                <div key={p} className="flex items-center gap-1">
                  <svg width="18" height="8" className="flex-shrink-0">
                    <line
                      x1="0" y1="4" x2="18" y2="4"
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      strokeDasharray={style.strokeDasharray}
                    />
                  </svg>
                  <span style={{ fontSize: 10, color: style.stroke, lineHeight: 1 }}>
                    {PERCENTILE_LABEL[p]}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function GrowthTab({ patientId, sex, dob }: GrowthTabProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<GrowthEntryFormData>()

  const { data, isLoading } = useQuery<{ entries: GrowthEntry[] }>({
    queryKey: ['growth', patientId],
    queryFn: () => fetch(`/api/patients/${patientId}/growth`).then(r => r.json()),
  })

  const entries = data?.entries || []

  const onAdd = async (formData: GrowthEntryFormData) => {
    setSaving(true)
    try {
      const body = {
        measurement_date: formData.measurement_date,
        age_weeks: formData.age_weeks ? parseInt(formData.age_weeks) : null,
        age_months: formData.age_months ? parseFloat(formData.age_months) : null,
        weight_grams: formData.weight_grams ? parseInt(formData.weight_grams) : null,
        length_cm: formData.length_cm ? parseFloat(formData.length_cm) : null,
        head_circumference_cm: formData.head_circumference_cm ? parseFloat(formData.head_circumference_cm) : null,
        notes: formData.notes || null,
      }
      const res = await fetch(`/api/patients/${patientId}/growth`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Measurement added')
      queryClient.invalidateQueries({ queryKey: ['growth', patientId] })
      reset()
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (entryId: string) => {
    if (!confirm('Delete this measurement?')) return
    const res = await fetch(`/api/patients/${patientId}/growth?entryId=${entryId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      queryClient.invalidateQueries({ queryKey: ['growth', patientId] })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Growth Monitoring</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Measurement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Growth Measurement</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onAdd)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <UILabel className="text-xs">Date <span className="text-destructive">*</span></UILabel>
                  <Input {...register('measurement_date', { required: true })} type="date"
                    defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                </div>
                <div className="space-y-1.5">
                  <UILabel className="text-xs">Age (weeks)</UILabel>
                  <Input {...register('age_weeks')} type="number" min="0" placeholder="e.g. 6" />
                </div>
                <div className="space-y-1.5">
                  <UILabel className="text-xs">Age (months)</UILabel>
                  <Input {...register('age_months')} type="number" step="0.1" min="0" placeholder="e.g. 1.5" />
                </div>
                <div className="space-y-1.5">
                  <UILabel className="text-xs">Weight (grams)</UILabel>
                  <Input {...register('weight_grams')} type="number" min="0" placeholder="e.g. 4200" />
                </div>
                <div className="space-y-1.5">
                  <UILabel className="text-xs">Length (cm)</UILabel>
                  <Input {...register('length_cm')} type="number" step="0.1" min="0" placeholder="e.g. 54.5" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <UILabel className="text-xs">Head Circumference (cm)</UILabel>
                  <Input {...register('head_circumference_cm')} type="number" step="0.1" min="0" placeholder="e.g. 36.2" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <UILabel className="text-xs">Notes</UILabel>
                  <Textarea {...register('notes')} rows={2} placeholder="Any observations…" />
                </div>
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Saving…' : 'Save Measurement'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Three WHO charts */}
      <MetricChart
        title="Weight-for-Age"
        metric="weight"
        unit="kg"
        color="#0f4c5c"
        yDomain={[0, 20]}
        entries={entries}
        sex={sex}
        patientId={patientId}
        dob={dob}
      />
      <MetricChart
        title="Length-for-Age"
        metric="length"
        unit="cm"
        color="#2ba3b6"
        yDomain={[40, 100]}
        entries={entries}
        sex={sex}
        patientId={patientId}
        dob={dob}
      />
      <MetricChart
        title="Head Circumference-for-Age"
        metric="hc"
        unit="cm"
        color="#f59e0b"
        yDomain={[28, 56]}
        entries={entries}
        sex={sex}
        patientId={patientId}
        dob={dob}
      />

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !entries.length ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No measurements recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {['Date', 'Age', 'Weight', 'Length', 'HC', 'Notes', ''].map(h => (
                      <th key={h} scope="col" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">{formatDate(e.measurement_date)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {e.age_months != null ? `${e.age_months}m` : e.age_weeks != null ? `${e.age_weeks}w` : '—'}
                      </td>
                      <td className="px-4 py-2.5">{weightDisplay(e.weight_grams)}</td>
                      <td className="px-4 py-2.5">{e.length_cm ? `${e.length_cm} cm` : '—'}</td>
                      <td className="px-4 py-2.5">{e.head_circumference_cm ? `${e.head_circumference_cm} cm` : '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{e.notes || '—'}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => onDelete(e.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
