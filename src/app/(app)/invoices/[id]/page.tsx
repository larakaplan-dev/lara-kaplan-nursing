'use client'

import { use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft } from 'lucide-react'
import { formatZAR, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import type { Invoice } from '@/types'
import type { InvoicePDFData } from '@/components/invoices/InvoicePDF/InvoiceDocument'
import { BANKING } from '@/lib/practiceConfig'

const PDFDownloadButton = dynamic(() => import('@/components/invoices/InvoiceForm/PDFDownloadButton'), { ssr: false })

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ invoice: Invoice }>({
    queryKey: ['invoice', id],
    queryFn: () => fetch(`/api/invoices/${id}`).then(r => r.json()),
  })

  const invoice = data?.invoice

  const updateStatus = async (status: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    toast.success(`Status updated to ${status}`)
    queryClient.invalidateQueries({ queryKey: ['invoice', id] })
    queryClient.invalidateQueries({ queryKey: ['invoices-all'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const pdfData: InvoicePDFData | null = invoice ? {
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.invoice_date,
    patientName: invoice.patient_name,
    patientDob: invoice.patient_dob,
    medicalAidName: invoice.medical_aid_name,
    medicalAidNumber: invoice.medical_aid_number,
    mainMemberName: invoice.main_member_name,
    mainMemberId: invoice.main_member_id,
    serviceLines: (invoice.service_lines || []).map(l => ({
      service_date: l.service_date,
      description: l.description,
      icd10_code: l.icd10_code || '',
      procedure_code: l.procedure_code,
      unit_price_cents: l.unit_price_cents,
      quantity: l.quantity,
    })),
    vaccineLines: (invoice.vaccine_lines || []).map(l => ({
      vaccine_date: l.vaccine_date,
      tariff_code: l.tariff_code,
      vaccine_name: l.vaccine_name,
      icd10_code: l.icd10_code || '',
      nappi_code: l.nappi_code || '',
      unit_price_cents: l.unit_price_cents,
      quantity: l.quantity,
    })),
    servicesTotalCents: invoice.services_total_cents,
    vaccinesTotalCents: invoice.vaccines_total_cents,
    grandTotalCents: invoice.grand_total_cents,
  } : null

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (!invoice) return <div className="p-6 text-muted-foreground">Invoice not found.</div>

  return (
    <div>
      <TopBar
        title={invoice.invoice_number}
        subtitle={`${invoice.patient_name} · ${formatDate(invoice.invoice_date)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoices"><ChevronLeft className="w-4 h-4 mr-1" />Back</Link>
            </Button>
            {pdfData && <PDFDownloadButton invoiceData={pdfData} />}
            <Select value={invoice.status} onValueChange={updateStatus}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge className={`mt-1 ${statusColors[invoice.status]}`}>{invoice.status}</Badge>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-semibold mt-1">{formatDate(invoice.invoice_date)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Medical Aid</p>
            <p className="text-sm font-semibold mt-1">{invoice.medical_aid_name || '—'}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Due</p>
            <p className="text-lg font-bold mt-0.5 text-teal-900">{formatZAR(invoice.grand_total_cents)}</p>
          </CardContent></Card>
        </div>

        {/* Services */}
        {(invoice.service_lines?.length ?? 0) > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="py-3 px-5 bg-muted/30">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Services</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {['Date', 'Description', 'ICD-10', 'Code', 'Total'].map(h => (
                    <th key={h} className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {invoice.service_lines?.map(l => (
                    <tr key={l.id}>
                      <td className="px-5 py-2.5">{formatDate(l.service_date)}</td>
                      <td className="px-5 py-2.5">{l.description}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{l.icd10_code || '—'}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{l.procedure_code}</td>
                      <td className="px-5 py-2.5 font-medium">{formatZAR(l.total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vaccines */}
        {(invoice.vaccine_lines?.length ?? 0) > 0 && (
          <Card className="overflow-hidden">
            <CardHeader className="py-3 px-5 bg-muted/30">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Vaccines</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  {['Date', 'Code', 'Vaccine', 'ICD-10', 'NAPPI', 'Amount'].map(h => (
                    <th key={h} className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {invoice.vaccine_lines?.map(l => (
                    <tr key={l.id}>
                      <td className="px-5 py-2.5">{formatDate(l.vaccine_date)}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{l.tariff_code}</td>
                      <td className="px-5 py-2.5 font-medium">{l.vaccine_name}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{l.icd10_code || '—'}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">{l.nappi_code || '—'}</td>
                      <td className="px-5 py-2.5 font-medium">{formatZAR(l.total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <div className="flex justify-end">
          <div className="text-sm space-y-1.5 w-56">
            {invoice.services_total_cents > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Services</span><span>{formatZAR(invoice.services_total_cents)}</span></div>
            )}
            {invoice.vaccines_total_cents > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Vaccines</span><span>{formatZAR(invoice.vaccines_total_cents)}</span></div>
            )}
            <div className="border-t border-border pt-1.5 flex justify-between font-bold">
              <span>Total Due</span><span className="text-teal-900">{formatZAR(invoice.grand_total_cents)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {BANKING.bank} · {BANKING.accountName} · {BANKING.accountNumber} · Branch {BANKING.branchCode}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
