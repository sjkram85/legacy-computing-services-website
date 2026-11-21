/* Pure helpers for the employee portal. No network and no secrets.
   Used by portal/portal.js and by the public contact form. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LCSPortal = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var SHEETS = [
    {
      title: 'Tickets',
      columns: [
        ['id', 'ID'],
        ['created', 'Created'],
        ['updated', 'Updated'],
        ['customer', 'Customer'],
        ['issue', 'Issue'],
        ['status', 'Status'],
        ['priority', 'Priority'],
        ['assignedTo', 'Assigned to'],
        ['openedOn', 'Opened'],
        ['dueOn', 'Due'],
        ['notes', 'Notes'],
        ['intakeSent', 'Intake Sent']
      ]
    },
    {
      title: 'Customers',
      columns: [
        ['id', 'ID'],
        ['created', 'Created'],
        ['updated', 'Updated'],
        ['name', 'Name'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['company', 'Company'],
        ['town', 'Town'],
        ['notes', 'Notes']
      ]
    },
    {
      title: 'Inquiries',
      columns: [
        ['id', 'ID'],
        ['received', 'Received'],
        ['name', 'Name'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['service', 'Service'],
        ['budget', 'Budget'],
        ['details', 'Details'],
        ['status', 'Status'],
        ['source', 'Source'],
        ['notes', 'Notes']
      ]
    },
    {
      title: 'Quotes',
      columns: [
        ['id', 'ID'],
        ['number', 'Number'],
        ['created', 'Created'],
        ['updated', 'Updated'],
        ['customer', 'Customer'],
        ['status', 'Status'],
        ['issuedOn', 'Issued'],
        ['validUntil', 'Valid until'],
        ['tax', 'Tax'],
        ['notes', 'Notes']
      ]
    },
    {
      title: 'QuoteItems',
      columns: [
        ['id', 'ID'],
        ['quoteId', 'Quote ID'],
        ['quoteNumber', 'Quote number'],
        ['description', 'Description'],
        ['qty', 'Qty'],
        ['unitPrice', 'Unit price']
      ]
    },
    {
      title: 'Invoices',
      columns: [
        ['id', 'ID'],
        ['number', 'Number'],
        ['created', 'Created'],
        ['updated', 'Updated'],
        ['customer', 'Customer'],
        ['status', 'Status'],
        ['issuedOn', 'Issued'],
        ['dueOn', 'Due'],
        ['quoteNumber', 'Quote number'],
        ['tax', 'Tax'],
        ['notes', 'Notes'],
        ['brand', 'Business'],
        ['paymentLink', 'Payment link'],
        ['sessionId', 'Session ID'],
        ['packageName', 'Package']
      ]
    },
    {
      title: 'InvoiceItems',
      columns: [
        ['id', 'ID'],
        ['invoiceId', 'Invoice ID'],
        ['invoiceNumber', 'Invoice number'],
        ['description', 'Description'],
        ['qty', 'Qty'],
        ['unitPrice', 'Unit price']
      ]
    },
    {
      title: 'Proposals',
      columns: [
        ['id', 'ID'],
        ['prospectName', 'Prospect name'],
        ['business', 'Business'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['title', 'Title'],
        ['status', 'Status'],
        ['created', 'Created'],
        ['sent', 'Sent'],
        ['expires', 'Expires'],
        ['total', 'Total'],
        ['docUrl', 'Doc URL'],
        ['notes', 'Notes'],
        ['sections', 'Sections'],
        ['lineItems', 'Line items'],
        ['customerId', 'Customer ID'],
        ['jobId', 'Job ID'],
        ['attachments', 'Attachments']
      ]
    },
    {
      title: 'Academy Students',
      columns: [
        ['id', 'ID'],
        ['created', 'Created'],
        ['updated', 'Updated'],
        ['name', 'Name'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['ageGroup', 'Age group'],
        ['guardian', 'Parent/guardian'],
        ['program', 'Program'],
        ['coach', 'Coach'],
        ['notes', 'Notes'],
        ['status', 'Status']
      ]
    },
    {
      title: 'Academy Requests',
      columns: [
        ['id', 'ID'],
        ['received', 'Received'],
        ['form', 'Form'],
        ['name', 'Name'],
        ['email', 'Email'],
        ['phone', 'Phone'],
        ['ageGroup', 'Age group'],
        ['program', 'Program'],
        ['preferredTimes', 'Preferred times'],
        ['goals', 'Goals'],
        ['message', 'Message'],
        ['source', 'Source'],
        ['status', 'Status'],
        ['notes', 'Notes'],
        ['sessionId', 'Session ID']
      ]
    },
    {
      title: 'Academy Sessions',
      columns: [
        ['id', 'ID'],
        ['created', 'Created'],
        ['updated', 'Updated'],
        ['student', 'Student'],
        ['studentId', 'Student ID'],
        ['kind', 'Type'],
        ['status', 'Status'],
        ['date', 'Date'],
        ['start', 'Start'],
        ['end', 'End'],
        ['coach', 'Coach'],
        ['location', 'Location'],
        ['program', 'Program'],
        ['notes', 'Notes'],
        ['requestId', 'Request ID'],
        ['invoiceId', 'Invoice ID'],
        ['calendarEventId', 'Calendar event ID']
      ]
    }
  ];

  var CHOICES = {
    ticketStatus: ['Open', 'In progress', 'Waiting on customer', 'Done'],
    priority: ['Low', 'Normal', 'High', 'Urgent'],
    inquiryStatus: ['New', 'Reviewed', 'Replied', 'Closed'],
    quoteStatus: ['Draft', 'Sent', 'Accepted', 'Declined'],
    proposalStatus: ['Draft', 'Sent', 'Accepted', 'Declined'],
    invoiceStatus: ['Draft', 'Sent', 'Paid', 'Void'],
    ageGroup: ['Youth', 'Adult', 'Senior'],
    studentStatus: ['Active', 'Inactive', 'Waitlist'],
    requestStatus: ['New', 'Reviewed', 'Scheduled', 'Closed'],
    requestForm: ['booking', 'inquiry'],
    sessionKind: ['Private lesson', 'Group clinic', 'Camp', 'Youth program'],
    sessionStatus: ['Requested', 'Confirmed', 'Completed', 'Cancelled'],
    invoiceBrand: ['Legacy Computing Services', 'Legacy Bowling Academy']
  };

  /* Blank Business on an existing invoice stays Legacy Computing Services.
     Academy invoices store the short id and the print view expands the DBA line.
     The $60 figure is a public reference on the academy site. It is never a price. */
  var ACADEMY = {
    location: 'Forest Hill Lanes',
    source: 'legacy-bowling-academy',
    brandId: 'Legacy Bowling Academy',
    legalName: 'Legacy Bowling Academy, a DBA of Legacy Computing Services, LLC',
    payee: 'Make payments to Legacy Computing Services, LLC',
    referenceNote: 'The academy site lists $60 per 60-minute private session as a reference only. Type the price you are charging. Leave the price blank and the total stays incomplete.'
  };

  var INVOICE_BRANDS = {
    lcs: {
      id: 'Legacy Computing Services',
      title: 'Legacy Computing Services LLC',
      lines: ['Bel Air, Maryland', 'scott@legacycomputingservices.com'],
      academy: false
    },
    academy: {
      id: 'Legacy Bowling Academy',
      title: 'Legacy Bowling Academy, a DBA of Legacy Computing Services, LLC',
      lines: ['Forest Hill Lanes, Maryland', 'Make payments to Legacy Computing Services, LLC', 'scott@legacycomputingservices.com'],
      academy: true
    }
  };

  var ACADEMY_PAYLOAD_KEYS = [
    'form', 'name', 'email', 'phone', 'ageGroup', 'program',
    'preferredTimes', 'goals', 'message', 'source', 'website'
  ];

  var PROPOSAL_BRAND = {
    company: 'Legacy Computing Services LLC',
    tagline: "Protecting what matters. Building what's next.",
    contact: 'Bel Air, MD | scott@legacycomputingservices.com | legacycomputingservices.com',
    logoUrl: 'https://legacycomputingservices.com/assets/legacy-computing-shield.png',
    navy: { red: 11 / 255, green: 19 / 255, blue: 30 / 255 },
    cyan: { red: 24 / 255, green: 162 / 255, blue: 214 / 255 },
    slate: { red: 71 / 255, green: 85 / 255, blue: 105 / 255 },
    white: { red: 1, green: 1, blue: 1 },
    tint: { red: 231 / 255, green: 246 / 255, blue: 252 / 255 }
  };

  var PROPOSAL_HEADINGS = {
    'Prepared for': 1,
    OVERVIEW: 1,
    'SCOPE & DELIVERABLES': 1,
    TIMELINE: 1,
    QUOTE: 1,
    TERMS: 1,
    ACCEPTANCE: 1
  };

  var DOC_SPEC = {
    quote: {
      kind: 'quote',
      sheet: 'Quotes',
      items: 'QuoteItems',
      parentKey: 'quoteId',
      parentNumberKey: 'quoteNumber',
      title: 'Quote',
      prefix: 'Q',
      statuses: CHOICES.quoteStatus,
      dates: [
        ['issuedOn', 'Issued'],
        ['validUntil', 'Valid until']
      ]
    },
    invoice: {
      kind: 'invoice',
      sheet: 'Invoices',
      items: 'InvoiceItems',
      parentKey: 'invoiceId',
      parentNumberKey: 'invoiceNumber',
      title: 'Invoice',
      prefix: 'INV',
      statuses: CHOICES.invoiceStatus,
      dates: [
        ['issuedOn', 'Issued'],
        ['dueOn', 'Due']
      ],
      extra: [['quoteNumber', 'Quote number', 'Optional']]
    }
  };

  function columnsOf(title) {
    var spec = sheetByTitle(title);
    return spec ? spec.columns.map(function (pair) {
      return { key: pair[0], header: pair[1] };
    }) : [];
  }

  function sheetByTitle(title) {
    for (var i = 0; i < SHEETS.length; i++) {
      if (SHEETS[i].title === title) return SHEETS[i];
    }
    return null;
  }

  function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function isPlaceholder(value) {
    var v = clean(value);
    if (!v) return true;
    return /YOUR_|PASTE_|REPLACE_|changeme/i.test(v);
  }

  function clientConfigured(config) {
    var id = clean(config && config.clientId);
    if (isPlaceholder(id)) return false;
    return /\.apps\.googleusercontent\.com$/i.test(id) && id.indexOf(' ') === -1;
  }

  function allowedDomain(config) {
    return clean(config && config.allowedDomain).toLowerCase().replace(/^@/, '');
  }

  function domainAllowed(profile, domain) {
    if (!profile || typeof profile !== 'object') return false;
    if (profile.email_verified === false || profile.verified_email === false) return false;
    var expected = clean(domain).toLowerCase().replace(/^@/, '');
    var hd = clean(profile.hd).toLowerCase();
    return Boolean(expected) && hd === expected;
  }

  function googleId(value) {
    var v = clean(value);
    if (!v || isPlaceholder(v)) return '';
    var sheet = v.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
    if (sheet) return sheet[1];
    var folder = v.match(/\/folders\/([A-Za-z0-9_-]+)/);
    if (folder) return folder[1];
    var file = v.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (file) return file[1];
    if (/^[A-Za-z0-9_-]+$/.test(v)) return v;
    return '';
  }

  function inquiryEndpoint(config) {
    var url = clean(config && config.inquiriesWebhookUrl);
    if (!url || isPlaceholder(url)) return { url: '', problem: '' };
    if (/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
      return { url: url, problem: '' };
    }
    return {
      url: '',
      problem: 'The inquiry address in portal/config.js must be a Google Apps Script web app URL ending in /exec. The email form still works.'
    };
  }

  function parseNumber(value) {
    if (value == null) return null;
    var s = String(value).trim();
    if (!s) return null;
    var n = Number(s.replace(/[$,]/g, ''));
    if (!Number.isFinite(n)) return null;
    return n;
  }

  function formatUSD(amount) {
    var sign = amount < 0 ? '-' : '';
    var n = Math.abs(Math.round(Number(amount) * 100) / 100);
    var parts = n.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sign + '$' + parts[0] + '.' + parts[1];
  }

  function lineMath(qty, unitPrice) {
    var q = parseNumber(qty);
    var p = parseNumber(unitPrice);
    if (q == null || p == null) return { ok: false, amount: null };
    return { ok: true, amount: Math.round(q * p * 100) / 100 };
  }

  function documentTotals(lines, tax) {
    var subtotal = 0;
    var missing = 0;
    var priced = 0;
    (lines || []).forEach(function (line) {
      var math = lineMath(line.qty, line.unitPrice);
      if (!math.ok) missing += 1;
      else {
        priced += 1;
        subtotal += math.amount;
      }
    });
    subtotal = Math.round(subtotal * 100) / 100;
    var taxAmount = parseNumber(tax);
    var empty = !lines || lines.length === 0;
    var complete = !empty && missing === 0;
    var total = null;
    if (complete) {
      total = taxAmount == null ? subtotal : Math.round((subtotal + taxAmount) * 100) / 100;
    }
    return {
      subtotal: subtotal,
      missing: missing,
      priced: priced,
      taxAmount: taxAmount,
      total: total,
      complete: complete,
      empty: empty
    };
  }

  function rowsFromValues(values, columns) {
    var headerRow = [];
    var missingHeaders = columns.map(function (col) { return col.header; });
    if (!values || !values.length) {
      return { rows: [], missingHeaders: missingHeaders, headerRow: headerRow };
    }
    headerRow = values[0].map(function (cell) {
      return String(cell == null ? '' : cell).trim();
    });
    var index = {};
    headerRow.forEach(function (name, i) {
      if (name && index[name.toLowerCase()] == null) index[name.toLowerCase()] = i;
    });
    missingHeaders = columns.filter(function (col) {
      return index[col.header.toLowerCase()] == null;
    }).map(function (col) { return col.header; });
    var rows = [];
    for (var r = 1; r < values.length; r++) {
      var raw = values[r] || [];
      var blank = raw.every(function (cell) {
        return String(cell == null ? '' : cell).trim() === '';
      });
      if (blank) continue;
      var record = { _row: r + 1 };
      record._cells = raw.map(function (cell) {
        return cell == null ? '' : String(cell);
      });
      columns.forEach(function (col) {
        var at = index[col.header.toLowerCase()];
        record[col.key] = at == null || raw[at] == null ? '' : String(raw[at]);
      });
      rows.push(record);
    }
    return { rows: rows, missingHeaders: missingHeaders, headerRow: headerRow };
  }

  function recordToCells(record, headerRow, columns) {
    var raw = record && record._cells;
    return headerRow.map(function (header, i) {
      var name = String(header == null ? '' : header).trim();
      var match = null;
      if (name) {
        for (var c = 0; c < columns.length; c++) {
          if (columns[c].header.toLowerCase() === name.toLowerCase()) {
            match = columns[c];
            break;
          }
        }
      }
      if (!match) {
        if (raw && i < raw.length && raw[i] != null) return String(raw[i]);
        return '';
      }
      var value = record[match.key];
      return value == null ? '' : String(value);
    });
  }

  function headersToAppend(headerRow, columns) {
    var headers = (headerRow || []).map(function (cell) {
      return String(cell == null ? '' : cell).trim();
    });
    var have = {};
    headers.forEach(function (name) {
      if (name) have[name.toLowerCase()] = true;
    });
    var missing = (columns || []).filter(function (col) {
      return col && col.header && !have[String(col.header).toLowerCase()];
    }).map(function (col) { return col.header; });
    var last = 0;
    headers.forEach(function (name, i) {
      if (name) last = i + 1;
    });
    return { startColumn: last + 1, headers: missing };
  }

  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));
  }

  function intakeFormUrl(config) {
    var url = clean(config && config.intakeFormUrl);
    if (!url || isPlaceholder(url)) return '';
    var match = url.match(/^(https:\/\/docs\.google\.com\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform)\/?(?:\?[^#]*)?(?:#.*)?$/i);
    if (!match) return '';
    return match[1];
  }

  function customerEmail(customers, customerName) {
    var name = clean(customerName).toLowerCase();
    if (!name) return '';
    var found = '';
    (customers || []).forEach(function (row) {
      if (found || !row) return;
      if (clean(row.name).toLowerCase() !== name) return;
      var email = clean(row.email);
      if (looksLikeEmail(email)) found = email;
    });
    return found;
  }

  function intakeMessage(formUrl) {
    return [
      'Hello,',
      '',
      'Before we begin work, please complete the client intake and service agreement. It takes a few minutes, and it lets us start with the right details:',
      '',
      formUrl,
      '',
      'Thank you,',
      'Legacy Computing Services',
      'scott@legacycomputingservices.com'
    ].join('\n');
  }

  function intakeComposeUrl(config, to) {
    var formUrl = intakeFormUrl(config);
    var email = clean(to);
    if (!formUrl || !looksLikeEmail(email)) return '';
    var subject = 'Legacy Computing Services \u2013 Client Intake & Service Agreement';
    return 'https://mail.google.com/mail/?view=cm&fs=1'
      + '&to=' + encodeURIComponent(email)
      + '&su=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(intakeMessage(formUrl));
  }

  function nextDocumentNumber(numbers, prefix) {
    var max = 0;
    var found = false;
    var pattern = new RegExp('^' + prefix + '-(\\d+)$', 'i');
    (numbers || []).forEach(function (value) {
      var match = String(value || '').trim().match(pattern);
      if (!match) return;
      found = true;
      var n = parseInt(match[1], 10);
      if (n > max) max = n;
    });
    if (!found) return '';
    return prefix + '-' + String(max + 1);
  }

  function colLetter(n) {
    var s = '';
    var x = n;
    while (x > 0) {
      var m = (x - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  }

  function isoDate(offsetDays, from) {
    var d = from ? new Date(from.getTime()) : new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    var month = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return d.getFullYear() + '-' + month + '-' + day;
  }

  function formatDay(value) {
    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return value ? String(value).replace('T', ' ').slice(0, 16) : '';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[Number(match[2]) - 1] + ' ' + Number(match[3]) + ', ' + match[1];
  }

  function asText(value) {
    return value == null ? '' : String(value);
  }

  function parseJsonValue(raw) {
    var text = asText(raw).trim();
    if (!text) return { ok: true, value: null };
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (err) {
      return { ok: false, value: null, raw: asText(raw) };
    }
  }

  function driveFileId(value) {
    var v = clean(value);
    if (!v || isPlaceholder(v)) return '';
    var patterns = [
      /\/file\/d\/([A-Za-z0-9_-]{8,})/i,
      /\/document\/d\/([A-Za-z0-9_-]{8,})/i,
      /\/spreadsheets\/d\/([A-Za-z0-9_-]{8,})/i,
      /\/presentation\/d\/([A-Za-z0-9_-]{8,})/i,
      /\/folders\/([A-Za-z0-9_-]{8,})/i,
      /[?&]id=([A-Za-z0-9_-]{8,})/i,
      /\/d\/([A-Za-z0-9_-]{8,})/i
    ];
    var i;
    for (i = 0; i < patterns.length; i++) {
      var match = v.match(patterns[i]);
      if (match) return match[1];
    }
    if (/^[A-Za-z0-9_-]{8,}$/.test(v)) return v;
    return '';
  }

  function mimeHintFromDriveUrl(value) {
    var v = clean(value).toLowerCase();
    if (v.indexOf('/document/') !== -1) return 'application/vnd.google-apps.document';
    if (v.indexOf('/spreadsheets/') !== -1) return 'application/vnd.google-apps.spreadsheet';
    if (v.indexOf('/presentation/') !== -1) return 'application/vnd.google-apps.presentation';
    if (v.indexOf('/folders/') !== -1) return 'application/vnd.google-apps.folder';
    return '';
  }

  function attachmentKind(mime) {
    if (mime === 'application/vnd.google-apps.folder') return 'Folder';
    if (mime === 'application/vnd.google-apps.document') return 'Google Doc';
    if (mime === 'application/vnd.google-apps.spreadsheet') return 'Google Sheet';
    if (mime === 'application/vnd.google-apps.presentation') return 'Slides';
    if (mime === 'application/pdf') return 'PDF';
    if (mime && String(mime).indexOf('image/') === 0) return 'Image';
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word';
    if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'Excel';
    return 'File';
  }

  function driveFileUrl(id, mimeType) {
    var fileId = driveFileId(id);
    if (!fileId) return '';
    var mime = clean(mimeType);
    if (mime === 'application/vnd.google-apps.document') return 'https://docs.google.com/document/d/' + fileId + '/edit';
    if (mime === 'application/vnd.google-apps.spreadsheet') return 'https://docs.google.com/spreadsheets/d/' + fileId + '/edit';
    if (mime === 'application/vnd.google-apps.presentation') return 'https://docs.google.com/presentation/d/' + fileId + '/edit';
    if (mime === 'application/vnd.google-apps.folder') return 'https://drive.google.com/drive/folders/' + fileId;
    return 'https://drive.google.com/file/d/' + fileId + '/view';
  }

  function normalizeAttachment(item) {
    if (!item || typeof item !== 'object') return null;
    var id = driveFileId(item.id || item.url || '');
    if (!id) return null;
    var mimeType = clean(item.mimeType) || mimeHintFromDriveUrl(item.url || '');
    var name = clean(item.name) || 'Drive file';
    var given = clean(item.url);
    var url = '';
    if (/^https:\/\/(drive|docs)\.google\.com\//i.test(given) && driveFileId(given) === id) url = given;
    if (!url) url = driveFileUrl(id, mimeType);
    return { id: id, name: name, mimeType: mimeType, url: url };
  }

  function readAttachments(raw) {
    if (Array.isArray(raw)) {
      var direct = [];
      var seenDirect = {};
      raw.forEach(function (item) {
        var next = normalizeAttachment(item);
        if (!next || seenDirect[next.id]) return;
        seenDirect[next.id] = true;
        direct.push(next);
      });
      return { ok: true, items: direct, raw: '' };
    }
    var parsed = parseJsonValue(raw);
    if (!parsed.ok) return { ok: false, items: [], raw: asText(raw) };
    if (parsed.value == null) return { ok: true, items: [], raw: '' };
    if (!Array.isArray(parsed.value)) return { ok: false, items: [], raw: asText(raw) };
    var items = [];
    var seen = {};
    parsed.value.forEach(function (item) {
      var next = normalizeAttachment(item);
      if (!next || seen[next.id]) return;
      seen[next.id] = true;
      items.push(next);
    });
    return { ok: true, items: items, raw: '' };
  }

  function mergeAttachments(current, incoming) {
    var items = [];
    var seen = {};
    function add(item) {
      var next = normalizeAttachment(item);
      if (!next || seen[next.id]) return;
      seen[next.id] = true;
      items.push(next);
    }
    (current || []).forEach(add);
    (incoming || []).forEach(add);
    return items;
  }

  function removeAttachment(current, id) {
    var wanted = driveFileId(id);
    if (!wanted) return mergeAttachments(current, []);
    return mergeAttachments(current, []).filter(function (item) {
      return item.id !== wanted;
    });
  }

  function pickerApiKey(config) {
    var key = clean(config && config.pickerApiKey);
    if (!key || isPlaceholder(key) || /\s/.test(key)) return '';
    return key;
  }

  function pickerAppId(clientId) {
    var id = clean(clientId);
    var match = id.match(/^(\d+)-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/i);
    return match ? match[1] : '';
  }

  function proposalSentDate(status, sent, today) {
    var date = clean(sent);
    if (clean(status) === 'Sent' && !date) return clean(today);
    return date;
  }

  function readProposal(row) {
    row = row || {};
    var sectionsParsed = parseJsonValue(row.sections);
    var sectionsOk = sectionsParsed.ok && (sectionsParsed.value == null || (typeof sectionsParsed.value === 'object' && !Array.isArray(sectionsParsed.value)));
    var sections = sectionsOk && sectionsParsed.value ? sectionsParsed.value : {};
    var linesParsed = parseJsonValue(row.lineItems);
    var linesOk = linesParsed.ok && (linesParsed.value == null || Array.isArray(linesParsed.value));
    var lines = [];
    if (linesOk && Array.isArray(linesParsed.value)) {
      linesParsed.value.forEach(function (line) {
        if (!line || typeof line !== 'object') return;
        lines.push({
          description: clean(asText(line.description)),
          qty: clean(asText(line.qty)),
          unitPrice: clean(asText(line.unitPrice))
        });
      });
    }
    var attachmentsParsed = readAttachments(row.attachments);
    var status = clean(row.status);
    if (CHOICES.proposalStatus.indexOf(status) === -1) status = status || 'Draft';
    return {
      id: clean(row.id),
      _row: row._row,
      _cells: row._cells,
      prospectName: clean(row.prospectName),
      business: clean(row.business),
      email: clean(row.email),
      phone: clean(row.phone),
      title: clean(row.title),
      status: status || 'Draft',
      created: row.created || '',
      sent: row.sent || '',
      expires: row.expires || '',
      total: row.total || '',
      docUrl: clean(row.docUrl),
      notes: row.notes == null ? '' : String(row.notes),
      overview: sectionsOk ? clean(asText(sections.overview)) : '',
      scope: sectionsOk ? clean(asText(sections.scope)) : '',
      timeline: sectionsOk ? clean(asText(sections.timeline)) : '',
      terms: sectionsOk ? clean(asText(sections.terms)) : '',
      lines: lines,
      sectionsOk: sectionsOk,
      linesOk: linesOk,
      sectionsRaw: sectionsOk ? '' : asText(row.sections),
      lineItemsRaw: linesOk ? '' : asText(row.lineItems),
      customerId: clean(row.customerId),
      jobId: clean(row.jobId),
      attachments: attachmentsParsed.items,
      attachmentsOk: attachmentsParsed.ok,
      attachmentsRaw: attachmentsParsed.ok ? '' : attachmentsParsed.raw,
      sample: !!row.sample
    };
  }

  function writeProposal(fields) {
    fields = fields || {};
    var lines = [];
    (fields.lines || []).forEach(function (line) {
      if (!line) return;
      var item = {
        description: clean(line.description),
        qty: clean(line.qty),
        unitPrice: clean(line.unitPrice)
      };
      if (!item.description && !item.unitPrice) return;
      lines.push(item);
    });
    var totals = documentTotals(lines, '');
    var keepSections = fields.sectionsOk === false && fields.keepBrokenSections;
    var keepLines = fields.linesOk === false && fields.keepBrokenLines;
    var keepAttachments = fields.attachmentsOk === false && fields.keepBrokenAttachments;
    var status = clean(fields.status) || 'Draft';
    return {
      id: fields.id || '',
      _row: fields._row,
      _cells: fields._cells,
      prospectName: clean(fields.prospectName),
      business: clean(fields.business),
      email: clean(fields.email),
      phone: clean(fields.phone),
      title: clean(fields.title),
      status: status,
      created: fields.created || '',
      sent: fields.sent || '',
      expires: fields.expires || '',
      total: totals.complete ? String(totals.total) : '',
      docUrl: clean(fields.docUrl),
      notes: fields.notes == null ? '' : String(fields.notes),
      sections: keepSections ? asText(fields.sectionsRaw) : JSON.stringify({
        overview: fields.overview || '',
        scope: fields.scope || '',
        timeline: fields.timeline || '',
        terms: fields.terms || ''
      }),
      lineItems: keepLines ? asText(fields.lineItemsRaw) : JSON.stringify(lines),
      customerId: clean(fields.customerId),
      jobId: clean(fields.jobId),
      attachments: keepAttachments ? asText(fields.attachmentsRaw) : JSON.stringify(mergeAttachments([], fields.attachments || [])),
      sample: fields.sample
    };
  }

  function proposalQuoteGrid(lines) {
    var totals = documentTotals(lines, '');
    var rows = [['Description', 'Qty', 'Unit price', 'Amount']];
    (lines || []).forEach(function (line) {
      var math = lineMath(line.qty, line.unitPrice);
      var unit = parseNumber(line.unitPrice);
      rows.push([
        line.description || '',
        line.qty || '',
        unit == null ? 'Price not entered' : formatUSD(unit),
        math.ok ? formatUSD(math.amount) : 'Price not entered'
      ]);
    });
    if (!lines || !lines.length) rows.push(['No line items yet.', '', '', '']);
    rows.push(['Subtotal', '', '', totals.priced ? formatUSD(totals.subtotal) : '']);
    rows.push(['Total', '', '', totals.complete ? formatUSD(totals.total) : 'Incomplete']);
    return { rows: rows, totals: totals };
  }

  function proposalView(record) {
    var view = readProposal(record);
    var lines = view.linesOk ? view.lines : [];
    return {
      title: view.title || 'Proposal',
      prospectName: view.prospectName,
      business: view.business,
      email: view.email,
      phone: view.phone,
      dateText: formatDay(view.created) || formatDay(isoDate(0)),
      validText: view.expires ? formatDay(view.expires) : 'Not set',
      overview: view.sectionsOk ? view.overview : '',
      scope: view.sectionsOk ? view.scope : '',
      timeline: view.sectionsOk ? view.timeline : '',
      terms: view.sectionsOk ? view.terms : '',
      notes: view.notes,
      grid: proposalQuoteGrid(lines),
      status: view.status,
      docUrl: view.docUrl,
      sample: view.sample
    };
  }

  function proposalDocName(record) {
    var view = readProposal(record);
    var parts = ['Proposal'];
    if (view.title) parts.push(view.title);
    if (view.prospectName) parts.push(view.prospectName);
    return parts.join(' — ').replace(/\s+/g, ' ').slice(0, 120);
  }

  function googleDocId(value) {
    var match = clean(value).match(/\/document\/d\/([A-Za-z0-9_-]+)/i);
    return match ? match[1] : '';
  }

  function proposalDocLink(value) {
    var doc = clean(value);
    if (!/^https:\/\/docs\.google\.com\/document\/d\/[A-Za-z0-9_-]+/i.test(doc)) return '';
    return doc;
  }

  function proposalComposeUrl(record) {
    var view = readProposal(record);
    if (!looksLikeEmail(view.email)) return '';
    var doc = proposalDocLink(view.docUrl);
    var files = view.attachmentsOk ? view.attachments : [];
    if (!doc && !files.length) return '';
    var subject = 'Proposal: ' + (view.title || 'Legacy Computing Services');
    var first = view.prospectName ? view.prospectName.split(/\s+/)[0] : '';
    var hello = first ? 'Hello ' + first + ',' : 'Hello,';
    var valid = view.expires ? ' It is valid until ' + formatDay(view.expires) + '.' : '';
    var about = view.title ? ' for ' + view.title : '';
    var lines = [
      hello,
      '',
      'Please review the proposal' + about + '.' + valid,
      ''
    ];
    if (doc) {
      lines.push(doc);
      lines.push('');
    }
    if (files.length) {
      lines.push(files.length === 1 ? 'File:' : 'Files:');
      files.forEach(function (file) {
        lines.push((file.name || 'Drive file') + ': ' + file.url);
      });
      lines.push('');
    }
    lines.push(
      'Thank you,',
      'Legacy Computing Services',
      'scott@legacycomputingservices.com'
    );
    return 'https://mail.google.com/mail/?view=cm&fs=1'
      + '&to=' + encodeURIComponent(view.email)
      + '&su=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function findById(rows, id) {
    var wanted = clean(id);
    if (!wanted) return null;
    var found = null;
    (rows || []).forEach(function (row) {
      if (!found && row && clean(row.id) === wanted) found = row;
    });
    return found;
  }

  function planProposalAcceptance(proposal, customers, tickets) {
    var view = readProposal(proposal);
    if (!view.prospectName) {
      return { error: 'Enter the prospect name before marking this accepted.' };
    }
    var customer = findById(customers, view.customerId);
    if (!customer && looksLikeEmail(view.email)) {
      var email = view.email.toLowerCase();
      (customers || []).forEach(function (row) {
        if (!customer && clean(row.email).toLowerCase() === email) customer = row;
      });
    }
    if (!customer) {
      var name = view.prospectName.toLowerCase();
      (customers || []).forEach(function (row) {
        if (!customer && clean(row.name).toLowerCase() === name) customer = row;
      });
    }
    var creatingCustomer = !customer;
    if (!customer) {
      customer = {
        name: view.prospectName,
        email: view.email,
        phone: view.phone,
        company: view.business,
        town: '',
        notes: 'Added when a proposal was accepted.' + (view.title ? ' Proposal: ' + view.title + '.' : '')
      };
    }
    var ticket = findById(tickets, view.jobId);
    var marker = view.id ? 'Opened from an accepted proposal ' + view.id + '.' : '';
    if (!ticket && marker) {
      (tickets || []).forEach(function (row) {
        if (ticket || !row) return;
        if (asText(row.notes).indexOf(marker) !== -1) ticket = row;
      });
    }
    var creatingTicket = !ticket;
    if (!ticket) {
      var note = marker || 'Opened from an accepted proposal.';
      if (view.title) note += ' ' + view.title + '.';
      if (view.overview) note += '\n' + view.overview;
      ticket = {
        customer: customer.name || view.prospectName,
        issue: view.title || 'Accepted proposal',
        status: 'Open',
        priority: 'Normal',
        assignedTo: '',
        openedOn: isoDate(0),
        dueOn: '',
        notes: note,
        intakeSent: ''
      };
    }
    var next = writeProposal(Object.assign({}, view, {
      status: 'Accepted',
      customerId: customer.id || '',
      jobId: ticket.id || '',
      sectionsOk: view.sectionsOk,
      linesOk: view.linesOk,
      attachmentsOk: view.attachmentsOk,
      keepBrokenSections: view.sectionsOk === false,
      keepBrokenLines: view.linesOk === false,
      keepBrokenAttachments: view.attachmentsOk === false
    }));
    return {
      error: '',
      customer: customer,
      ticket: ticket,
      creatingCustomer: creatingCustomer,
      creatingTicket: creatingTicket,
      proposal: next
    };
  }

  function rgbColor(rgb) {
    return { color: { rgbColor: rgb } };
  }

  function textStyle(rgb, size, extra) {
    var style = {
      bold: false,
      italic: false,
      weightedFontFamily: { fontFamily: 'Arial', weight: 400 },
      fontSize: { magnitude: size, unit: 'PT' },
      foregroundColor: rgbColor(rgb)
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) { style[key] = extra[key]; });
    }
    if (style.bold) style.weightedFontFamily = { fontFamily: 'Arial', weight: 700 };
    return style;
  }

  function paragraphBorder(rgb, width) {
    return {
      color: rgbColor(rgb),
      width: { magnitude: width, unit: 'PT' },
      padding: { magnitude: 3, unit: 'PT' },
      dashStyle: 'SOLID'
    };
  }

  function proposalOpeningRequests(view) {
    var requests = [];
    var cursor = 1;
    view = view || {};
    var grid = (view.grid && view.grid.rows) || proposalQuoteGrid([]).rows;

    requests.push({
      updateDocumentStyle: {
        documentStyle: {
          marginTop: { magnitude: 50, unit: 'PT' },
          marginBottom: { magnitude: 50, unit: 'PT' },
          marginLeft: { magnitude: 64, unit: 'PT' },
          marginRight: { magnitude: 64, unit: 'PT' }
        },
        fields: 'marginTop,marginBottom,marginLeft,marginRight'
      }
    });

    function insertText(text) {
      requests.push({ insertText: { location: { index: cursor }, text: text } });
      cursor += text.length;
    }

    function styleText(start, end, style, fields) {
      if (end <= start) return;
      requests.push({
        updateTextStyle: {
          range: { startIndex: start, endIndex: end },
          textStyle: style,
          fields: fields
        }
      });
    }

    function styleParagraph(start, end, style, fields) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle: style,
          fields: fields
        }
      });
    }

    requests.push({
      insertInlineImage: {
        location: { index: cursor },
        uri: PROPOSAL_BRAND.logoUrl,
        objectSize: {
          height: { magnitude: 78, unit: 'PT' },
          width: { magnitude: 70, unit: 'PT' }
        }
      }
    });
    var imageStart = cursor;
    cursor += 1;
    insertText('\n');
    styleParagraph(imageStart, cursor, { alignment: 'CENTER' }, 'alignment');

    function addParagraph(text, style, textFields, paragraphStyle, paragraphFields) {
      var start = cursor;
      insertText(text + '\n');
      styleText(start, cursor - 1, style, textFields);
      if (paragraphStyle) styleParagraph(start, cursor, paragraphStyle, paragraphFields);
    }

    var textFields = 'bold,italic,fontSize,weightedFontFamily,foregroundColor';
    addParagraph(
      PROPOSAL_BRAND.company,
      textStyle(PROPOSAL_BRAND.navy, 20, { bold: true }),
      textFields,
      {
        alignment: 'CENTER',
        spaceAbove: { magnitude: 8, unit: 'PT' },
        spaceBelow: { magnitude: 1, unit: 'PT' }
      },
      'alignment,spaceAbove,spaceBelow'
    );
    addParagraph(
      PROPOSAL_BRAND.tagline,
      textStyle(PROPOSAL_BRAND.cyan, 11, { italic: true }),
      textFields,
      {
        alignment: 'CENTER',
        spaceAbove: { magnitude: 0, unit: 'PT' },
        spaceBelow: { magnitude: 1, unit: 'PT' }
      },
      'alignment,spaceAbove,spaceBelow'
    );
    addParagraph(
      PROPOSAL_BRAND.contact,
      textStyle(PROPOSAL_BRAND.slate, 9, { bold: false, italic: false }),
      textFields,
      {
        alignment: 'CENTER',
        spaceBelow: { magnitude: 8, unit: 'PT' },
        borderBottom: paragraphBorder(PROPOSAL_BRAND.cyan, 1.5)
      },
      'alignment,spaceBelow,borderBottom'
    );

    addParagraph(
      'PROPOSAL',
      textStyle(PROPOSAL_BRAND.cyan, 10, { bold: true }),
      textFields,
      {
        alignment: 'START',
        spaceAbove: { magnitude: 16, unit: 'PT' },
        spaceBelow: { magnitude: 2, unit: 'PT' }
      },
      'alignment,spaceAbove,spaceBelow'
    );
    addParagraph(
      view.title || 'Proposal',
      textStyle(PROPOSAL_BRAND.navy, 22, { bold: true }),
      textFields,
      {
        namedStyleType: 'HEADING_1',
        spaceAbove: { magnitude: 0, unit: 'PT' },
        spaceBelow: { magnitude: 10, unit: 'PT' }
      },
      'namedStyleType,spaceAbove,spaceBelow'
    );

    function addHeading(label) {
      addParagraph(
        label,
        textStyle(PROPOSAL_BRAND.navy, 12, { bold: true }),
        textFields,
        {
          namedStyleType: 'HEADING_2',
          spaceAbove: { magnitude: 14, unit: 'PT' },
          spaceBelow: { magnitude: 3, unit: 'PT' },
          borderBottom: paragraphBorder(PROPOSAL_BRAND.cyan, 1)
        },
        'namedStyleType,spaceAbove,spaceBelow,borderBottom'
      );
    }

    function addBody(text) {
      var value = clean(text) || 'Not specified.';
      value.split('\n').forEach(function (line) {
        addParagraph(
          line,
          textStyle(PROPOSAL_BRAND.navy, 11, { bold: false, italic: false }),
          textFields,
          {
            namedStyleType: 'NORMAL_TEXT',
            spaceAbove: { magnitude: 1, unit: 'PT' },
            spaceBelow: { magnitude: 1, unit: 'PT' }
          },
          'namedStyleType,spaceAbove,spaceBelow'
        );
      });
    }

    addHeading('Prepared for');
    addBody(view.prospectName || 'Not specified.');
    if (clean(view.business)) addBody(view.business);
    var reach = [clean(view.email), clean(view.phone)].filter(Boolean).join('  ·  ');
    if (reach) addBody(reach);
    addBody('Date: ' + (view.dateText || 'Not set'));
    addBody('Valid until: ' + (view.validText || 'Not set'));
    addHeading('OVERVIEW');
    addBody(view.overview);
    addHeading('SCOPE & DELIVERABLES');
    addBody(view.scope);
    addHeading('TIMELINE');
    addBody(view.timeline);
    addHeading('QUOTE');

    var tableIndex = cursor;
    requests.push({
      insertTable: {
        rows: grid.length,
        columns: 4,
        location: { index: tableIndex }
      }
    });
    return { requests: requests, tableIndex: tableIndex };
  }

  function proposalClosingText(view) {
    view = view || {};
    var who = clean(view.prospectName) || 'the client';
    var terms = clean(view.terms) || 'No additional terms were added to this proposal.';
    return [
      '',
      'TERMS',
      terms,
      '',
      'ACCEPTANCE',
      'By signing below, ' + who + ' accepts this proposal and authorizes Legacy Computing Services LLC to begin the work described above.',
      '',
      'Client signature: ______________________________     Date: ______________',
      '',
      'Printed name: _________________________________',
      '',
      PROPOSAL_BRAND.company,
      'Bel Air, MD'
    ].join('\n');
  }

  function paragraphPlainText(paragraph) {
    var text = '';
    ((paragraph && paragraph.elements) || []).forEach(function (part) {
      if (part.textRun && part.textRun.content) text += part.textRun.content;
    });
    return text.replace(/\n$/, '');
  }

  function findProposalTable(doc) {
    var content = (doc && doc.body && doc.body.content) || [];
    var tableEl = null;
    var after = null;
    for (var i = 0; i < content.length; i++) {
      if (content[i].table) {
        tableEl = content[i];
        after = content[i + 1] || null;
      }
    }
    if (!tableEl) return null;
    var cells = (tableEl.table.tableRows || []).map(function (row) {
      return (row.tableCells || []).map(function (cell) {
        var start = cell.content && cell.content[0] && cell.content[0].startIndex != null
          ? cell.content[0].startIndex
          : cell.startIndex;
        return { start: start };
      });
    });
    var appendAt = after && after.startIndex != null ? after.startIndex : tableEl.endIndex;
    return { tableStart: tableEl.startIndex, cells: cells, appendAt: appendAt, table: tableEl };
  }

  function proposalFillRequests(doc, grid, closingText) {
    var found = findProposalTable(doc);
    if (!found) return [];
    var ops = [];
    found.cells.forEach(function (row, r) {
      row.forEach(function (cell, c) {
        var value = grid && grid[r] ? grid[r][c] : '';
        if (value == null || value === '') return;
        ops.push({ index: cell.start, text: String(value) });
      });
    });
    if (closingText) ops.push({ index: found.appendAt, text: closingText });
    ops.sort(function (a, b) { return b.index - a.index; });
    return ops.map(function (op) {
      return { insertText: { location: { index: op.index }, text: op.text } };
    });
  }

  function proposalPolishRequests(doc) {
    var requests = [];
    var content = (doc && doc.body && doc.body.content) || [];
    var textFields = 'bold,italic,fontSize,weightedFontFamily,foregroundColor';

    function paintParagraph(block, style, fields, paragraphStyle, paragraphFields) {
      if (style) {
        var end = block.endIndex;
        if (end > block.startIndex + 1) end -= 1;
        requests.push({
          updateTextStyle: {
            range: { startIndex: block.startIndex, endIndex: end },
            textStyle: style,
            fields: fields
          }
        });
      }
      if (paragraphStyle) {
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: block.startIndex, endIndex: block.endIndex },
            paragraphStyle: paragraphStyle,
            fields: paragraphFields
          }
        });
      }
    }

    content.forEach(function (block) {
      if (!block.paragraph) return;
      var text = paragraphPlainText(block.paragraph);
      if (!text) return;
      if (text === PROPOSAL_BRAND.company) {
        paintParagraph(block, textStyle(PROPOSAL_BRAND.navy, 20, { bold: true }), textFields, { alignment: 'CENTER' }, 'alignment');
        return;
      }
      if (text === PROPOSAL_BRAND.tagline) {
        paintParagraph(block, textStyle(PROPOSAL_BRAND.cyan, 11, { italic: true }), textFields, { alignment: 'CENTER' }, 'alignment');
        return;
      }
      if (text === PROPOSAL_BRAND.contact) {
        paintParagraph(
          block,
          textStyle(PROPOSAL_BRAND.slate, 9, { bold: false, italic: false }),
          textFields,
          { alignment: 'CENTER', borderBottom: paragraphBorder(PROPOSAL_BRAND.cyan, 1.5) },
          'alignment,borderBottom'
        );
        return;
      }
      if (text === 'PROPOSAL') {
        paintParagraph(block, textStyle(PROPOSAL_BRAND.cyan, 10, { bold: true }), textFields, { alignment: 'START' }, 'alignment');
        return;
      }
      if (PROPOSAL_HEADINGS[text]) {
        paintParagraph(
          block,
          textStyle(PROPOSAL_BRAND.navy, 12, { bold: true }),
          textFields,
          {
            namedStyleType: 'HEADING_2',
            borderBottom: paragraphBorder(PROPOSAL_BRAND.cyan, 1)
          },
          'namedStyleType,borderBottom'
        );
      }
    });

    content.forEach(function (block) {
      if (!block.table || block.startIndex == null) return;
      var rows = block.table.tableRows || [];
      var columns = rows[0] && rows[0].tableCells ? rows[0].tableCells.length : 0;
      if (!rows.length || !columns) return;
      var border = {
        color: rgbColor(PROPOSAL_BRAND.cyan),
        width: { magnitude: 0.6, unit: 'PT' },
        dashStyle: 'SOLID'
      };
      function cellRange(rowIndex, columnIndex, rowSpan, columnSpan) {
        return {
          tableCellLocation: {
            tableStartLocation: { index: block.startIndex },
            rowIndex: rowIndex,
            columnIndex: columnIndex
          },
          rowSpan: rowSpan,
          columnSpan: columnSpan
        };
      }
      requests.push({
        updateTableCellStyle: {
          tableRange: cellRange(0, 0, rows.length, columns),
          tableCellStyle: {
            borderTop: border,
            borderBottom: border,
            borderLeft: border,
            borderRight: border,
            paddingTop: { magnitude: 5, unit: 'PT' },
            paddingBottom: { magnitude: 5, unit: 'PT' },
            paddingLeft: { magnitude: 6, unit: 'PT' },
            paddingRight: { magnitude: 6, unit: 'PT' }
          },
          fields: 'borderTop,borderBottom,borderLeft,borderRight,paddingTop,paddingBottom,paddingLeft,paddingRight'
        }
      });
      requests.push({
        updateTableCellStyle: {
          tableRange: cellRange(0, 0, 1, columns),
          tableCellStyle: { backgroundColor: rgbColor(PROPOSAL_BRAND.navy) },
          fields: 'backgroundColor'
        }
      });
      if (rows.length >= 1) {
        requests.push({
          updateTableCellStyle: {
            tableRange: cellRange(rows.length - 1, 0, 1, columns),
            tableCellStyle: { backgroundColor: rgbColor(PROPOSAL_BRAND.tint) },
            fields: 'backgroundColor'
          }
        });
      }
      var widths = [270, 54, 88, 88];
      for (var c = 0; c < columns && c < widths.length; c++) {
        requests.push({
          updateTableColumnProperties: {
            tableStartLocation: { index: block.startIndex },
            columnIndices: [c],
            tableColumnProperties: {
              widthType: 'FIXED_WIDTH',
              width: { magnitude: widths[c], unit: 'PT' }
            },
            fields: 'widthType,width'
          }
        });
      }
      rows.forEach(function (row, r) {
        (row.tableCells || []).forEach(function (cell, c) {
          var para = (cell.content || [])[0];
          if (!para || para.startIndex == null) return;
          var align = c === 0 ? 'START' : 'END';
          var bold = r === 0 || r >= rows.length - 2;
          var color = r === 0 ? PROPOSAL_BRAND.white : PROPOSAL_BRAND.navy;
          var end = para.endIndex;
          if (end > para.startIndex + 1) end -= 1;
          requests.push({
            updateTextStyle: {
              range: { startIndex: para.startIndex, endIndex: end },
              textStyle: textStyle(color, 9, { bold: bold, italic: false }),
              fields: textFields
            }
          });
          requests.push({
            updateParagraphStyle: {
              range: { startIndex: para.startIndex, endIndex: para.endIndex },
              paragraphStyle: { alignment: align },
              fields: 'alignment'
            }
          });
        });
      });
    });
    return requests;
  }

  function clipText(value, max) {
    var text = value == null ? '' : String(value).trim();
    if (text.length > max) return text.slice(0, max);
    return text;
  }

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && Object.prototype.toString.call(value) !== '[object Array]';
  }

  function decodeFormComponent(text) {
    var raw = String(text == null ? '' : text).replace(/\+/g, ' ');
    try { return decodeURIComponent(raw); } catch (err) { return raw; }
  }

  function parseFormEncoded(text) {
    var out = {};
    String(text || '').split('&').forEach(function (pair) {
      if (!pair) return;
      var idx = pair.indexOf('=');
      var key = decodeFormComponent(idx === -1 ? pair : pair.slice(0, idx));
      var val = decodeFormComponent(idx === -1 ? '' : pair.slice(idx + 1));
      if (!key || Object.prototype.hasOwnProperty.call(out, key)) return;
      out[key] = val;
    });
    return out;
  }

  function jsonObject(text) {
    var parsed = parseJsonValue(text);
    if (!parsed.ok || !isPlainObject(parsed.value)) return null;
    return parsed.value;
  }

  function firstValue(value) {
    if (Object.prototype.toString.call(value) === '[object Array]') return value.length ? value[0] : '';
    return value;
  }

  /* Accept a JSON body, a form body, or form fields. A form field named
     payload may itself be the JSON object (the same handoff the contact form uses).
     An empty website field is the honeypot. A filled one is kept so the caller can drop the row. */
  function academyFieldsFromPost(post) {
    post = post || {};
    var fields = isPlainObject(post.fields) ? post.fields : {};
    var body = post.body == null ? '' : String(post.body).trim();
    var fromBody = jsonObject(body);
    var bodyFields = {};
    if (!fromBody && body && body.indexOf('=') !== -1 && body.charAt(0) !== '{') {
      bodyFields = parseFormEncoded(body);
    }
    var payloadRaw = fields.payload != null ? fields.payload : bodyFields.payload;
    var fromPayload = jsonObject(payloadRaw);
    var data = {};
    function take(source) {
      if (!isPlainObject(source)) return;
      ACADEMY_PAYLOAD_KEYS.forEach(function (key) {
        if (!Object.prototype.hasOwnProperty.call(source, key)) return;
        var value = firstValue(source[key]);
        if (value == null) return;
        data[key] = value;
      });
    }
    take(fromPayload);
    take(fromBody);
    take(bodyFields);
    take(fields);
    [fromPayload, fromBody, bodyFields, fields].forEach(function (source) {
      if (!isPlainObject(source) || !Object.prototype.hasOwnProperty.call(source, 'website')) return;
      var value = firstValue(source.website);
      if (value != null && String(value).trim()) data.website = value;
    });
    return data;
  }

  function normalizeAgeGroup(value) {
    var text = clipText(value, 40);
    var key = text.toLowerCase();
    if (key === 'youth') return 'Youth';
    if (key === 'adult') return 'Adult';
    if (key === 'senior') return 'Senior';
    return text;
  }

  function academyRequestRecord(data) {
    data = data || {};
    if (clipText(data.website, 500)) return { ok: true, ignored: true };
    var form = clipText(data.form, 40).toLowerCase();
    if (form !== 'booking' && form !== 'inquiry') {
      return { ok: false, error: 'form must be booking or inquiry.' };
    }
    var name = clipText(data.name, 200);
    var email = clipText(data.email, 200);
    if (!name || !email) return { ok: false, error: 'Name and email are required.' };
    if (email.indexOf('@') === -1) return { ok: false, error: 'Email is not valid.' };
    return {
      ok: true,
      record: {
        form: form,
        name: name,
        email: email,
        phone: clipText(data.phone, 80),
        ageGroup: normalizeAgeGroup(data.ageGroup),
        program: clipText(data.program, 200),
        preferredTimes: clipText(data.preferredTimes, 500),
        goals: clipText(data.goals, 2000),
        message: clipText(data.message, 5000),
        source: clipText(data.source, 200) || ACADEMY.source,
        status: 'New',
        notes: '',
        sessionId: ''
      }
    };
  }

  function invoiceBrand(value) {
    var name = clean(value).toLowerCase();
    if (name === 'legacy bowling academy' || name === 'academy') return INVOICE_BRANDS.academy;
    return INVOICE_BRANDS.lcs;
  }

  function httpsUrl(value) {
    var link = clean(value);
    if (/^https:\/\/\S+$/i.test(link)) return link;
    return '';
  }

  function paymentLinkProblem(value) {
    var link = clean(value);
    if (!link) return '';
    if (httpsUrl(link)) return '';
    return 'The payment link must be an https URL for Legacy Computing Services, LLC, or stay blank. There is no separate academy payment account.';
  }

  /* One payee: Legacy Computing Services, LLC. paymentUrl in config is that
     link for every invoice. A link typed on one row is used only when the
     company link is still blank, and it is still the LCS link. */
  function invoicePaymentUrl(record, config) {
    var shared = httpsUrl(config && config.paymentUrl);
    if (shared) return shared;
    return httpsUrl(record && record.paymentLink);
  }

  function academyStudentError(record) {
    record = record || {};
    if (!clean(record.name)) return 'Enter a name.';
    if (CHOICES.ageGroup.indexOf(clean(record.ageGroup)) === -1) return 'Choose an age group: Youth, Adult, or Senior.';
    if (clean(record.ageGroup) === 'Youth' && !clean(record.guardian)) return 'A youth student needs a parent or guardian.';
    if (CHOICES.studentStatus.indexOf(clean(record.status)) === -1) return 'Choose a status.';
    if (clean(record.email) && !looksLikeEmail(record.email)) return 'Email is not valid.';
    return '';
  }

  function academySessionError(record) {
    record = record || {};
    if (CHOICES.sessionKind.indexOf(clean(record.kind)) === -1) return 'Choose a session type.';
    var status = clean(record.status);
    if (CHOICES.sessionStatus.indexOf(status) === -1) return 'Choose a status.';
    if (clean(record.kind) === 'Private lesson' && !clean(record.student)) return 'A private lesson needs a student.';
    var date = clean(record.date);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Use a real date.';
    if ((status === 'Confirmed' || status === 'Completed') && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return 'A confirmed or completed session needs a date.';
    }
    return '';
  }

  function clockMinutes(value) {
    var match = clean(value).match(/^(\d{2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function minutesToClock(total) {
    var day = 24 * 60;
    var n = ((total % day) + day) % day;
    var h = Math.floor(n / 60);
    var m = n % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function nextIsoDate(date) {
    var parts = date.split('-');
    var dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    dt.setUTCDate(dt.getUTCDate() + 1);
    var month = dt.getUTCMonth() + 1;
    var day = dt.getUTCDate();
    return dt.getUTCFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
  }

  function compactStamp(date, clock) {
    return date.replace(/-/g, '') + (clock ? 'T' + clock.replace(':', '') + '00' : '');
  }

  function academyCalendarDraft(session) {
    session = session || {};
    var date = clean(session.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    var startMin = clockMinutes(session.start);
    var endMin = clockMinutes(session.end);
    var assumedEnd = false;
    var endDate = date;
    var startClock = '';
    var endClock = '';
    if (startMin == null) {
      endDate = nextIsoDate(date);
    } else {
      startClock = minutesToClock(startMin);
      if (endMin == null) {
        endMin = startMin + 60;
        assumedEnd = true;
      }
      endClock = minutesToClock(endMin);
      if (endMin <= startMin) endDate = nextIsoDate(date);
    }
    var kind = clean(session.kind) || 'Session';
    var who = clean(session.student) || clean(session.program) || 'Academy';
    var summary = 'Bowling — ' + kind + ' — ' + who;
    var location = clean(session.location) || ACADEMY.location;
    var lines = [
      'Legacy Bowling Academy',
      kind,
      'Student or group: ' + who,
      clean(session.coach) ? 'Coach: ' + clean(session.coach) : '',
      clean(session.program) ? 'Program: ' + clean(session.program) : ''
    ];
    if (assumedEnd) {
      lines.push('End time was not on the session. This block is 60 minutes because a private session on the academy site is described that way. Change the end time in Calendar if this one is different.');
    }
    var description = lines.filter(Boolean).join('\n');
    var event = startMin == null
      ? {
        summary: summary,
        location: location,
        description: description,
        start: { date: date },
        end: { date: endDate }
      }
      : {
        summary: summary,
        location: location,
        description: description,
        start: { dateTime: date + 'T' + startClock + ':00', timeZone: 'America/New_York' },
        end: { dateTime: endDate + 'T' + endClock + ':00', timeZone: 'America/New_York' }
      };
    var dates = startMin == null
      ? compactStamp(date) + '/' + compactStamp(endDate)
      : compactStamp(date, startClock) + '/' + compactStamp(endDate, endClock);
    var templateUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(summary)
      + '&dates=' + dates
      + '&location=' + encodeURIComponent(location)
      + '&details=' + encodeURIComponent(description)
      + '&ctz=' + encodeURIComponent('America/New_York');
    return {
      summary: summary,
      location: location,
      description: description,
      templateUrl: templateUrl,
      event: event,
      assumedEnd: assumedEnd
    };
  }

  function academySessionInvoice(session) {
    session = session || {};
    var who = clean(session.student) || clean(session.program) || '';
    var when = [clean(session.date), clean(session.start)].filter(Boolean).join(' ');
    var kind = clean(session.kind) || 'Session';
    var place = clean(session.location) || ACADEMY.location;
    var description = [kind, when, place].filter(Boolean).join(' — ');
    if (clean(session.coach)) description += ' (coach: ' + clean(session.coach) + ')';
    return {
      brand: ACADEMY.brandId,
      customer: who,
      status: 'Draft',
      sessionId: clean(session.id),
      packageName: '',
      paymentLink: '',
      quoteNumber: '',
      tax: '',
      notes: 'Created from an academy session. Type the price on the line. Leave it blank until you set it.',
      lines: [{ description: description, qty: '1', unitPrice: '' }]
    };
  }

  function academyPackageInvoice(fields) {
    fields = fields || {};
    var name = clean(fields.packageName);
    if (!name) return { error: 'Enter a package name. The price stays blank until you type it.' };
    if (!clean(fields.customer)) return { error: 'Enter who to bill. The price stays blank until you type it.' };
    return {
      brand: ACADEMY.brandId,
      customer: clean(fields.customer),
      status: 'Draft',
      sessionId: '',
      packageName: name,
      paymentLink: '',
      quoteNumber: '',
      tax: '',
      notes: 'Academy package. Type the price on the line. Leave it blank until you set it.',
      lines: [{ description: name, qty: '1', unitPrice: '' }]
    };
  }

  function sampleBundle(now) {
    var today = isoDate(0, now);
    var soon = isoDate(14, now);
    var tomorrow = isoDate(1, now);
    var later = isoDate(3, now);
    return {
      Customers: [
        {
          id: 'sample-customer-ada',
          created: today,
          updated: today,
          name: 'Ada Example',
          email: 'ada.example@example.test',
          phone: '(410) 555-0101',
          company: 'Sample Bakery',
          town: 'Bel Air',
          notes: 'Sample customer. Not a real person.',
          sample: true
        },
        {
          id: 'sample-customer-ben',
          created: today,
          updated: today,
          name: 'Ben Sample',
          email: 'ben.sample@example.test',
          phone: '(410) 555-0199',
          company: 'Sample Hardware',
          town: 'Forest Hill',
          notes: 'Sample customer. Not a real person.',
          sample: true
        }
      ],
      Tickets: [
        {
          id: 'sample-ticket-1',
          created: today,
          updated: today,
          customer: 'Ada Example',
          issue: 'SAMPLE: register drawer sticks',
          status: 'Open',
          priority: 'Normal',
          assignedTo: 'Sample tech',
          openedOn: today,
          dueOn: soon,
          notes: 'Fake ticket for the preview. Not a real job.',
          intakeSent: '',
          sample: true
        },
        {
          id: 'sample-ticket-2',
          created: today,
          updated: today,
          customer: 'Ben Sample',
          issue: 'SAMPLE: website photo is sideways',
          status: 'In progress',
          priority: 'Low',
          assignedTo: 'Sample tech',
          openedOn: today,
          dueOn: '',
          notes: 'Fake ticket for the preview.',
          intakeSent: today,
          sample: true
        },
        {
          id: 'sample-ticket-3',
          created: today,
          updated: today,
          customer: 'Ada Example',
          issue: 'SAMPLE: ask about a backup drive',
          status: 'Done',
          priority: 'Low',
          assignedTo: 'Sample tech',
          openedOn: today,
          dueOn: '',
          notes: 'Fake closed ticket.',
          intakeSent: '',
          sample: true
        }
      ],
      Inquiries: [
        {
          id: 'sample-inquiry-1',
          received: today,
          name: 'Pat Preview',
          email: 'pat.preview@example.test',
          phone: '',
          service: 'Website Building & Modernization',
          budget: 'Sample budget, not a quote',
          details: 'SAMPLE inquiry from the public form preview. Not a real message.',
          status: 'New',
          source: 'Sample data',
          notes: 'Fake inquiry. Nothing was emailed.',
          sample: true
        }
      ],
      Quotes: [
        {
          id: 'sample-quote-1',
          number: 'Q-SAMPLE',
          created: today,
          updated: today,
          customer: 'Ada Example',
          status: 'Draft',
          issuedOn: today,
          validUntil: soon,
          tax: '',
          notes: 'Sample quote. The dollar amount is not a company price.',
          sample: true
        }
      ],
      QuoteItems: [
        {
          id: 'sample-quote-line-1',
          quoteId: 'sample-quote-1',
          quoteNumber: 'Q-SAMPLE',
          description: 'Sample on-site visit (not a real price)',
          qty: '1',
          unitPrice: '10',
          sample: true
        }
      ],
      Invoices: [
        {
          id: 'sample-invoice-1',
          number: 'INV-SAMPLE',
          created: today,
          updated: today,
          customer: 'Ben Sample',
          status: 'Draft',
          issuedOn: today,
          dueOn: soon,
          quoteNumber: '',
          tax: '',
          notes: 'Sample invoice. The dollar amount is not a company price.',
          brand: '',
          paymentLink: '',
          sessionId: '',
          packageName: '',
          sample: true
        },
        {
          id: 'sample-invoice-academy',
          number: 'INV-SAMPLE-ACADEMY',
          created: today,
          updated: today,
          customer: 'Riley Sample',
          status: 'Draft',
          issuedOn: today,
          dueOn: soon,
          quoteNumber: '',
          tax: '',
          notes: 'Sample academy invoice. The price was not entered. This is not a company price.',
          brand: 'Legacy Bowling Academy',
          paymentLink: '',
          sessionId: 'sample-session-1',
          packageName: '',
          sample: true
        }
      ],
      InvoiceItems: [
        {
          id: 'sample-invoice-line-1',
          invoiceId: 'sample-invoice-1',
          invoiceNumber: 'INV-SAMPLE',
          description: 'Sample labor (not a real price)',
          qty: '2',
          unitPrice: '25',
          sample: true
        },
        {
          id: 'sample-invoice-line-academy',
          invoiceId: 'sample-invoice-academy',
          invoiceNumber: 'INV-SAMPLE-ACADEMY',
          description: 'SAMPLE private lesson at Forest Hill Lanes (price not entered)',
          qty: '1',
          unitPrice: '',
          sample: true
        }
      ],
      Proposals: [
        {
          id: 'sample-proposal-1',
          prospectName: 'Pat Preview',
          business: 'Sample Bakery',
          email: 'pat.preview@example.test',
          phone: '(410) 555-0142',
          title: 'SAMPLE: website refresh',
          status: 'Draft',
          created: today,
          sent: '',
          expires: soon,
          total: '60',
          docUrl: '',
          notes: 'Sample proposal. The dollar amount is not a company price.',
          sections: JSON.stringify({
            overview: 'SAMPLE overview for a fake website refresh.',
            scope: 'SAMPLE: one new page\nSAMPLE: a contact form',
            timeline: 'SAMPLE: two weeks after approval.',
            terms: 'SAMPLE terms. Not a real agreement.'
          }),
          lineItems: JSON.stringify([
            { description: 'Sample page (not a real price)', qty: '2', unitPrice: '25' },
            { description: 'Sample visit (not a real price)', qty: '1', unitPrice: '10' }
          ]),
          customerId: '',
          jobId: '',
          sample: true
        },
        {
          id: 'sample-proposal-2',
          prospectName: 'Ada Example',
          business: 'Sample Bakery',
          email: 'ada.example@example.test',
          phone: '(410) 555-0101',
          title: 'SAMPLE: backup plan',
          status: 'Sent',
          created: today,
          sent: today,
          expires: soon,
          total: '10',
          docUrl: 'https://docs.google.com/document/d/sample-proposal/edit',
          notes: 'Sample sent proposal. The dollar amount is not a company price.',
          sections: JSON.stringify({
            overview: 'SAMPLE overview for a fake backup plan.',
            scope: 'SAMPLE: one backup check',
            timeline: 'SAMPLE: one visit.',
            terms: 'SAMPLE terms. Not a real agreement.'
          }),
          lineItems: JSON.stringify([
            { description: 'Sample backup check (not a real price)', qty: '1', unitPrice: '10' }
          ]),
          customerId: '',
          jobId: '',
          sample: true
        },
        {
          id: 'sample-proposal-3',
          prospectName: 'Riley Sample',
          business: 'Sample Hardware',
          email: 'riley.sample@example.test',
          phone: '(410) 555-0177',
          title: '',
          status: 'Sent',
          created: today,
          sent: today,
          expires: '',
          total: '',
          docUrl: '',
          notes: 'Sample proposal that was already a file in Drive. Not a company record.',
          sections: JSON.stringify({ overview: '', scope: '', timeline: '', terms: '' }),
          lineItems: '[]',
          customerId: '',
          jobId: '',
          attachments: JSON.stringify([
            {
              id: 'sampleDriveFile12345',
              name: 'SAMPLE — existing proposal PDF',
              mimeType: 'application/pdf',
              url: 'https://drive.google.com/file/d/sampleDriveFile12345/view'
            },
            {
              id: 'sampleDriveDoc123456',
              name: 'SAMPLE — scope notes',
              mimeType: 'application/vnd.google-apps.document',
              url: 'https://docs.google.com/document/d/sampleDriveDoc123456/edit'
            }
          ]),
          sample: true
        }
      ],
      'Academy Students': [
        {
          id: 'sample-student-riley',
          created: today,
          updated: today,
          name: 'Riley Sample',
          email: 'riley.sample@example.test',
          phone: '(410) 555-0160',
          ageGroup: 'Youth',
          guardian: 'Pat Preview',
          program: 'Youth program',
          coach: 'Sample Coach',
          notes: 'Sample student. Not a real person.',
          status: 'Active',
          sample: true
        },
        {
          id: 'sample-student-jordan',
          created: today,
          updated: today,
          name: 'Jordan Example',
          email: 'jordan.example@example.test',
          phone: '(410) 555-0161',
          ageGroup: 'Adult',
          guardian: '',
          program: 'Private lessons',
          coach: 'Sample Coach',
          notes: 'Sample student. Not a real person.',
          status: 'Active',
          sample: true
        }
      ],
      'Academy Requests': [
        {
          id: 'sample-request-1',
          received: today,
          form: 'booking',
          name: 'Casey Preview',
          email: 'casey.preview@example.test',
          phone: '(410) 555-0162',
          ageGroup: 'Youth',
          program: 'Youth program',
          preferredTimes: 'Weeknights after 5',
          goals: 'SAMPLE goal. Not a real request.',
          message: 'SAMPLE booking request from the academy site preview.',
          source: 'legacy-bowling-academy',
          status: 'New',
          notes: 'Fake request. Nothing was booked.',
          sessionId: '',
          sample: true
        }
      ],
      'Academy Sessions': [
        {
          id: 'sample-session-1',
          created: today,
          updated: today,
          student: 'Riley Sample',
          studentId: 'sample-student-riley',
          kind: 'Private lesson',
          status: 'Completed',
          date: tomorrow,
          start: '16:00',
          end: '17:00',
          coach: 'Sample Coach',
          location: 'Forest Hill Lanes',
          program: 'Youth program',
          notes: 'Sample completed lesson. The price is not filled in.',
          requestId: '',
          invoiceId: 'sample-invoice-academy',
          calendarEventId: '',
          sample: true
        },
        {
          id: 'sample-session-2',
          created: today,
          updated: today,
          student: '',
          studentId: '',
          kind: 'Group clinic',
          status: 'Requested',
          date: later,
          start: '10:00',
          end: '',
          coach: 'Sample Coach',
          location: 'Forest Hill Lanes',
          program: 'Clinic',
          notes: 'Sample group clinic. Not a real booking.',
          requestId: '',
          invoiceId: '',
          calendarEventId: '',
          sample: true
        }
      ],
      events: [
        {
          id: 'sample-event-1',
          summary: 'SAMPLE: call with Ada Example',
          start: tomorrow + 'T15:00:00',
          sample: true
        },
        {
          id: 'sample-event-2',
          summary: 'SAMPLE: bench time',
          start: later + 'T10:00:00',
          sample: true
        }
      ],
      files: [
        {
          id: 'sample-file-1',
          name: 'SAMPLE — How to close a ticket',
          mimeType: 'application/pdf',
          modifiedTime: today,
          sample: true
        },
        {
          id: 'sample-file-2',
          name: 'SAMPLE — New employee checklist',
          mimeType: 'application/vnd.google-apps.document',
          modifiedTime: today,
          sample: true
        }
      ]
    };
  }

  function calendarEmbedUrl(calendarId, options) {
    var id = clean(calendarId);
    if (!id || isPlaceholder(id)) return '';
    var opts = options || {};
    var mode = opts.mode === 'AGENDA' ? 'AGENDA' : 'WEEK';
    var tz = clean(opts.timeZone) || 'America/New_York';
    return 'https://calendar.google.com/calendar/embed?src=' + encodeURIComponent(id)
      + '&ctz=' + encodeURIComponent(tz)
      + '&mode=' + mode
      + '&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&bgcolor=0B131E';
  }

  function drivePreviewUrl(file, edit) {
    if (!file || file.sample) return '';
    var id = clean(file.id);
    if (!id || isPlaceholder(id)) return '';
    var mime = clean(file.mimeType);
    if (mime === 'application/vnd.google-apps.folder') return '';
    if (mime === 'application/vnd.google-apps.document') {
      return 'https://docs.google.com/document/d/' + encodeURIComponent(id) + (edit ? '/edit?rm=minimal' : '/preview');
    }
    if (mime === 'application/vnd.google-apps.spreadsheet') {
      return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + (edit ? '/edit?rm=minimal' : '/preview');
    }
    if (mime === 'application/vnd.google-apps.presentation') {
      return 'https://docs.google.com/presentation/d/' + encodeURIComponent(id) + (edit ? '/edit?rm=minimal' : '/preview');
    }
    return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/preview';
  }

  function spreadsheetEmbedUrl(value) {
    var id = googleId(value);
    if (!id) return '';
    return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) + '/edit?rm=minimal';
  }

  function emptyData() {
    var data = {};
    SHEETS.forEach(function (sheet) { data[sheet.title] = []; });
    return data;
  }

  return {
    SHEETS: SHEETS,
    CHOICES: CHOICES,
    DOC_SPEC: DOC_SPEC,
    columnsOf: columnsOf,
    sheetByTitle: sheetByTitle,
    clean: clean,
    isPlaceholder: isPlaceholder,
    clientConfigured: clientConfigured,
    allowedDomain: allowedDomain,
    domainAllowed: domainAllowed,
    googleId: googleId,
    inquiryEndpoint: inquiryEndpoint,
    parseNumber: parseNumber,
    formatUSD: formatUSD,
    lineMath: lineMath,
    documentTotals: documentTotals,
    rowsFromValues: rowsFromValues,
    recordToCells: recordToCells,
    headersToAppend: headersToAppend,
    looksLikeEmail: looksLikeEmail,
    intakeFormUrl: intakeFormUrl,
    customerEmail: customerEmail,
    intakeComposeUrl: intakeComposeUrl,
    nextDocumentNumber: nextDocumentNumber,
    colLetter: colLetter,
    isoDate: isoDate,
    formatDay: formatDay,
    driveFileId: driveFileId,
    mimeHintFromDriveUrl: mimeHintFromDriveUrl,
    attachmentKind: attachmentKind,
    driveFileUrl: driveFileUrl,
    normalizeAttachment: normalizeAttachment,
    mergeAttachments: mergeAttachments,
    removeAttachment: removeAttachment,
    pickerApiKey: pickerApiKey,
    pickerAppId: pickerAppId,
    proposalSentDate: proposalSentDate,
    proposalDocLink: proposalDocLink,
    readProposal: readProposal,
    writeProposal: writeProposal,
    proposalQuoteGrid: proposalQuoteGrid,
    proposalView: proposalView,
    proposalDocName: proposalDocName,
    googleDocId: googleDocId,
    proposalComposeUrl: proposalComposeUrl,
    planProposalAcceptance: planProposalAcceptance,
    proposalOpeningRequests: proposalOpeningRequests,
    proposalClosingText: proposalClosingText,
    findProposalTable: findProposalTable,
    proposalFillRequests: proposalFillRequests,
    proposalPolishRequests: proposalPolishRequests,
    PROPOSAL_BRAND: PROPOSAL_BRAND,
    ACADEMY: ACADEMY,
    INVOICE_BRANDS: INVOICE_BRANDS,
    academyFieldsFromPost: academyFieldsFromPost,
    academyRequestRecord: academyRequestRecord,
    invoiceBrand: invoiceBrand,
    paymentLinkProblem: paymentLinkProblem,
    invoicePaymentUrl: invoicePaymentUrl,
    academyStudentError: academyStudentError,
    academySessionError: academySessionError,
    academyCalendarDraft: academyCalendarDraft,
    academySessionInvoice: academySessionInvoice,
    academyPackageInvoice: academyPackageInvoice,
    sampleBundle: sampleBundle,
    calendarEmbedUrl: calendarEmbedUrl,
    drivePreviewUrl: drivePreviewUrl,
    spreadsheetEmbedUrl: spreadsheetEmbedUrl,
    emptyData: emptyData
  };
});
