-- Normalizes procedure_codes.category to the two canonical values the invoice
-- Services dropdown filters on ('consultation' / 'immunisation'). Existing rows
-- had drifted (e.g. "Consultation", "clinic consultation", "vaccine") because
-- the admin form used a free-text input, silently hiding those codes from
-- invoice creation.
update procedure_codes
set category = 'consultation'
where lower(trim(category)) in ('consultation', 'clinic consultation', 'consult add on');

update procedure_codes
set category = 'immunisation'
where lower(trim(category)) in ('immunisation', 'vaccine');
