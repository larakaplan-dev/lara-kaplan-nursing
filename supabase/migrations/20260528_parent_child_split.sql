-- Migration: Parent-child split
--
-- PURPOSE: Introduce a `parents` table for guardian-level data and refactor
-- `patients` to hold only child-specific data. This is the foundational slice —
-- all other slices depend on it.
--
-- SAFE TO RE-RUN: All DDL uses IF NOT EXISTS / IF EXISTS guards.
-- DATA MIGRATION: Sparse data — one parent row per existing patient row,
--   no deduplication needed per issue spec.
--
-- TO APPLY: Run in Supabase Dashboard → SQL Editor, or via `supabase db push`.

-- ─── 1. Create parents table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parents (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name      TEXT        NOT NULL,
  client_id_number TEXT,
  partner_name     TEXT,
  home_address     TEXT,
  contact_number   TEXT,
  email            TEXT,
  medical_aid_name    TEXT,
  medical_aid_number  TEXT,
  main_member_name    TEXT,
  main_member_id      TEXT,
  maternal_history    TEXT,
  num_children        INT,
  num_pregnancies     INT,
  gynae_notes         TEXT,
  deleted_at          TIMESTAMPTZ,
  deletion_reason     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. updated_at trigger for parents (same pattern as patients) ─────────────

CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS
$$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parents_updated_at ON parents;
CREATE TRIGGER trg_parents_updated_at
  BEFORE UPDATE ON parents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 3. Add parent_id to patients (nullable during migration) ─────────────────

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES parents(id);

-- ─── 4. Data migration: create a parent row for each existing patient ─────────

DO $$
DECLARE
  r RECORD;
  v_parent_id UUID;
BEGIN
  FOR r IN
    SELECT id, client_name, client_id_number, partner_name, home_address,
           contact_number, email, medical_aid_name, medical_aid_number,
           main_member_name, main_member_id, maternal_history,
           num_children, num_pregnancies, gynae_notes,
           deleted_at, deletion_reason, created_at
    FROM patients
    WHERE parent_id IS NULL
  LOOP
    INSERT INTO parents (
      client_name, client_id_number, partner_name, home_address,
      contact_number, email, medical_aid_name, medical_aid_number,
      main_member_name, main_member_id, maternal_history,
      num_children, num_pregnancies, gynae_notes,
      deleted_at, deletion_reason, created_at, updated_at
    ) VALUES (
      r.client_name, r.client_id_number, r.partner_name, r.home_address,
      r.contact_number, r.email, r.medical_aid_name, r.medical_aid_number,
      r.main_member_name, r.main_member_id, r.maternal_history,
      r.num_children, r.num_pregnancies, r.gynae_notes,
      r.deleted_at, r.deletion_reason, r.created_at, r.created_at
    )
    RETURNING id INTO v_parent_id;

    UPDATE patients SET parent_id = v_parent_id WHERE id = r.id;
  END LOOP;
END;
$$;

-- ─── 5. Enforce NOT NULL on parent_id now that all rows are backfilled ─────────

ALTER TABLE patients
  ALTER COLUMN parent_id SET NOT NULL;

-- ─── 6. Add parent_id to invoices (denormalised reference, backfilled) ────────

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES parents(id);

UPDATE invoices i
SET parent_id = p.parent_id
FROM patients p
WHERE i.patient_id = p.id
  AND i.parent_id IS NULL;

-- ─── 7. Drop moved columns from patients ──────────────────────────────────────

ALTER TABLE patients
  DROP COLUMN IF EXISTS client_name,
  DROP COLUMN IF EXISTS client_id_number,
  DROP COLUMN IF EXISTS partner_name,
  DROP COLUMN IF EXISTS home_address,
  DROP COLUMN IF EXISTS contact_number,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS medical_aid_name,
  DROP COLUMN IF EXISTS medical_aid_number,
  DROP COLUMN IF EXISTS main_member_name,
  DROP COLUMN IF EXISTS main_member_id,
  DROP COLUMN IF EXISTS maternal_history,
  DROP COLUMN IF EXISTS num_children,
  DROP COLUMN IF EXISTS num_pregnancies,
  DROP COLUMN IF EXISTS gynae_notes;

-- ─── 8. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_parents_client_name
  ON parents (client_name);

CREATE INDEX IF NOT EXISTS idx_parents_active
  ON parents (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_patients_parent
  ON patients (parent_id);

-- ─── 9. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access"
  ON parents FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Verification queries (run manually to confirm acceptance criteria) ───────
--
-- All patients have a parent_id:
--   SELECT count(*) FROM patients WHERE parent_id IS NULL;  -- expect 0
--
-- All invoices have a parent_id:
--   SELECT count(*) FROM invoices WHERE parent_id IS NULL;  -- expect 0
--
-- Dropped columns no longer exist:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'patients'
--     AND column_name IN ('client_name','medical_aid_name','maternal_history');  -- expect 0 rows
--
-- RLS enabled:
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'parents';  -- expect true
