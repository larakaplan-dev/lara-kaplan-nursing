-- Add paid_at column to invoices, maintained automatically by trigger.
-- Set when status changes to 'paid'; cleared when status reverts.

ALTER TABLE invoices
  ADD COLUMN paid_at timestamptz;

CREATE OR REPLACE FUNCTION invoices_set_paid_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    NEW.paid_at := now();
  ELSIF NEW.status <> 'paid' AND OLD.status = 'paid' THEN
    NEW.paid_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_paid_at
  BEFORE UPDATE OF status ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_set_paid_at();
