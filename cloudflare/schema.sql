-- Legacy Control Center — Cloudflare D1 Schema
-- Replaces Google Sheets tabs in portal/logic.js 1-for-1 and adds role-based access for future coaches.

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'coach')),
  display_name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  created TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL DEFAULT '',
  customer TEXT NOT NULL DEFAULT '',
  issue TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Open',
  priority TEXT NOT NULL DEFAULT 'Normal',
  assignedTo TEXT NOT NULL DEFAULT '',
  openedOn TEXT NOT NULL DEFAULT '',
  dueOn TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  intakeSent TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  created TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  town TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  received TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'New',
  source TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL DEFAULT '',
  customer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Draft',
  issuedOn TEXT NOT NULL DEFAULT '',
  validUntil TEXT NOT NULL DEFAULT '',
  tax TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  quoteId TEXT NOT NULL,
  quoteNumber TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  qty TEXT NOT NULL DEFAULT '',
  unitPrice TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL DEFAULT '',
  customer TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Draft',
  issuedOn TEXT NOT NULL DEFAULT '',
  dueOn TEXT NOT NULL DEFAULT '',
  quoteNumber TEXT NOT NULL DEFAULT '',
  tax TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT 'Legacy Computing Services',
  paymentLink TEXT NOT NULL DEFAULT '',
  sessionId TEXT NOT NULL DEFAULT '',
  packageName TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  invoiceNumber TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  qty TEXT NOT NULL DEFAULT '',
  unitPrice TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  prospectName TEXT NOT NULL DEFAULT '',
  business TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Draft',
  created TEXT NOT NULL DEFAULT '',
  sent TEXT NOT NULL DEFAULT '',
  expires TEXT NOT NULL DEFAULT '',
  total TEXT NOT NULL DEFAULT '',
  docUrl TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sections TEXT NOT NULL DEFAULT '',
  lineItems TEXT NOT NULL DEFAULT '',
  customerId TEXT NOT NULL DEFAULT '',
  jobId TEXT NOT NULL DEFAULT '',
  attachments TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS academy_students (
  id TEXT PRIMARY KEY,
  created TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  ageGroup TEXT NOT NULL DEFAULT '',
  guardian TEXT NOT NULL DEFAULT '',
  program TEXT NOT NULL DEFAULT '',
  coach TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS academy_requests (
  id TEXT PRIMARY KEY,
  received TEXT NOT NULL DEFAULT '',
  form TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  ageGroup TEXT NOT NULL DEFAULT '',
  program TEXT NOT NULL DEFAULT '',
  preferredTimes TEXT NOT NULL DEFAULT '',
  goals TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'legacy-bowling-academy',
  status TEXT NOT NULL DEFAULT 'New',
  notes TEXT NOT NULL DEFAULT '',
  sessionId TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS academy_sessions (
  id TEXT PRIMARY KEY,
  created TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL DEFAULT '',
  student TEXT NOT NULL DEFAULT '',
  studentId TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'Private lesson',
  status TEXT NOT NULL DEFAULT 'Requested',
  date TEXT NOT NULL DEFAULT '',
  start TEXT NOT NULL DEFAULT '',
  end TEXT NOT NULL DEFAULT '',
  coach TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT 'Forest Hill Lanes',
  program TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  requestId TEXT NOT NULL DEFAULT '',
  invoiceId TEXT NOT NULL DEFAULT '',
  calendarEventId TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quoteId ON quote_items(quoteId);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoiceId ON invoice_items(invoiceId);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_academy_requests_status ON academy_requests(status);
CREATE INDEX IF NOT EXISTS idx_academy_sessions_date ON academy_sessions(date);

INSERT OR IGNORE INTO users (email, role, display_name, active, created_at)
VALUES ('scott@legacycomputingservices.com', 'admin', 'Scott J. Kramer', 1, datetime('now'));
