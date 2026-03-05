// Central source of truth for practice and banking details.
// Used in invoice PDF generation. Edit here to update all invoices.
// Banking details intentionally not in env vars — this file is the config.

export const PRACTICE = {
  name: 'Lara Kaplan, Reg Nurse & Midwife',
  number: '0648949',
  address: '96 William Road Norwood',
  phone: '082 412 9135',
  email: 'sisterlarak@outlook.com',
} as const

export const BANKING = {
  accountName: 'Lara Kaplan Nursing',
  bank: 'FNB',
  accountNumber: '62744358369',
  branchCode: '250655',
} as const
