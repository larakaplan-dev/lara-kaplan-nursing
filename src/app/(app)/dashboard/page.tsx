'use client'

import { useQuery } from '@tanstack/react-query'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, TrendingUp, Baby } from 'lucide-react'
import { formatZAR, ageLabel } from '@/lib/utils'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

interface DashboardData {
  totalPatients: number
  pendingInvoices: number
  monthRevenueCents: number
  recentPatients: Array<{
    id: string
    client_name: string
    baby_name: string | null
    baby_dob: string | null
    created_at: string
  }>
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    refetchInterval: 60_000,
  })

  const stats = [
    {
      label: 'Total Patients',
      value: data?.totalPatients ?? '—',
      icon: Users,
      color: 'text-teal-700',
      bg: 'bg-teal-50',
    },
    {
      label: 'Invoices Pending',
      value: data?.pendingInvoices ?? '—',
      icon: FileText,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Revenue This Month',
      value: data ? formatZAR(data.monthRevenueCents) : '—',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={`${format(new Date(), 'EEEE, d MMMM yyyy')}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? <span className="animate-pulse text-muted-foreground">···</span> : s.value}
                </p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent patients */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Baby className="w-4 h-4" /> Recent Patients
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !data?.recentPatients?.length ? (
            <div className="p-6 text-sm text-muted-foreground">No patients yet. <Link href="/patients/new" className="text-primary underline">Add your first patient.</Link></div>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentPatients.map(p => (
                <li key={p.id}>
                  <Link
                    href={`/patients/${p.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.baby_name || 'Baby'}</p>
                      <p className="text-xs text-muted-foreground">
                        Mom: {p.client_name}
                        {p.baby_dob ? ` · ${ageLabel(p.baby_dob)}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(p.created_at), 'dd/MM/yyyy')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
