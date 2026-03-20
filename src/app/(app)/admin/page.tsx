'use client'

import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Syringe, Stethoscope } from 'lucide-react'

export default function AdminPage() {
  return (
    <div>
      <TopBar title="Settings" subtitle="Manage vaccine catalog and procedure codes" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link href="/admin/vaccines">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Syringe className="w-4 h-4 text-muted-foreground" />
                Vaccine Catalog
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Add, edit, or deactivate vaccines. Manage NAPPI codes, ICD-10 codes, and default prices.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/procedure-codes">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                Procedure Codes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Add, edit, or remove procedure codes and their tariff prices.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
