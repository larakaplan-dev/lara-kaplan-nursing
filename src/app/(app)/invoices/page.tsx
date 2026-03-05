'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, FileText } from 'lucide-react'
import { formatZAR, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Invoice } from '@/types'

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ invoices: Invoice[]; total: number }>({
    queryKey: ['invoices-all', statusFilter],
    queryFn: () =>
      fetch(`/api/invoices${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`).then(r => r.json()),
  })

  const invoices = data?.invoices || []

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    toast.success(`Marked as ${status}`)
    queryClient.invalidateQueries({ queryKey: ['invoices-all'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  return (
    <div>
      <TopBar
        title="Invoices"
        subtitle={data ? `${data.total} invoice${data.total !== 1 ? 's' : ''}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild size="sm">
              <Link href="/invoices/new"><Plus className="w-4 h-4 mr-1" />New Invoice</Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : !invoices.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No invoices found.</p>
            <Button asChild className="mt-4">
              <Link href="/invoices/new">Create First Invoice</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Invoice #</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Patient</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Total</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{inv.patient_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.invoice_date)}</td>
                  <td className="px-5 py-3 font-semibold hidden sm:table-cell">{formatZAR(inv.grand_total_cents)}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <Badge className={`text-xs ${statusColors[inv.status]}`}>{inv.status}</Badge>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <div className="flex gap-1">
                      {inv.status === 'draft' && (
                        <button onClick={() => updateStatus(inv.id, 'sent')}
                          className="text-xs text-blue-600 hover:underline">Mark sent</button>
                      )}
                      {inv.status === 'sent' && (
                        <button onClick={() => updateStatus(inv.id, 'paid')}
                          className="text-xs text-emerald-600 hover:underline">Mark paid</button>
                      )}
                    </div>
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
