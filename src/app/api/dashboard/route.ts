import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startOfMonth } from 'date-fns'

export async function GET() {
  const supabase = createAdminClient()
  const monthStart = startOfMonth(new Date()).toISOString().split('T')[0]

  const [patients, pendingInvoices, paidThisMonth, recentPatients] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
    supabase.from('invoices').select('grand_total_cents').eq('status', 'paid').gte('invoice_date', monthStart),
    supabase.from('patients').select('id, baby_name, baby_dob, created_at, parents(client_name)').order('created_at', { ascending: false }).limit(5),
  ])

  const monthRevenue = (paidThisMonth.data || []).reduce(
    (sum, inv) => sum + (inv.grand_total_cents || 0), 0
  )

  return NextResponse.json({
    totalPatients: patients.count || 0,
    pendingInvoices: pendingInvoices.count || 0,
    monthRevenueCents: monthRevenue,
    recentPatients: (recentPatients.data || []).map(p => ({
      id: p.id,
      client_name: (Array.isArray(p.parents) ? p.parents[0] : p.parents as { client_name: string } | null)?.client_name ?? '',
      baby_name: p.baby_name,
      baby_dob: p.baby_dob,
      created_at: p.created_at,
    })),
  })
}
