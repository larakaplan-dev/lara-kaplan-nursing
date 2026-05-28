-- Migration: Derive patient_name from DB when not supplied by caller
--
-- PURPOSE: The client may send patient_name as null/undefined when the
-- parents list hasn't loaded yet (staleTime: 0 refetch race) or when the
-- baby has no name and the parent lookup failed client-side. Rather than
-- letting the NOT NULL constraint fire with a confusing DB error, the RPC
-- now looks up the name itself as a fallback.
--
-- TO APPLY: Run in Supabase Dashboard → SQL Editor.

CREATE OR REPLACE FUNCTION create_invoice_with_lines(
  p_invoice       jsonb,
  p_service_lines jsonb DEFAULT '[]',
  p_vaccine_lines jsonb DEFAULT '[]'
)
RETURNS invoices
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice      invoices;
  v_line         jsonb;
  v_i            int := 0;
  v_patient_name text;
BEGIN
  -- Prefer caller-supplied name; fall back to baby_name → parent client_name
  v_patient_name := NULLIF(p_invoice->>'patient_name', '');

  IF v_patient_name IS NULL THEN
    SELECT COALESCE(NULLIF(pt.baby_name, ''), pa.client_name)
      INTO v_patient_name
      FROM patients pt
      JOIN parents pa ON pa.id = pt.parent_id
     WHERE pt.id = (p_invoice->>'patient_id')::uuid;
  END IF;

  INSERT INTO invoices (
    patient_id, parent_id, invoice_date, status,
    patient_name, patient_dob,
    medical_aid_name, medical_aid_number,
    main_member_name, main_member_id,
    services_total_cents, vaccines_total_cents, grand_total_cents,
    notes, invoice_number
  )
  VALUES (
    (p_invoice->>'patient_id')::uuid,
    NULLIF(p_invoice->>'parent_id', '')::uuid,
    (p_invoice->>'invoice_date')::date,
    COALESCE(p_invoice->>'status', 'draft'),
    v_patient_name,
    NULLIF(p_invoice->>'patient_dob', '')::date,
    p_invoice->>'medical_aid_name',
    p_invoice->>'medical_aid_number',
    p_invoice->>'main_member_name',
    p_invoice->>'main_member_id',
    COALESCE((p_invoice->>'services_total_cents')::int, 0),
    COALESCE((p_invoice->>'vaccines_total_cents')::int, 0),
    COALESCE((p_invoice->>'grand_total_cents')::int, 0),
    p_invoice->>'notes',
    ''
  )
  RETURNING * INTO v_invoice;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_service_lines) LOOP
    INSERT INTO invoice_service_lines (
      invoice_id, description, procedure_code, icd10_code,
      service_date, unit_price_cents, quantity, total_cents, sort_order
    )
    VALUES (
      v_invoice.id,
      v_line->>'description',
      v_line->>'procedure_code',
      v_line->>'icd10_code',
      (v_line->>'service_date')::date,
      (v_line->>'unit_price_cents')::int,
      COALESCE((v_line->>'quantity')::int, 1),
      (v_line->>'total_cents')::int,
      v_i
    );
    v_i := v_i + 1;
  END LOOP;

  v_i := 0;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_vaccine_lines) LOOP
    INSERT INTO invoice_vaccine_lines (
      invoice_id, vaccine_name, tariff_code, icd10_code,
      nappi_code, vaccine_date, unit_price_cents, quantity, total_cents, sort_order
    )
    VALUES (
      v_invoice.id,
      v_line->>'vaccine_name',
      v_line->>'tariff_code',
      v_line->>'icd10_code',
      v_line->>'nappi_code',
      (v_line->>'vaccine_date')::date,
      (v_line->>'unit_price_cents')::int,
      COALESCE((v_line->>'quantity')::int, 1),
      (v_line->>'total_cents')::int,
      v_i
    );
    v_i := v_i + 1;
  END LOOP;

  RETURN v_invoice;
END;
$$;

GRANT EXECUTE ON FUNCTION create_invoice_with_lines(jsonb, jsonb, jsonb) TO service_role;
