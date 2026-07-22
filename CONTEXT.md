# Lara Kaplan Nursing — Domain Glossary

## Invoice payment terms

- **Invoice Total** — the invoice's grand total (`grand_total_cents`). Always shown, regardless of payment status. Previously mislabeled "Total Due" even when the invoice was already paid.
- **Total Paid** — shown only when `invoice.status === 'paid'`. Equal to Invoice Total (derived — no partial payments concept exists; see below). Displayed with the `paid_at` date.
- **Total Due** — the outstanding balance. Equal to Invoice Total while unpaid; becomes R 0.00 once `status === 'paid'`.
- **Paid** (invoice status) — all-or-nothing. There is no partial-payment state or `amount_paid_cents` column. If partial payments become a real need, that's a new column + status value, not a derived display, and would need its own migration.
