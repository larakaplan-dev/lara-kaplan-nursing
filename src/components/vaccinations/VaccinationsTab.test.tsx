import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VaccinationsTab } from './VaccinationsTab'
import type { VaccineCatalog } from '@/types'

const PATIENT_ID = '87654321-4321-4321-8321-210987654321'

const CATALOG: VaccineCatalog[] = [
  { id: 'v1', name: 'Rotavirus', nappi_code: 'NAPPI1', icd10_code: null, default_price_cents: 50000, tariff_code: '88454', active: true, age_group_labels: ['6 Weeks'] },
  { id: 'v2', name: 'DTaP',      nappi_code: 'NAPPI2', icd10_code: null, default_price_cents: 60000, tariff_code: '88454', active: true, age_group_labels: ['6 Weeks', '10 Weeks', '14 Weeks'] },
  { id: 'v3', name: 'MMR',       nappi_code: 'NAPPI3', icd10_code: null, default_price_cents: 70000, tariff_code: '88454', active: true, age_group_labels: ['9 Months'] },
  { id: 'v4', name: 'Custom Vax', nappi_code: null,     icd10_code: null, default_price_cents: 10000, tariff_code: '88454', active: true, age_group_labels: [] },
]

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function mockFetch(opts: { postOk?: (vaccineName: string) => boolean } = {}) {
  const postOk = opts.postOk ?? (() => true)
  const calls: { url: string; method: string; body?: unknown }[] = []

  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    calls.push({ url, method, body })

    if (url === `/api/patients/${PATIENT_ID}/vaccinations` && method === 'GET') {
      return { json: () => Promise.resolve({ records: [] }) }
    }
    if (url === '/api/vaccines' && method === 'GET') {
      return { json: () => Promise.resolve({ vaccines: CATALOG }) }
    }
    if (url === `/api/patients/${PATIENT_ID}/vaccinations` && method === 'POST') {
      const ok = postOk(body.vaccine_name)
      return { ok, json: () => Promise.resolve(ok ? { record: {} } : { error: 'Failed' }) }
    }
    throw new Error(`Unhandled fetch: ${method} ${url}`)
  }))

  return calls
}

describe('VaccinationsTab — Add by Age Group', () => {
  beforeEach(() => {
    mockFetch()
  })

  it('only lists age groups that have active vaccines assigned', async () => {
    const user = userEvent.setup()
    render(<VaccinationsTab patientId={PATIENT_ID} />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /add by age group/i }))
    await user.click(screen.getByRole('combobox'))

    expect(await screen.findByRole('option', { name: '6 Weeks' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '10 Weeks' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '9 Months' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Birth' })).not.toBeInTheDocument()
  })

  it('auto-populates one row per vaccine in the selected age group, pre-filled from the catalog', async () => {
    const user = userEvent.setup()
    render(<VaccinationsTab patientId={PATIENT_ID} />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /add by age group/i }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '6 Weeks' }))

    expect(await screen.findByText('Rotavirus')).toBeInTheDocument()
    expect(screen.getByText('DTaP')).toBeInTheDocument()
    expect(screen.queryByText('MMR')).not.toBeInTheDocument()
  })

  it('includes a vaccine in every age group it is assigned to (many-to-many)', async () => {
    const user = userEvent.setup()
    render(<VaccinationsTab patientId={PATIENT_ID} />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /add by age group/i }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '10 Weeks' }))

    expect(await screen.findByText('DTaP')).toBeInTheDocument()
    expect(screen.queryByText('Rotavirus')).not.toBeInTheDocument()
  })

  it('allows removing a row before saving', async () => {
    const user = userEvent.setup()
    render(<VaccinationsTab patientId={PATIENT_ID} />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /add by age group/i }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '6 Weeks' }))

    const rotavirusRow = (await screen.findByText('Rotavirus')).closest('[data-testid="batch-row"]') as HTMLElement
    await user.click(within(rotavirusRow).getByRole('button', { name: /remove/i }))

    expect(screen.queryByText('Rotavirus')).not.toBeInTheDocument()
    expect(screen.getByText('DTaP')).toBeInTheDocument()
  })

  it('saves one request per remaining row and reports success', async () => {
    const calls = mockFetch()
    const user = userEvent.setup()
    render(<VaccinationsTab patientId={PATIENT_ID} />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /add by age group/i }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '6 Weeks' }))
    await screen.findByText('Rotavirus')

    await user.click(screen.getByRole('button', { name: /save all/i }))

    const posts = await vi.waitFor(() => {
      const p = calls.filter(c => c.method === 'POST')
      expect(p.length).toBe(2)
      return p
    })
    const names = posts.map(p => (p.body as { vaccine_name: string }).vaccine_name).sort()
    expect(names).toEqual(['DTaP', 'Rotavirus'])
  })

  it('reports partial failure, distinguishing succeeded from failed vaccines', async () => {
    mockFetch({ postOk: name => name !== 'DTaP' })
    const user = userEvent.setup()
    render(<VaccinationsTab patientId={PATIENT_ID} />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /add by age group/i }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: '6 Weeks' }))
    await screen.findByText('Rotavirus')

    await user.click(screen.getByRole('button', { name: /save all/i }))

    // Failed row remains for retry; succeeded row is gone.
    expect(await screen.findByText('DTaP')).toBeInTheDocument()
    expect(screen.queryByText('Rotavirus')).not.toBeInTheDocument()
  })

  it('leaves the existing one-at-a-time Record Vaccine flow unaffected', async () => {
    const user = userEvent.setup()
    render(<VaccinationsTab patientId={PATIENT_ID} />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /^record vaccine$/i }))
    expect(await screen.findByRole('heading', { name: /record vaccination/i })).toBeInTheDocument()
  })

  it('shows and submits the vaccination price in rands, not raw cents', async () => {
    const user = userEvent.setup()
    const calls = mockFetch()
    render(<VaccinationsTab patientId={PATIENT_ID} />, { wrapper: wrapper() })

    await user.click(await screen.findByRole('button', { name: /^record vaccine$/i }))
    await screen.findByRole('heading', { name: /record vaccination/i })

    // Selecting a catalog vaccine (default_price_cents: 50000) should populate
    // the price field as rands ("500.00"), never the raw cents value.
    const [vaccineSelect] = screen.getAllByRole('combobox')
    await user.click(vaccineSelect)
    await user.click(await screen.findByRole('option', { name: 'Rotavirus' }))

    const priceInput = screen.getByPlaceholderText('e.g. 750.00')
    expect(priceInput).toHaveValue(500)

    const dateInput = document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-01-01' } })
    // fireEvent.submit (rather than clicking the submit button) sidesteps a
    // jsdom-only quirk where its native step-mismatch check misfires on
    // whole-number values with step="0.01" due to floating-point rounding.
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)

    const postCall = await vi.waitFor(() => {
      const call = calls.find(c => c.method === 'POST')
      if (!call) throw new Error('POST not made yet')
      return call
    })
    expect((postCall.body as { price_cents: number }).price_cents).toBe(50000)
  })
})
