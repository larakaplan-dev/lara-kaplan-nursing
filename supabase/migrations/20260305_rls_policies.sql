-- Migration: Row Level Security policies
--
-- PURPOSE: Defense-in-depth. The API already uses the service_role key which
-- bypasses RLS. These policies document intended access rules and protect the
-- database if ever accessed directly via the anon key or Supabase Studio.
--
-- POLICY DESIGN: Single-user internal app — authenticated users get full access
-- to all clinical tables. The audit_log is read-only for authenticated users
-- (only service_role may insert, which enforces immutability).
--
-- TO APPLY: Run in Supabase Dashboard → SQL Editor.

-- ─── Enable RLS on all tables ───────────────────────────────────────────────

ALTER TABLE patients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevax_questionnaires   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccine_catalog         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_service_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_vaccine_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;

-- ─── Clinical data tables: full access for authenticated users ───────────────

CREATE POLICY "authenticated_full_access"
  ON patients FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access"
  ON growth_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access"
  ON prevax_questionnaires FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access"
  ON vaccine_catalog FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access"
  ON vaccination_records FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access"
  ON procedure_codes FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access"
  ON invoices FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access"
  ON invoice_service_lines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access"
  ON invoice_vaccine_lines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── audit_log: read-only for authenticated ──────────────────────────────────
-- Inserts are performed exclusively via service_role (the API).
-- The existing PostgreSQL RULE already blocks UPDATE/DELETE at the SQL level.
-- This policy adds an additional layer: no direct client inserts.

CREATE POLICY "authenticated_read_only"
  ON audit_log FOR SELECT TO authenticated
  USING (true);

-- anon role gets no access to any table (default deny with RLS enabled)
