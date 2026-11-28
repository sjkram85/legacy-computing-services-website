/**
 * Legacy Control Center API — Cloudflare Worker + D1
 * Serves public intake endpoints (Legacy Computing Services & Legacy Bowling Academy)
 * and authenticated, role-scoped Control Center endpoints.
 */

const ALLOWED_ORIGINS = new Set([
  'https://legacycomputingservices.com',
  'https://www.legacycomputingservices.com',
  'https://legacybowlingacademy.com',
  'https://www.legacybowlingacademy.com',
  'https://sjkram85.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
]);

const TABLES = {
  Tickets: {
    table: 'tickets',
    orderBy: 'created DESC, id DESC',
    columns: ['id', 'created', 'updated', 'customer', 'issue', 'status', 'priority', 'assignedTo', 'openedOn', 'dueOn', 'notes', 'intakeSent']
  },
  Customers: {
    table: 'customers',
    orderBy: 'name COLLATE NOCASE ASC, created DESC',
    columns: ['id', 'created', 'updated', 'name', 'email', 'phone', 'company', 'town', 'notes']
  },
  Inquiries: {
    table: 'inquiries',
    orderBy: 'received DESC, id DESC',
    columns: ['id', 'received', 'name', 'email', 'phone', 'service', 'budget', 'details', 'status', 'source', 'notes']
  },
  Quotes: {
    table: 'quotes',
    orderBy: 'created DESC, id DESC',
    columns: ['id', 'number', 'created', 'updated', 'customer', 'status', 'issuedOn', 'validUntil', 'tax', 'notes']
  },
  QuoteItems: {
    table: 'quote_items',
    orderBy: 'rowid ASC',
    columns: ['id', 'quoteId', 'quoteNumber', 'description', 'qty', 'unitPrice']
  },
  Invoices: {
    table: 'invoices',
    orderBy: 'created DESC, id DESC',
    columns: ['id', 'number', 'created', 'updated', 'customer', 'status', 'issuedOn', 'dueOn', 'quoteNumber', 'tax', 'notes', 'brand', 'paymentLink', 'sessionId', 'packageName']
  },
  InvoiceItems: {
    table: 'invoice_items',
    orderBy: 'rowid ASC',
    columns: ['id', 'invoiceId', 'invoiceNumber', 'description', 'qty', 'unitPrice']
  },
  Proposals: {
    table: 'proposals',
    orderBy: 'created DESC, id DESC',
    columns: ['id', 'prospectName', 'business', 'email', 'phone', 'title', 'status', 'created', 'sent', 'expires', 'total', 'docUrl', 'notes', 'sections', 'lineItems', 'customerId', 'jobId', 'attachments']
  },
  'Academy Students': {
    table: 'academy_students',
    orderBy: 'name COLLATE NOCASE ASC, created DESC',
    columns: ['id', 'created', 'updated', 'name', 'email', 'phone', 'ageGroup', 'guardian', 'program', 'coach', 'notes', 'status']
  },
  'Academy Requests': {
    table: 'academy_requests',
    orderBy: 'received DESC, id DESC',
    columns: ['id', 'received', 'form', 'name', 'email', 'phone', 'ageGroup', 'program', 'preferredTimes', 'goals', 'message', 'source', 'status', 'notes', 'sessionId']
  },
  'Academy Sessions': {
    table: 'academy_sessions',
    orderBy: 'date DESC, start DESC, created DESC',
    columns: ['id', 'created', 'updated', 'student', 'studentId', 'kind', 'status', 'date', 'start', 'end', 'coach', 'location', 'program', 'notes', 'requestId', 'invoiceId', 'calendarEventId']
  }
};

const COACH_SHEETS = new Set(['Academy Students', 'Academy Requests', 'Academy Sessions']);

const DOC_SPECS = {
  quote: {
    sheet: 'Quotes',
    itemSheet: 'QuoteItems',
    parentKey: 'quoteId',
    parentNumberKey: 'quoteNumber'
  },
  invoice: {
    sheet: 'Invoices',
    itemSheet: 'InvoiceItems',
    parentKey: 'invoiceId',
    parentNumberKey: 'invoiceNumber'
  }
};

const ACADEMY_LIMITS = {
  form: 40,
  name: 200,
  email: 200,
  phone: 80,
  ageGroup: 40,
  program: 200,
  preferredTimes: 500,
  goals: 2000,
  message: 5000,
  source: 200,
  website: 500,
  preferredCoach: 200
};

const INQUIRY_LIMITS = {
  name: 200,
  email: 200,
  phone: 80,
  service: 200,
  budget: 300,
  details: 5000,
  source: 200,
  website: 500
};

const SESSION_TTL_SECONDS = 43200; // 12 hours

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function clip(value, max) {
  const s = value == null ? '' : String(value).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeAgeGroup(value) {
  const s = clip(value, ACADEMY_LIMITS.ageGroup);
  const k = s.toLowerCase();
  if (k === 'youth') return 'Youth';
  if (k === 'adult') return 'Adult';
  if (k === 'senior') return 'Senior';
  return s;
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonResponse(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request)
    }
  });
}

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signSession(payload, secret) {
  const body = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  const [body, sigStr] = parts;
  if (!body || !sigStr) return null;
  try {
    const key = await hmacKey(secret);
    const sigBytes = fromBase64Url(sigStr);
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, textEncoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(textDecoder.decode(fromBase64Url(body)));
    if (!payload || typeof payload !== 'object' || !payload.email || !payload.exp) return null;
    if (Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function parsePublicPayload(request) {
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  const rawText = await request.text();
  if (!rawText) return {};

  if (contentType.includes('application/json') || rawText.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  const params = new URLSearchParams(rawText);
  const out = {};
  for (const [k, v] of params.entries()) {
    if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = v;
  }
  if (typeof out.payload === 'string' && out.payload.trim().startsWith('{')) {
    try {
      const inner = JSON.parse(out.payload);
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        return { ...inner, ...out, payload: undefined };
      }
    } catch {
      // Keep flat params
    }
  }
  return out;
}

function buildUpsertStatement(db, spec, record) {
  const cleanRecord = {};
  for (const col of spec.columns) {
    cleanRecord[col] = record[col] == null ? '' : String(record[col]);
  }
  if (!cleanRecord.id) {
    cleanRecord.id = crypto.randomUUID();
  }
  const placeholders = spec.columns.map(() => '?').join(', ');
  const updates = spec.columns
    .filter((col) => col !== 'id')
    .map((col) => `${col} = excluded.${col}`)
    .join(', ');
  const sql = `INSERT INTO ${spec.table} (${spec.columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`;
  const values = spec.columns.map((col) => cleanRecord[col]);
  return {
    stmt: db.prepare(sql).bind(...values),
    record: cleanRecord
  };
}

async function authenticateRequest(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const session = await verifySession(match[1].trim(), env.SESSION_SECRET);
  if (!session) return null;

  const user = await env.DB.prepare(
    'SELECT email, role, display_name, active FROM users WHERE lower(email) = ?'
  ).bind(String(session.email).toLowerCase()).first();

  if (!user || Number(user.active) !== 1) return null;
  return {
    email: user.email,
    role: user.role,
    name: user.display_name || session.name || user.email,
    picture: session.picture || ''
  };
}

async function handleHealth(request, env) {
  const row = await env.DB.prepare('SELECT 1 AS ok').first();
  return jsonResponse(request, {
    ok: Boolean(row && row.ok === 1),
    service: 'legacy-control-center-api',
    db: 'ok'
  });
}

async function handlePublicAcademy(request, env) {
  const data = await parsePublicPayload(request);
  if (clip(data.website, ACADEMY_LIMITS.website)) {
    return jsonResponse(request, { ok: true, ignored: true });
  }

  const form = clip(data.form, ACADEMY_LIMITS.form).toLowerCase();
  if (form !== 'booking' && form !== 'inquiry') {
    return jsonResponse(request, { ok: false, error: 'form must be booking or inquiry.' }, 400);
  }

  const name = clip(data.name, ACADEMY_LIMITS.name);
  const email = clip(data.email, ACADEMY_LIMITS.email);
  if (!name || !email) {
    return jsonResponse(request, { ok: false, error: 'Name and email are required.' }, 400);
  }
  if (!email.includes('@')) {
    return jsonResponse(request, { ok: false, error: 'Email is not valid.' }, 400);
  }

  const preferredCoach = clip(data.preferredCoach, ACADEMY_LIMITS.preferredCoach);
  const record = {
    id: crypto.randomUUID(),
    received: new Date().toISOString(),
    form,
    name,
    email,
    phone: clip(data.phone, ACADEMY_LIMITS.phone),
    ageGroup: normalizeAgeGroup(data.ageGroup),
    program: clip(data.program, ACADEMY_LIMITS.program),
    preferredTimes: clip(data.preferredTimes, ACADEMY_LIMITS.preferredTimes),
    goals: clip(data.goals, ACADEMY_LIMITS.goals),
    message: clip(data.message, ACADEMY_LIMITS.message),
    source: clip(data.source, ACADEMY_LIMITS.source) || 'legacy-bowling-academy',
    status: 'New',
    notes: preferredCoach ? `Requested coach: ${preferredCoach}` : '',
    sessionId: ''
  };

  const { stmt } = buildUpsertStatement(env.DB, TABLES['Academy Requests'], record);
  await stmt.run();

  return jsonResponse(request, { ok: true, id: record.id });
}

async function handlePublicInquiry(request, env) {
  const data = await parsePublicPayload(request);
  if (clip(data.website, INQUIRY_LIMITS.website)) {
    return jsonResponse(request, { ok: true, ignored: true });
  }

  const name = clip(data.name, INQUIRY_LIMITS.name);
  const email = clip(data.email, INQUIRY_LIMITS.email);
  const details = clip(data.details, INQUIRY_LIMITS.details);
  if (!name || !email || !details) {
    return jsonResponse(request, { ok: false, error: 'Name, email, and details are required.' }, 400);
  }
  if (!email.includes('@')) {
    return jsonResponse(request, { ok: false, error: 'Email is not valid.' }, 400);
  }

  const record = {
    id: crypto.randomUUID(),
    received: new Date().toISOString(),
    name,
    email,
    phone: clip(data.phone, INQUIRY_LIMITS.phone),
    service: clip(data.service, INQUIRY_LIMITS.service),
    budget: clip(data.budget, INQUIRY_LIMITS.budget),
    details,
    status: 'New',
    source: clip(data.source, INQUIRY_LIMITS.source) || 'Website form',
    notes: ''
  };

  const { stmt } = buildUpsertStatement(env.DB, TABLES.Inquiries, record);
  await stmt.run();

  return jsonResponse(request, { ok: true, id: record.id });
}

async function handleGoogleAuth(request, env) {
  if (!env.SESSION_SECRET) {
    return jsonResponse(request, { ok: false, error: 'Server session secret is not configured.' }, 500);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { ok: false, error: 'Invalid request body.' }, 400);
  }

  const accessToken = clip(body && body.accessToken, 4096);
  if (!accessToken) {
    return jsonResponse(request, { ok: false, error: 'Missing Google access token.' }, 400);
  }

  const [infoRes, userRes] = await Promise.all([
    fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`),
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  ]);

  if (!infoRes.ok || !userRes.ok) {
    return jsonResponse(request, { ok: false, error: 'Could not verify Google token.' }, 401);
  }

  const [tokenInfo, profile] = await Promise.all([infoRes.json(), userRes.json()]);
  const expectedClient = clip(env.GOOGLE_CLIENT_ID, 256);
  if (expectedClient && tokenInfo.aud !== expectedClient && tokenInfo.azp !== expectedClient) {
    return jsonResponse(request, { ok: false, error: 'Google token was issued for a different client.' }, 403);
  }

  const email = clip(profile && profile.email, 256).toLowerCase();
  const verified = profile && (profile.email_verified === true || profile.verified_email === true);
  if (!email || !verified) {
    return jsonResponse(request, { ok: false, error: 'Verified Google email is required.' }, 403);
  }

  let user = await env.DB.prepare(
    'SELECT email, role, display_name, active FROM users WHERE lower(email) = ?'
  ).bind(email).first();

  const allowedDomain = clip(env.ALLOWED_DOMAIN, 128).toLowerCase().replace(/^@/, '');
  const hd = clip(profile && profile.hd, 128).toLowerCase();

  if (!user) {
    if (allowedDomain && hd === allowedDomain) {
      const displayName = clip(profile && profile.name, 200) || email;
      await env.DB.prepare(
        'INSERT INTO users (email, role, display_name, active, created_at) VALUES (?, ?, ?, 1, ?)'
      ).bind(email, 'admin', displayName, new Date().toISOString()).run();
      user = { email, role: 'admin', display_name: displayName, active: 1 };
    } else {
      return jsonResponse(request, {
        ok: false,
        error: `${email} is not authorized for the Legacy portal. Ask an admin to add your account.`
      }, 403);
    }
  } else if (Number(user.active) !== 1) {
    return jsonResponse(request, { ok: false, error: 'This portal account is deactivated.' }, 403);
  }

  const sessionPayload = {
    email: user.email,
    role: user.role,
    name: user.display_name || clip(profile && profile.name, 200) || user.email,
    picture: clip(profile && profile.picture, 500),
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  };
  const sessionToken = await signSession(sessionPayload, env.SESSION_SECRET);

  return jsonResponse(request, {
    ok: true,
    sessionToken,
    expiresIn: SESSION_TTL_SECONDS,
    user: {
      email: sessionPayload.email,
      name: sessionPayload.name,
      picture: sessionPayload.picture,
      role: sessionPayload.role
    }
  });
}

async function handlePortalData(request, env, user) {
  const entries = Object.entries(TABLES);
  const data = {};
  const queries = [];
  const queryKeys = [];

  for (const [sheetTitle, spec] of entries) {
    if (user.role === 'coach' && !COACH_SHEETS.has(sheetTitle)) {
      data[sheetTitle] = [];
      continue;
    }
    queryKeys.push(sheetTitle);
    queries.push(env.DB.prepare(`SELECT ${spec.columns.join(', ')} FROM ${spec.table} ORDER BY ${spec.orderBy}`));
  }

  const results = queries.length ? await env.DB.batch(queries) : [];
  for (let i = 0; i < queryKeys.length; i++) {
    data[queryKeys[i]] = (results[i] && results[i].results) || [];
  }

  return jsonResponse(request, { ok: true, role: user.role, data });
}

async function handleUpsertRecord(request, env, user, sheetTitle) {
  const spec = TABLES[sheetTitle];
  if (!spec) {
    return jsonResponse(request, { ok: false, error: `Unknown table: ${sheetTitle}` }, 404);
  }
  if (user.role === 'coach' && !COACH_SHEETS.has(sheetTitle)) {
    return jsonResponse(request, { ok: false, error: 'Coaches can only edit Academy records.' }, 403);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const incoming = body && typeof body.record === 'object' && body.record ? body.record : body;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return jsonResponse(request, { ok: false, error: 'Missing record object.' }, 400);
  }

  const { stmt, record } = buildUpsertStatement(env.DB, spec, incoming);
  await stmt.run();
  return jsonResponse(request, { ok: true, record });
}

async function handleUpsertDocument(request, env, user, kind) {
  if (user.role !== 'admin') {
    return jsonResponse(request, { ok: false, error: 'Only admins can update quotes or invoices.' }, 403);
  }
  const docSpec = DOC_SPECS[kind];
  if (!docSpec) {
    return jsonResponse(request, { ok: false, error: `Unknown document kind: ${kind}` }, 404);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const headerIn = body && body.header;
  const linesIn = Array.isArray(body && body.lines) ? body.lines : [];
  if (!headerIn || typeof headerIn !== 'object') {
    return jsonResponse(request, { ok: false, error: 'Missing document header.' }, 400);
  }

  const parentSpec = TABLES[docSpec.sheet];
  const itemSpec = TABLES[docSpec.itemSheet];
  const builtHeader = buildUpsertStatement(env.DB, parentSpec, headerIn);
  const header = builtHeader.record;

  const statements = [
    builtHeader.stmt,
    env.DB.prepare(`DELETE FROM ${itemSpec.table} WHERE ${docSpec.parentKey} = ?`).bind(header.id)
  ];

  const savedLines = [];
  for (const rawLine of linesIn) {
    if (!rawLine || typeof rawLine !== 'object') continue;
    const lineObj = {
      ...rawLine,
      id: rawLine.id ? String(rawLine.id) : crypto.randomUUID(),
      [docSpec.parentKey]: header.id,
      [docSpec.parentNumberKey]: header.number || ''
    };
    const builtLine = buildUpsertStatement(env.DB, itemSpec, lineObj);
    statements.push(builtLine.stmt);
    savedLines.push(builtLine.record);
  }

  await env.DB.batch(statements);
  return jsonResponse(request, { ok: true, header, lines: savedLines });
}

async function handleUsers(request, env, user) {
  if (user.role !== 'admin') {
    return jsonResponse(request, { ok: false, error: 'Admin access required.' }, 403);
  }

  if (request.method === 'GET') {
    const res = await env.DB.prepare(
      'SELECT email, role, display_name, active, created_at FROM users ORDER BY role ASC, email ASC'
    ).all();
    return jsonResponse(request, { ok: true, users: res.results || [] });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, { ok: false, error: 'Invalid JSON body.' }, 400);
  }

  const email = clip(body && body.email, 256).toLowerCase();
  const role = body && body.role === 'coach' ? 'coach' : 'admin';
  const displayName = clip(body && body.display_name, 200);
  const active = body && body.active === false ? 0 : 1;
  if (!email || !email.includes('@')) {
    return jsonResponse(request, { ok: false, error: 'Valid email is required.' }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO users (email, role, display_name, active, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET role = excluded.role, display_name = excluded.display_name, active = excluded.active`
  ).bind(email, role, displayName, active, new Date().toISOString()).run();

  return jsonResponse(request, { ok: true, user: { email, role, display_name: displayName, active } });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (request.method === 'GET' && (path === '/' || path === '/api/health')) {
        return await handleHealth(request, env);
      }
      if (request.method === 'POST' && path === '/api/public/academy') {
        return await handlePublicAcademy(request, env);
      }
      if (request.method === 'POST' && path === '/api/public/inquiry') {
        return await handlePublicInquiry(request, env);
      }
      if (request.method === 'POST' && path === '/api/portal/auth/google') {
        return await handleGoogleAuth(request, env);
      }

      if (path.startsWith('/api/portal/')) {
        const user = await authenticateRequest(request, env);
        if (!user) {
          return jsonResponse(request, { ok: false, error: 'Sign in required.' }, 401);
        }

        if (request.method === 'GET' && path === '/api/portal/me') {
          return jsonResponse(request, { ok: true, user });
        }
        if (request.method === 'GET' && path === '/api/portal/data') {
          return await handlePortalData(request, env, user);
        }
        if (request.method === 'PUT' && path.startsWith('/api/portal/records/')) {
          const sheetTitle = decodeURIComponent(path.slice('/api/portal/records/'.length));
          return await handleUpsertRecord(request, env, user, sheetTitle);
        }
        if (request.method === 'PUT' && path.startsWith('/api/portal/documents/')) {
          const kind = decodeURIComponent(path.slice('/api/portal/documents/'.length));
          return await handleUpsertDocument(request, env, user, kind);
        }
        if ((request.method === 'GET' || request.method === 'PUT') && path === '/api/portal/users') {
          return await handleUsers(request, env, user);
        }
      }

      return jsonResponse(request, { ok: false, error: 'Not found.' }, 404);
    } catch (err) {
      console.error(JSON.stringify({
        level: 'error',
        method: request.method,
        path,
        message: err && err.message ? err.message : String(err)
      }));
      return jsonResponse(request, { ok: false, error: 'Internal server error.' }, 500);
    }
  }
};
