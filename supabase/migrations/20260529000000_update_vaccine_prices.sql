-- Update vaccine_catalog prices from 2026 price list (Vaccine Template with prices.pdf)
-- Matches existing rows by nappi_code (preferred) or name, then updates price + nappi_code.
-- Inserts 4 new vaccines: Bexsero, Influvac, Beyfortus, Abrysvo.

-- ─── UPDATE existing vaccines ────────────────────────────────────────────────

UPDATE vaccine_catalog AS vc
SET
  default_price_cents = v.price_cents,
  nappi_code          = v.nappi_code
FROM (VALUES
  ('Adacel Quadra',  '713229001',  48000),
  ('Avaxim 80',      '700513001',  63000),
  ('Gardasil',       '710249001', 120000),
  ('Gardasil 9',     '3006049001',244000),
  ('Hexaxim',        '719637001',  75000),
  ('Havrix Junior',  '703448001',  63000),
  ('Infanrix Hexa',  '707285001',  78000),
  ('Menactra',       '720708001', 100000),
  ('Onvara',         '723131001',  70000),
  ('Omzyta',         '724016001',  58000),
  ('Prevenar 13',    '715858001', 115000),
  ('Priorix',        '700772001',  58000),
  ('Rotarix',        '714133001',  63000),
  ('Tetraxim',       '711258001',  48000),
  ('Varilrix',       '892939001',  70000),
  ('Vaxigrip Tetra', '3000826001', 15000),
  ('Vaxneuvance',    '3009167001',130000)
) AS v(name, nappi_code, price_cents)
WHERE
  -- prefer matching by NAPPI code; fall back to name for rows where nappi was NULL
  vc.nappi_code = v.nappi_code
  OR (vc.nappi_code IS NULL AND vc.name = v.name);

-- ─── INSERT new vaccines ──────────────────────────────────────────────────────

INSERT INTO vaccine_catalog (name, nappi_code, icd10_code, default_price_cents, tariff_code, active)
VALUES
  ('Bexsero',   '3009533001', 'Z23.8',  165000, '88454', true),
  ('Influvac',  '3000826001', 'Z25.1',   12000, '88454', true),
  ('Beyfortus', '3010330001', 'Z29.11', 655000, '88454', true),
  ('Abrysvo',   '715858001',  'Z29.11', 385000, '88454', true)
ON CONFLICT (name) DO UPDATE SET
  nappi_code          = EXCLUDED.nappi_code,
  icd10_code          = EXCLUDED.icd10_code,
  default_price_cents = EXCLUDED.default_price_cents,
  active              = true;

-- ─── Verify ───────────────────────────────────────────────────────────────────
-- Run this after applying to confirm all 21 vaccines with correct prices:
--
-- SELECT name, nappi_code, icd10_code, default_price_cents
-- FROM vaccine_catalog
-- WHERE active = true
-- ORDER BY name;
