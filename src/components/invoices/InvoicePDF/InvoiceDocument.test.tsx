import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { InvoiceDocument } from './InvoiceDocument'
import type { InvoicePDFData } from '@/types'

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Image: () => null,
  StyleSheet: { create: (s: unknown) => s },
}))

vi.mock('@/lib/practiceConfig', () => ({
  PRACTICE: {
    name: 'Test Practice',
    number: '1234',
    address: '1 Test St',
    clinic: 'Test Clinic',
    phone: '000',
    email: 'test@test.com',
  },
  BANKING: {
    accountName: 'Test Account',
    bank: 'Test Bank',
    accountNumber: '1234',
    branchCode: '5678',
  },
}))

const baseData: InvoicePDFData = {
  invoiceNumber: 'INV-001',
  invoiceDate: '2026-03-15',
  patientName: 'Baby Smith',
  patientDob: '2025-01-01',
  medicalAidName: null,
  medicalAidNumber: null,
  mainMemberName: null,
  mainMemberId: null,
  serviceLines: [],
  vaccineLines: [],
  servicesTotalCents: 0,
  vaccinesTotalCents: 0,
  grandTotalCents: 50000,
  isPaid: false,
  paidAt: null,
}

describe('InvoiceDocument — PAID stamp', () => {
  it('does not show PAID stamp when isPaid is false', () => {
    render(<InvoiceDocument data={{ ...baseData, isPaid: false, paidAt: null }} />)
    expect(screen.queryByText('PAID')).not.toBeInTheDocument()
  })

  it('shows PAID stamp when isPaid is true', () => {
    render(<InvoiceDocument data={{ ...baseData, isPaid: true, paidAt: '2026-03-20' }} />)
    expect(screen.getByText('PAID')).toBeInTheDocument()
  })

  it('shows formatted payment date on the stamp', () => {
    render(<InvoiceDocument data={{ ...baseData, isPaid: true, paidAt: '2026-03-20' }} />)
    expect(screen.getByText('20/03/2026')).toBeInTheDocument()
  })
})
