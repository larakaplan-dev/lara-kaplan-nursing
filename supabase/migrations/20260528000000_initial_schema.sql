-- Initial schema — replicated from source project cicluswpjbwuvrgjzrze on 2026-05-28
-- Covers: tables, functions, triggers, indexes, RLS policies, audit_log immutability rules

-- ============================================================
-- 1. SEQUENCE
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- ============================================================
-- 2. TABLES (ordered by FK dependency)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patients (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  client_name text NOT NULL,
  client_id_number text,
  partner_name text,
  home_address text,
  contact_number text,
  email text,
  baby_name text,
  baby_dob date,
  place_of_birth text,
  medical_aid_name text,
  medical_aid_number text,
  main_member_name text,
  main_member_id text,
  maternal_history text,
  num_children integer,
  num_pregnancies integer,
  gynae_notes text,
  weeks_gestation numeric,
  birth_weight_grams integer,
  mode_of_delivery text,
  discharge_weight_grams integer,
  paed_notes text,
  consent_date date,
  consent_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  deletion_reason text
);

CREATE TABLE IF NOT EXISTS public.vaccine_catalog (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  nappi_code text,
  icd10_code text,
  default_price_cents integer NOT NULL,
  tariff_code text NOT NULL DEFAULT '88454',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.procedure_codes (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  price_cents integer NOT NULL,
  category text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.growth_entries (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  measurement_date date NOT NULL,
  age_weeks integer,
  age_months numeric,
  weight_grams integer,
  length_cm numeric,
  head_circumference_cm numeric,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.prevax_questionnaires (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  questionnaire_date date NOT NULL,
  serious_reaction boolean,
  seizure_history boolean,
  allergies boolean,
  vaccinated_last_4_weeks boolean,
  currently_sick boolean,
  on_medication boolean,
  immune_suppressing_agents boolean,
  recurrent_illness boolean,
  coughing boolean,
  runny_nose boolean,
  runny_nose_colour text,
  mood text,
  general_appearance text,
  temperature_celsius numeric,
  observation_notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.vaccination_records (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  questionnaire_id uuid REFERENCES public.prevax_questionnaires(id),
  vaccine_id uuid REFERENCES public.vaccine_catalog(id),
  vaccine_name text NOT NULL,
  age_group_label text,
  administered_date date NOT NULL,
  batch_number text,
  expiry_date date,
  site text,
  nappi_code text,
  price_cents integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  invoice_number text NOT NULL UNIQUE,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  patient_name text NOT NULL,
  patient_dob date,
  medical_aid_name text,
  medical_aid_number text,
  main_member_name text,
  main_member_id text,
  services_total_cents integer NOT NULL DEFAULT 0,
  vaccines_total_cents integer NOT NULL DEFAULT 0,
  grand_total_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoice_service_lines (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  service_date date NOT NULL,
  description text NOT NULL,
  icd10_code text,
  procedure_code text NOT NULL,
  unit_price_cents integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_cents integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.invoice_vaccine_lines (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  vaccination_record_id uuid REFERENCES public.vaccination_records(id),
  vaccine_date date NOT NULL,
  tariff_code text NOT NULL DEFAULT '88454',
  vaccine_name text NOT NULL,
  icd10_code text,
  nappi_code text,
  unit_price_cents integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_cents integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  action text NOT NULL CHECK (action = ANY (ARRAY['CREATE'::text, 'UPDATE'::text, 'DELETE'::text, 'RESTORE'::text])),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  record_label text,
  changes jsonb,
  performed_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number :=
      'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(NEXTVAL('invoice_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invoice_with_lines(
  p_invoice jsonb,
  p_service_lines jsonb DEFAULT '[]'::jsonb,
  p_vaccine_lines jsonb DEFAULT '[]'::jsonb
)
RETURNS invoices LANGUAGE plpgsql AS $$
DECLARE
  v_invoice invoices;
  v_line    jsonb;
  v_i       int := 0;
BEGIN
  INSERT INTO invoices (
    patient_id, invoice_date, status,
    services_total_cents, vaccines_total_cents, grand_total_cents,
    notes, invoice_number
  )
  VALUES (
    (p_invoice->>'patient_id')::uuid,
    (p_invoice->>'invoice_date')::date,
    COALESCE(p_invoice->>'status', 'unpaid'),
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
      service_date, unit_price_cents, quantity, sort_order
    )
    VALUES (
      v_invoice.id,
      v_line->>'description',
      v_line->>'procedure_code',
      v_line->>'icd10_code',
      (v_line->>'service_date')::date,
      (v_line->>'unit_price_cents')::int,
      COALESCE((v_line->>'quantity')::int, 1),
      v_i
    );
    v_i := v_i + 1;
  END LOOP;

  v_i := 0;
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_vaccine_lines) LOOP
    INSERT INTO invoice_vaccine_lines (
      invoice_id, vaccine_name, tariff_code, icd10_code,
      nappi_code, vaccine_date, unit_price_cents, quantity, sort_order
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
      v_i
    );
    v_i := v_i + 1;
  END LOOP;

  RETURN v_invoice;
END;
$$;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER invoices_auto_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_patients_client_name ON public.patients USING btree (client_name);
CREATE INDEX IF NOT EXISTS idx_patients_baby_name ON public.patients USING btree (baby_name);
CREATE INDEX IF NOT EXISTS idx_patients_baby_dob ON public.patients USING btree (baby_dob);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON public.patients USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_active ON public.patients USING btree (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_growth_patient_date ON public.growth_entries USING btree (patient_id, measurement_date);
CREATE INDEX IF NOT EXISTS idx_prevax_patient_date ON public.prevax_questionnaires USING btree (patient_id, questionnaire_date);
CREATE INDEX IF NOT EXISTS idx_vacc_patient_date ON public.vaccination_records USING btree (patient_id, administered_date);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices USING btree (patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices USING btree (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON public.audit_log USING btree (performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log USING btree (table_name, record_id);

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.patients AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.growth_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.growth_entries AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.prevax_questionnaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.prevax_questionnaires AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.vaccine_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.vaccine_catalog AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.vaccination_records AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.procedure_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.procedure_codes AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.invoices AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.invoice_service_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.invoice_service_lines AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.invoice_vaccine_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_full_access ON public.invoice_vaccine_lines AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY authenticated_read_only ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 7. AUDIT LOG IMMUTABILITY RULES
-- ============================================================

CREATE RULE audit_log_no_delete AS ON DELETE TO public.audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_update AS ON UPDATE TO public.audit_log DO INSTEAD NOTHING;
