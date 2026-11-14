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
        ['notes', 'Notes']
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
        ['notes', 'Notes']
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
    }
  ];

  var CHOICES = {
    ticketStatus: ['Open', 'In progress', 'Waiting on customer', 'Done'],
    priority: ['Low', 'Normal', 'High', 'Urgent'],
    inquiryStatus: ['New', 'Reviewed', 'Replied', 'Closed'],
    quoteStatus: ['Draft', 'Sent', 'Accepted', 'Declined'],
    invoiceStatus: ['Draft', 'Sent', 'Paid', 'Void']
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
      columns.forEach(function (col) {
        var at = index[col.header.toLowerCase()];
        record[col.key] = at == null || raw[at] == null ? '' : String(raw[at]);
      });
      rows.push(record);
    }
    return { rows: rows, missingHeaders: missingHeaders, headerRow: headerRow };
  }

  function recordToCells(record, headerRow, columns) {
    return headerRow.map(function (header) {
      var match = null;
      for (var i = 0; i < columns.length; i++) {
        if (columns[i].header.toLowerCase() === String(header).trim().toLowerCase()) {
          match = columns[i];
          break;
        }
      }
      if (!match) return '';
      var value = record[match.key];
      return value == null ? '' : String(value);
    });
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
    nextDocumentNumber: nextDocumentNumber,
    colLetter: colLetter,
    isoDate: isoDate,
    sampleBundle: sampleBundle,
    calendarEmbedUrl: calendarEmbedUrl,
    drivePreviewUrl: drivePreviewUrl,
    spreadsheetEmbedUrl: spreadsheetEmbedUrl,
    emptyData: emptyData
  };
});
