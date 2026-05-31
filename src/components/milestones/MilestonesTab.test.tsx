import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MilestonesTab } from './MilestonesTab'
import { MILESTONE_GROUPS } from '@/lib/milestoneData'

const PATIENT_ID = '87654321-4321-4321-8321-210987654321'
// DOB giving ~5 months → default open group should be '4mo'
const DOB_5MO = new Date(Date.now() - 5 * 30.4375 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ records: [], notes: [] }),
  }))
})

describe('MilestonesTab', () => {
  it('renders an accordion item for each of the 12 age groups', async () => {
    render(<MilestonesTab patientId={PATIENT_ID} dob={DOB_5MO} />, { wrapper: wrapper() })
    for (const group of MILESTONE_GROUPS) {
      expect(await screen.findByText(group.label)).toBeInTheDocument()
    }
  })

  it('shows 0 / total fraction when no milestones are checked', async () => {
    render(<MilestonesTab patientId={PATIENT_ID} dob={DOB_5MO} />, { wrapper: wrapper() })
    // 2 months group has 11 milestones
    expect(await screen.findByText('0 / 11')).toBeInTheDocument()
  })

  it('shows updated fraction when milestones are returned as checked', async () => {
    const twoMoGroup = MILESTONE_GROUPS.find(g => g.key === '2mo')!
    const firstKey = twoMoGroup.categories[0].items[0].key
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        records: [{ id: 'r1', patient_id: PATIENT_ID, milestone_key: firstKey, checked_at: '', created_at: '' }],
        notes: [],
      }),
    }))
    render(<MilestonesTab patientId={PATIENT_ID} dob={DOB_5MO} />, { wrapper: wrapper() })
    expect(await screen.findByText('1 / 11')).toBeInTheDocument()
  })

  it('renders checked milestone checkbox as checked', async () => {
    const twoMoGroup = MILESTONE_GROUPS.find(g => g.key === '2mo')!
    const firstItem = twoMoGroup.categories[0].items[0]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        records: [{ id: 'r1', patient_id: PATIENT_ID, milestone_key: firstItem.key, checked_at: '', created_at: '' }],
        notes: [],
      }),
    }))
    render(<MilestonesTab patientId={PATIENT_ID} dob={DOB_5MO} />, { wrapper: wrapper() })
    // Open the 2mo accordion to reveal checkboxes
    const trigger = await screen.findByText('2 Months')
    trigger.click()
    const checkbox = await screen.findByLabelText(firstItem.text) as HTMLInputElement
    expect(checkbox.getAttribute('data-state')).toBe('checked')
  })
})
