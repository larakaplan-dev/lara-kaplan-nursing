'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck } from 'lucide-react'
import type { AuditLog } from '@/types'

const ACTION_STYLES: Record<string, string> = {
  CREATE:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE:  'bg-blue-50 text-blue-700 border-blue-200',
  DELETE:  'bg-red-50 text-red-700 border-red-200',
  RESTORE: 'bg-amber-50 text-amber-700 border-amber-200',
}

const TABLE_LABELS: Record<string, string> = {
  patients:             'Patient',
  growth_entries:       'Growth',
  vaccination_records:  'Vaccination',
  invoices:             'Invoice',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AuditLogPage() {
  const [tableFilter, setTableFilter] = useState('all')

  const { data, isLoading } = useQuery<{ entries: AuditLog[]; total: number }>({
    queryKey: ['audit-log', tableFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (tableFilter !== 'all') params.set('table', tableFilter)
      return fetch(`/api/audit-log?${params}`).then(r => r.json())
    },
  })

  return (
    <div>
      <TopBar
        title="Audit Log"
        subtitle={data ? `${data.total} entries` : undefined}
        actions={
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All records</SelectItem>
              <SelectItem value="patients">Patients</SelectItem>
              <SelectItem value="growth_entries">Growth</SelectItem>
              <SelectItem value="vaccination_records">Vaccinations</SelectItem>
              <SelectItem value="invoices">Invoices</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : !data?.entries?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th scope="col" className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Date / Time</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Action</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Type</th>
                  <th scope="col" className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(entry.performed_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={ACTION_STYLES[entry.action] ?? ''}
                      >
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TABLE_LABELS[entry.table_name] ?? entry.table_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{entry.record_label ?? '—'}</span>
                      {entry.changes && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {JSON.stringify(entry.changes)}
                        </span>
                      )}
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
