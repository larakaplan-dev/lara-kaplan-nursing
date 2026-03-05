-- Migration: Add CHECK constraints for enum columns
--
-- PURPOSE: Enforce at the database level that only valid enum values are stored.
-- Previously these were TEXT columns with no constraint — any string was accepted.
--
-- TO APPLY: Run in Supabase Dashboard → SQL Editor.

ALTER TABLE patients
  ADD CONSTRAINT patients_delivery_check
  CHECK (mode_of_delivery IN ('NVD', 'C-Section', 'Assisted'));

ALTER TABLE invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid'));

ALTER TABLE procedure_codes
  ADD CONSTRAINT procedure_codes_category_check
  CHECK (category IN ('consultation', 'immunisation', 'vaccine'));
