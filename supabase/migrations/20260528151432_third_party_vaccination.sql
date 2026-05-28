ALTER TABLE vaccination_records
  ADD COLUMN administered_by_third_party BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN third_party_notes           TEXT;
