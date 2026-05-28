# Lara Kaplan Nursing — Claude Context

## Stack
- Next.js 16 App Router, TypeScript strict, Tailwind v4, shadcn/ui (New York style)
- Supabase (`cicluswpjbwuvrgjzrze.supabase.co`), @sentry/nextjs, TanStack Query v5

## Dev Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint check
- Supabase CLI: `supabase migration new <name>` / `supabase db push`

## Key Files
- `src/lib/practiceConfig.ts` — practice + banking constants (not env vars — intentional)
- `src/app/api/ocr/route.ts` — OCR endpoint with rate limiting via audit_log (limit: 20/day)
- `supabase/migrations/` — all schema + RLS migrations

## Architecture Constraints
- `InvoiceDocument.tsx` renders client-side via `PDFDownloadLink` — cannot use server-only env vars
- `audit_log` table is immutable (PostgreSQL RULE) — used for POPIA compliance + OCR rate limiting
- Soft delete pattern (`deleted_at`) for HPCSA 6-year retention — never hard-delete patient/invoice records
- Atomic invoice creation via Supabase RPC `create_invoice_with_lines()`

## Patterns
- UUID validation on all `[id]` path params in API routes
- RLS policies are the primary access control layer — verify before adding API-level checks
- Use `staleTime: 0` for patient and invoice TanStack queries
