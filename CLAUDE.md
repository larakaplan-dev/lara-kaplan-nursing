# Lara Kaplan Nursing — Claude Context

## Stack
- Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui (New York style)
- Supabase (`cicluswpjbwuvrgjzrze.supabase.co`), @sentry/nextjs, TanStack Query v5

## Dev Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint check
- `npm run test` — Vitest (happy-dom environment)
- Supabase CLI: `supabase migration new <name>` / `supabase db push`

## Environment
- Copy `.env.example` to `.env.local`; all required vars are documented there
- Practice and banking details are in `src/lib/practiceConfig.ts`, not env vars

## Key Files
- `src/lib/practiceConfig.ts` — practice + banking constants (not env vars — intentional)
- `src/app/api/ocr/route.ts` — OCR endpoint with rate limiting via audit_log (limit: 20/day)
- `src/types/index.ts` — single source of truth for all domain types
- `supabase/migrations/` — all schema + RLS migrations

## Data Model
- `parents` — guardian data (name, contact, medical aid); one parent : many patients
- `patients` — child-specific data (DOB, sex, birth weight, notes); has `parent_id` FK
- `invoices` — carries denormalised `parent_id`; created atomically via RPC with line items
- `invoice_service_lines`, `invoice_vaccine_lines` — snapshot data at invoice creation time
- `growth`, `vaccinations`, `milestones` — clinical records; all belong to a patient
- `milestone_records` — sparse (no row = unchecked); `milestone_notes` upserted per milestone
- `vaccines`, `procedure_codes` — admin-managed catalogs
- `audit_log` — immutable (PostgreSQL RULE); append-only for POPIA compliance

## Supabase Clients
- `createAdminClient()` — service role, bypasses RLS; use in all API routes and `src/lib/db/*`
- Browser client (`src/lib/supabase/client.ts`) — anon key; only used in auth UI (login/logout)
- Server client — only instantiated inline in `middleware.ts`; do not use elsewhere

## Types
- DB models: `Parent`, `Patient`, `Invoice`, `InvoiceServiceLine`, `InvoiceVaccineLine`, `GrowthEntry`, `VaccinationRecord`, `MilestoneRecord`, `MilestoneNote`, `AuditLog`
- Form types (`*FormData`) use `string` for numeric fields — React Hook Form registers everything as strings; convert on submit
- `InvoicePDFData` is the shape passed to `InvoiceDocument.tsx` for PDF rendering

## Testing
- API route tests live in `__tests__/` beside the route file
- Lib tests live beside the source file (e.g., `whoGrowthData.test.ts`)
- Component tests live beside the component (e.g., `MilestonesTab.test.tsx`)
- `createAdminClient` is always mocked in API route tests — never hits real Supabase

## Architecture Constraints
- `InvoiceDocument.tsx` renders client-side via `PDFDownloadLink` — cannot use server-only env vars
- `audit_log` table is immutable (PostgreSQL RULE) — used for POPIA compliance + OCR rate limiting
- Soft delete pattern (`deleted_at`) for HPCSA 6-year retention — never hard-delete patient/invoice records
- Atomic invoice creation via Supabase RPC `create_invoice_with_lines()`
- `middleware.ts` enforces auth on all routes; API routes receive 401 JSON, UI routes redirect to `/login` — do not add redundant auth checks in route handlers

## Patterns
- UUID validation on all `[id]` path params in API routes
- RLS policies are the primary access control layer — verify before adding API-level checks
- `staleTime: 0` for patient and invoice TanStack queries
- All monetary values stored as integer cents (e.g. `price_cents`, `total_cents`); use `formatZAR()` from `src/lib/utils.ts` for display
- Call `logAudit()` from `src/lib/audit.ts` on every mutation in API routes (CREATE, UPDATE, DELETE, RESTORE) — POPIA compliance requires a complete audit trail; mock it in tests with `vi.mock('@/lib/audit', () => ({ logAudit: vi.fn() }))`
