import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import PDFDownloadButton from './PDFDownloadButton'
import type { InvoicePDFData } from '@/types'

vi.mock('@react-pdf/renderer', () => ({
  PDFDownloadLink: ({ children }: { children: (args: { loading: boolean }) => React.ReactNode }) =>
    <div>{children({ loading: false })}</div>,
  Document: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Image: () => null,
  StyleSheet: { create: (s: unknown) => s },
}))

vi.mock('@/lib/practiceConfig', () => ({
  PRACTICE: { name: 'P', number: '1', address: 'A', clinic: 'C', phone: '0', email: 'e@e.com' },
  BANKING: { accountName: 'A', bank: 'B', accountNumber: '1', branchCode: '2' },
}))

const baseData: InvoicePDFData = {
  invoiceNumber: 'INV-001',
  invoiceDate: '2026-03-15',
  patientName: 'Baby Smith',
  patientDob: null,
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

describe('PDFDownloadButton', () => {
  it('shows "Preview PDF" when invoice is not paid', () => {
    render(<PDFDownloadButton invoiceData={{ ...baseData, isPaid: false }} />)
    expect(screen.getByRole('button', { name: /preview pdf/i })).toBeInTheDocument()
  })

  it('shows "Download Receipt" when invoice is paid', () => {
    render(<PDFDownloadButton invoiceData={{ ...baseData, isPaid: true, paidAt: '2026-03-20' }} />)
    expect(screen.getByRole('button', { name: /download receipt/i })).toBeInTheDocument()
  })
})
