import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'
import type { InvoicePDFData } from '@/types'
import { PRACTICE, BANKING } from '@/lib/practiceConfig'

const TEAL = '#0f4c5c'
const TEAL_LIGHT = '#d0eaed'
const GREY = '#64748b'

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 9, color: '#0f172a' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, paddingBottom: 2, borderBottomWidth: 2, borderBottomColor: TEAL },
  logo: { width: 110, height: 68, objectFit: 'contain' },
  practiceName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: TEAL },
  practiceDetail: { fontSize: 8, color: GREY, marginTop: 2 },
  invoiceInfo: { marginBottom: 14 },
  invoiceTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: TEAL },
  invoiceMeta: { fontSize: 8, color: GREY, marginTop: 2 },
  // Patient
  patientSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  patientBlock: { flex: 1 },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: GREY, letterSpacing: 0.5, marginBottom: 4 },
  patientName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: TEAL, marginBottom: 3 },
  detail: { fontSize: 8, color: '#334155', marginBottom: 1.5 },
  // Notice
  notice: { backgroundColor: TEAL_LIGHT, padding: 8, borderRadius: 3, marginBottom: 14 },
  noticeText: { fontSize: 7.5, color: TEAL, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  // Tables
  tableTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: TEAL, letterSpacing: 0.5, marginBottom: 4, marginTop: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: TEAL, padding: 5 },
  tableHeaderText: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', padding: 5 },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  cell: { fontSize: 8 },
  // Totals
  totalsBlock: { marginTop: 14, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 3 },
  totalLabel: { width: 120, fontSize: 8, color: GREY, textAlign: 'right', paddingRight: 12 },
  totalValue: { width: 80, fontSize: 8, textAlign: 'right' },
  grandTotalLabel: { width: 120, fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEAL, textAlign: 'right', paddingRight: 12 },
  grandTotalValue: { width: 80, fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  divider: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginVertical: 4, width: 200, alignSelf: 'flex-end' },
  // Banking
  bankingSection: { marginTop: 20, padding: 12, borderWidth: 1, borderColor: TEAL_LIGHT, borderRadius: 4 },
  bankingTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: TEAL, marginBottom: 6 },
  bankRow: { flexDirection: 'row', marginBottom: 2 },
  bankLabel: { width: 90, fontSize: 8, color: GREY },
  bankValue: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: '#e2e8f0', paddingTop: 6 },
  footerText: { fontSize: 7, color: GREY, textAlign: 'center' },
  // Paid stamp
  stamp: { position: 'absolute', bottom: 80, left: 40, transform: 'rotate(-25deg)', borderWidth: 3, borderColor: '#dc2626', padding: '6 14', opacity: 0.85 },
  stampText: { color: '#dc2626', fontFamily: 'Helvetica-Bold', fontSize: 28, letterSpacing: 2, textAlign: 'center' },
  stampDate: { color: '#dc2626', fontSize: 9, textAlign: 'center', marginTop: 2 },
})

function formatZAR(cents: number) {
  return `R ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  try { return format(new Date(d), 'dd/MM/yyyy') } catch { return d }
}

export function InvoiceDocument({ data }: { data: InvoicePDFData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.practiceName}>Lara Kaplan</Text>
            <Text style={s.practiceDetail}>Registered Nurse and Midwife</Text>
            <Text style={s.practiceDetail}>Practice No. {PRACTICE.number}</Text>
          </View>
          <Image style={s.logo} src={`${typeof window !== 'undefined' ? window.location.origin : ''}/logo-cropped.png`} />
        </View>

        {/* Invoice Info */}
        <View style={s.invoiceInfo}>
          <Text style={s.invoiceTitle}>INVOICE</Text>
          <Text style={s.invoiceMeta}>{data.invoiceNumber}</Text>
          <Text style={s.invoiceMeta}>Date: {formatDate(data.invoiceDate)}</Text>
        </View>

        {/* Notice */}
        <View style={s.notice}>
          <Text style={s.noticeText}>
            This practice is not contracted to medical aid. Please settle before submitting to your medical aid.
          </Text>
        </View>

        {/* Patient Info */}
        <View style={s.patientSection}>
          <View style={s.patientBlock}>
            <Text style={s.sectionLabel}>Patient</Text>
            <Text style={s.patientName}>{data.patientName}</Text>
            {data.patientDob && <Text style={s.detail}>Date of Birth: {formatDate(data.patientDob)}</Text>}
          </View>
          <View style={[s.patientBlock, { alignItems: 'flex-end' }]}>
            <Text style={s.sectionLabel}>Medical Aid</Text>
            <Text style={s.detail}>{data.medicalAidName || '—'}</Text>
            <Text style={s.detail}>No. {data.medicalAidNumber || '—'}</Text>
            <Text style={s.detail}>Main Member: {data.mainMemberName || '—'}</Text>
            <Text style={s.detail}>ID: {data.mainMemberId || '—'}</Text>
          </View>
        </View>

        {/* Services Table */}
        {data.serviceLines.length > 0 && (
          <>
            <Text style={s.tableTitle}>Consultation Services</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: '15%' }]}>Date</Text>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>Description</Text>
              <Text style={[s.tableHeaderText, { width: '12%' }]}>ICD-10</Text>
              <Text style={[s.tableHeaderText, { width: '12%' }]}>Code</Text>
              <Text style={[s.tableHeaderText, { width: '15%', textAlign: 'right' }]}>Amount</Text>
            </View>
            {data.serviceLines.map((line, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.cell, { width: '15%' }]}>{formatDate(line.service_date)}</Text>
                <Text style={[s.cell, { flex: 1 }]}>{line.description}</Text>
                <Text style={[s.cell, { width: '12%' }]}>{line.icd10_code || '—'}</Text>
                <Text style={[s.cell, { width: '12%' }]}>{line.procedure_code}</Text>
                <Text style={[s.cell, { width: '15%', textAlign: 'right' }]}>
                  {formatZAR(line.unit_price_cents * line.quantity)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Vaccines Table */}
        {data.vaccineLines.length > 0 && (
          <>
            <Text style={s.tableTitle}>Vaccines Administered</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderText, { width: '13%' }]}>Date</Text>
              <Text style={[s.tableHeaderText, { width: '10%' }]}>Code</Text>
              <Text style={[s.tableHeaderText, { flex: 1 }]}>Vaccine</Text>
              <Text style={[s.tableHeaderText, { width: '10%' }]}>ICD-10</Text>
              <Text style={[s.tableHeaderText, { width: '18%' }]}>NAPPI</Text>
              <Text style={[s.tableHeaderText, { width: '15%', textAlign: 'right' }]}>Amount</Text>
            </View>
            {data.vaccineLines.map((line, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.cell, { width: '13%' }]}>{formatDate(line.vaccine_date)}</Text>
                <Text style={[s.cell, { width: '10%' }]}>{line.tariff_code}</Text>
                <Text style={[s.cell, { flex: 1 }]}>{line.vaccine_name}</Text>
                <Text style={[s.cell, { width: '10%' }]}>{line.icd10_code || '—'}</Text>
                <Text style={[s.cell, { width: '18%' }]}>{line.nappi_code || '—'}</Text>
                <Text style={[s.cell, { width: '15%', textAlign: 'right' }]}>
                  {formatZAR(line.unit_price_cents * line.quantity)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Totals */}
        <View style={s.totalsBlock}>
          {data.serviceLines.length > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Services subtotal</Text>
              <Text style={s.totalValue}>{formatZAR(data.servicesTotalCents)}</Text>
            </View>
          )}
          {data.vaccineLines.length > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Vaccines subtotal</Text>
              <Text style={s.totalValue}>{formatZAR(data.vaccinesTotalCents)}</Text>
            </View>
          )}
          <View style={s.divider} />
          <View style={s.totalRow}>
            <Text style={s.grandTotalLabel}>TOTAL DUE</Text>
            <Text style={s.grandTotalValue}>{formatZAR(data.grandTotalCents)}</Text>
          </View>
        </View>

        {/* Banking */}
        <View style={s.bankingSection}>
          <Text style={s.bankingTitle}>Payment Details — EFT</Text>
          <View style={s.bankRow}><Text style={s.bankLabel}>Account Name:</Text><Text style={s.bankValue}>{BANKING.accountName}</Text></View>
          <View style={s.bankRow}><Text style={s.bankLabel}>Bank:</Text><Text style={s.bankValue}>{BANKING.bank}</Text></View>
          <View style={s.bankRow}><Text style={s.bankLabel}>Account No.:</Text><Text style={s.bankValue}>{BANKING.accountNumber}</Text></View>
          <View style={s.bankRow}><Text style={s.bankLabel}>Branch Code:</Text><Text style={s.bankValue}>{BANKING.branchCode}</Text></View>
          <View style={s.bankRow}><Text style={s.bankLabel}>Reference:</Text><Text style={s.bankValue}>{data.invoiceNumber} / {data.patientName}</Text></View>
        </View>

        {/* Paid stamp */}
        {data.isPaid && (
          <View style={s.stamp}>
            <Text style={s.stampText}>PAID</Text>
            {data.paidAt && <Text style={s.stampDate}>{formatDate(data.paidAt)}</Text>}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {PRACTICE.clinic} · {PRACTICE.phone} · {PRACTICE.email}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
