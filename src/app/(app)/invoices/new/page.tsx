'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { InvoiceBuilder } from '@/components/invoices/InvoiceForm'

function NewInvoiceContent() {
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient') || undefined

  return (
    <div>
      <TopBar
        title="New Invoice"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices"><ChevronLeft className="w-4 h-4 mr-1" />Back</Link>
          </Button>
        }
      />
      <InvoiceBuilder preselectedPatientId={preselectedPatientId} />
    </div>
  )
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
      <NewInvoiceContent />
    </Suspense>
  )
}
