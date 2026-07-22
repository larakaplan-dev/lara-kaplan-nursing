-- ============================================================
-- Lara Kaplan Private Nursing Care — Patient Management System
-- Supabase Schema (AWS Cape Town: af-south-1)
-- Run this first, then seed.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE patients (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Client (mom/guardian)
  client_name             TEXT NOT NULL,
  client_id_number        TEXT,
  partner_name            TEXT,
  home_address            TEXT,
  contact_number          TEXT,
  email                   TEXT,

  -- Baby
  baby_name               TEXT,
  baby_dob                DATE,
  place_of_birth          TEXT,

  -- Medical aid
  medical_aid_name        TEXT,
  medical_aid_number      TEXT,
  main_member_name        TEXT,
  main_member_id          TEXT,

  -- Pregnancy history
  maternal_history        TEXT,
  num_children            INTEGER,
  num_pregnancies         INTEGER,
  gynae_notes             TEXT,

  -- Baby history
  weeks_gestation         NUMERIC(4,1),
  birth_weight_grams      INTEGER,
  mode_of_delivery        TEXT,        -- 'NVD' | 'C-Section' | 'Assisted'
  discharge_weight_grams  INTEGER,
  paed_notes              TEXT,

  -- Consent
  consent_date            DATE,
  consent_name            TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GROWTH MONITORING
-- ============================================================
CREATE TABLE growth_entries (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id              UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  measurement_date        DATE NOT NULL,
  age_weeks               INTEGER,
  age_months              NUMERIC(4,1),
  weight_grams            INTEGER,
  length_cm               NUMERIC(5,1),
  head_circumference_cm   NUMERIC(4,1),
  notes                   TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRE-VAX QUESTIONNAIRES (one per visit)
-- ============================================================
CREATE TABLE prevax_questionnaires (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id                  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  questionnaire_date          DATE NOT NULL,

  -- History questions
  serious_reaction            BOOLEAN,
  seizure_history             BOOLEAN,
  allergies                   BOOLEAN,
  vaccinated_last_4_weeks     BOOLEAN,
  currently_sick              BOOLEAN,
  on_medication               BOOLEAN,
  immune_suppressing_agents   BOOLEAN,
  recurrent_illness           BOOLEAN,

  -- Baby observations
  coughing                    BOOLEAN,
  runny_nose                  BOOLEAN,
  runny_nose_colour           TEXT,
  mood                        TEXT,
  general_appearance          TEXT,
  temperature_celsius         NUMERIC(4,1),
  observation_notes           TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VACCINE CATALOG (seed data)
-- ============================================================
CREATE TABLE vaccine_catalog (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL UNIQUE,
  nappi_code          TEXT,
  icd10_code          TEXT,
  default_price_cents INTEGER NOT NULL,
  tariff_code         TEXT NOT NULL DEFAULT '88454',
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  age_group_label     TEXT CHECK (age_group_label IS NULL OR age_group_label IN (
                         'Birth', '6 Weeks', '10 Weeks', '14 Weeks', '6 Months', '9 Months',
                         '12 Months', '15 Months', '18 Months', '2 Years', '6 Years', '12 Years'
                       )),                -- schedule position; drives batch add in Vaccinations tab
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VACCINATION RECORDS
-- ============================================================
CREATE TABLE vaccination_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  questionnaire_id    UUID REFERENCES prevax_questionnaires(id) ON DELETE SET NULL,
  vaccine_id          UUID REFERENCES vaccine_catalog(id) ON DELETE SET NULL,

  vaccine_name        TEXT NOT NULL,
  age_group_label     TEXT,            -- '6 Weeks', '3 Months', etc.
  administered_date   DATE NOT NULL,
  batch_number        TEXT,
  expiry_date         DATE,
  site                TEXT,            -- 'Left Thigh', 'Right Arm', etc.
  nappi_code          TEXT,
  price_cents         INTEGER,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROCEDURE CODES — PR-088
-- ============================================================
CREATE TABLE procedure_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  category    TEXT NOT NULL   -- 'consultation' | 'immunisation' | 'vaccine'
);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE invoices (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id              UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,

  invoice_number          TEXT NOT NULL UNIQUE,
  invoice_date            DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Snapshot of patient at invoice time
  patient_name            TEXT NOT NULL,
  patient_dob             DATE,
  medical_aid_name        TEXT,
  medical_aid_number      TEXT,
  main_member_name        TEXT,
  main_member_id          TEXT,

  services_total_cents    INTEGER NOT NULL DEFAULT 0,
  vaccines_total_cents    INTEGER NOT NULL DEFAULT 0,
  grand_total_cents       INTEGER NOT NULL DEFAULT 0,

  status                  TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'sent' | 'paid'
  notes                   TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVOICE SERVICE LINES (consultations)
-- ============================================================
CREATE TABLE invoice_service_lines (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  service_date      DATE NOT NULL,
  description       TEXT NOT NULL,
  icd10_code        TEXT,
  procedure_code    TEXT NOT NULL,
  unit_price_cents  INTEGER NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 1,
  total_cents       INTEGER NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- INVOICE VACCINE LINES
-- ============================================================
CREATE TABLE invoice_vaccine_lines (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id              UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  vaccination_record_id   UUID REFERENCES vaccination_records(id) ON DELETE SET NULL,

  vaccine_date            DATE NOT NULL,
  tariff_code             TEXT NOT NULL DEFAULT '88454',
  vaccine_name            TEXT NOT NULL,
  icd10_code              TEXT,
  nappi_code              TEXT,
  unit_price_cents        INTEGER NOT NULL,
  quantity                INTEGER NOT NULL DEFAULT 1,
  total_cents             INTEGER NOT NULL,
  sort_order              INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_patients_client_name ON patients(client_name);
CREATE INDEX idx_patients_baby_name ON patients(baby_name);
CREATE INDEX idx_patients_baby_dob ON patients(baby_dob);
CREATE INDEX idx_patients_created_at ON patients(created_at DESC);

CREATE INDEX idx_growth_patient_date ON growth_entries(patient_id, measurement_date);
CREATE INDEX idx_vacc_patient_date ON vaccination_records(patient_id, administered_date);
CREATE INDEX idx_prevax_patient_date ON prevax_questionnaires(patient_id, questionnaire_date);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================
-- updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUTO INVOICE NUMBER: INV-YYYY-NNN
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number :=
      'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
      LPAD(NEXTVAL('invoice_number_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_auto_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
