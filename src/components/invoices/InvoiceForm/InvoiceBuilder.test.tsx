import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvoiceBuilder } from '@/components/invoices/InvoiceForm'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

function jsonResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
}

function makeFetchMock() {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/procedure-codes')) return jsonResponse({ codes: [] })
    if (url.includes('/api/vaccines')) return jsonResponse({ vaccines: [] })
    if (url.includes('/api/parents')) return jsonResponse({ parents: [] })
    return jsonResponse({})
  })
}

function renderBuilder() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <InvoiceBuilder />
    </QueryClientProvider>
  )
}

describe('InvoiceBuilder — service line price', () => {
  beforeEach(() => {
    global.fetch = makeFetchMock() as typeof global.fetch
  })

  it('service line price is an editable number input, not static text', async () => {
    const user = userEvent.setup()
    renderBuilder()

    const [addService] = screen.getAllByRole('button', { name: /^add$/i })
    await user.click(addService)

    // Must be input[type=number] (spinbutton role), not a <p>
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('editing service line price updates grand total immediately', async () => {
    const user = userEvent.setup()
    renderBuilder()

    const [addService] = screen.getAllByRole('button', { name: /^add$/i })
    await user.click(addService)

    const priceInput = screen.getByRole('spinbutton')
    await user.clear(priceInput)
    await user.type(priceInput, '100')

    // Grand total must reflect R 100.00
    expect(screen.getAllByText('R 100.00').length).toBeGreaterThanOrEqual(1)
  })

  it('typing a multi-digit price is not garbled by toFixed reformatting', async () => {
    const user = userEvent.setup()
    renderBuilder()

    const [addService] = screen.getAllByRole('button', { name: /^add$/i })
    await user.click(addService)

    const priceInput = screen.getByRole('spinbutton')
    // Simulate what a user does: select-all then type a new value
    await user.tripleClick(priceInput)
    await user.type(priceInput, '350')

    // If toFixed(2) re-formats after every keypress, the cursor is pushed to
    // the end of "X.00" and subsequent digits append there, mangling the value.
    // The correct result is R 350.00, not something like R 3.50 or R 3 501.00.
    expect(screen.getAllByText('R 350.00').length).toBeGreaterThanOrEqual(1)
  })
})
