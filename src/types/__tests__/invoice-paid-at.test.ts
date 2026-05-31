import { describe, it, expectTypeOf } from 'vitest'
import type { Invoice, InvoicePDFData } from '../index'

describe('Invoice', () => {
  it('has paid_at as nullable timestamp', () => {
    expectTypeOf<Invoice['paid_at']>().toEqualTypeOf<string | null>()
  })
})

describe('InvoicePDFData', () => {
  it('has isPaid boolean', () => {
    expectTypeOf<InvoicePDFData['isPaid']>().toEqualTypeOf<boolean>()
  })

  it('has paidAt as nullable string', () => {
    expectTypeOf<InvoicePDFData['paidAt']>().toEqualTypeOf<string | null>()
  })
})
