/* Run from the repo root: node portal/logic.test.js */
'use strict';

const assert = require('assert');
const lib = require('./logic.js');

function test(name, fn) {
  try {
    fn();
    console.log('ok  ' + name);
  } catch (err) {
    console.error('FAIL ' + name);
    throw err;
  }
}

test('client id placeholder is not configured', function () {
  assert.strictEqual(lib.clientConfigured({
    clientId: 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com'
  }), false);
  assert.strictEqual(lib.clientConfigured({ clientId: '' }), false);
  assert.strictEqual(lib.clientConfigured({
    clientId: '1234567890-abc.apps.googleusercontent.com'
  }), true);
  assert.strictEqual(lib.clientConfigured({
    clientId: 'not-a-client-id'
  }), false);
});

test('hosted domain must match and email suffix is not enough', function () {
  const domain = 'legacycomputingservices.com';
  assert.strictEqual(lib.domainAllowed({
    hd: 'LegacyComputingServices.com',
    email: 'scott@legacycomputingservices.com',
    email_verified: true
  }, domain), true);
  assert.strictEqual(lib.domainAllowed({
    email: 'someone@legacycomputingservices.com',
    email_verified: true
  }, domain), false);
  assert.strictEqual(lib.domainAllowed({
    hd: 'gmail.com',
    email: 'person@gmail.com',
    email_verified: true
  }, domain), false);
  assert.strictEqual(lib.domainAllowed({
    hd: domain,
    email: 'a@' + domain,
    email_verified: false
  }, domain), false);
  assert.strictEqual(lib.allowedDomain({ allowedDomain: '@legacycomputingservices.com' }), domain);
});

test('google ids can be pasted as urls', function () {
  assert.strictEqual(lib.googleId(''), '');
  assert.strictEqual(lib.googleId('YOUR_SPREADSHEET_ID'), '');
  assert.strictEqual(
    lib.googleId('https://docs.google.com/spreadsheets/d/abc123_XYZ-9/edit#gid=0'),
    'abc123_XYZ-9'
  );
  assert.strictEqual(
    lib.googleId('https://drive.google.com/drive/folders/FolderId_1'),
    'FolderId_1'
  );
  assert.strictEqual(lib.googleId('plainId_01'), 'plainId_01');
  assert.strictEqual(lib.googleId('not an id'), '');
});

test('inquiry webhook stays off unless it is an Apps Script exec url', function () {
  assert.deepStrictEqual(lib.inquiryEndpoint({ inquiriesWebhookUrl: '' }), { url: '', problem: '' });
  assert.deepStrictEqual(lib.inquiryEndpoint({
    inquiriesWebhookUrl: 'https://evil.example/exec'
  }).url, '');
  assert.ok(lib.inquiryEndpoint({ inquiriesWebhookUrl: 'https://evil.example/exec' }).problem);
  const good = 'https://script.google.com/macros/s/AKfycbx_test-ID/exec';
  assert.strictEqual(lib.inquiryEndpoint({ inquiriesWebhookUrl: good }).url, good);
  assert.strictEqual(lib.inquiryEndpoint({
    inquiriesWebhookUrl: 'http://script.google.com/macros/s/AKfycbx/exec'
  }).url, '');
});

test('totals never invent a price for a blank line', function () {
  const blank = lib.documentTotals([{ qty: '1', unitPrice: '' }], '');
  assert.strictEqual(blank.total, null);
  assert.strictEqual(blank.complete, false);
  assert.strictEqual(blank.missing, 1);

  const empty = lib.documentTotals([], '');
  assert.strictEqual(empty.empty, true);
  assert.strictEqual(empty.total, null);

  const priced = lib.documentTotals([{ qty: '2', unitPrice: '$25.00' }], '');
  assert.strictEqual(priced.total, 50);
  assert.strictEqual(priced.complete, true);
  assert.strictEqual(lib.formatUSD(priced.total), '$50.00');

  const taxed = lib.documentTotals([{ qty: '1', unitPrice: '10' }], '1.50');
  assert.strictEqual(taxed.total, 11.5);
  assert.strictEqual(lib.formatUSD(taxed.total), '$11.50');

  const zero = lib.documentTotals([{ qty: '1', unitPrice: '0' }], '');
  assert.strictEqual(zero.total, 0);
  assert.strictEqual(lib.formatUSD(0), '$0.00');

  assert.strictEqual(lib.parseNumber('abc'), null);
  assert.strictEqual(lib.parseNumber(''), null);
});

test('sheet rows follow header names, not column order', function () {
  const columns = lib.columnsOf('Customers');
  const parsed = lib.rowsFromValues([
    ['Name', 'ID', 'Notes'],
    ['Ada Example', 'c1', 'Sample'],
    ['', '', '']
  ], columns);
  assert.strictEqual(parsed.rows.length, 1);
  assert.strictEqual(parsed.rows[0].name, 'Ada Example');
  assert.strictEqual(parsed.rows[0].id, 'c1');
  assert.strictEqual(parsed.rows[0].email, '');
  assert.ok(parsed.missingHeaders.indexOf('Email') !== -1);
  assert.deepStrictEqual(
    lib.recordToCells({ id: 'c1', name: 'Ada Example', notes: 'Sample' }, parsed.headerRow, columns),
    ['Ada Example', 'c1', 'Sample']
  );
});

test('next number is blank until a numbered document exists', function () {
  assert.strictEqual(lib.nextDocumentNumber(['Q-SAMPLE', ''], 'Q'), '');
  assert.strictEqual(lib.nextDocumentNumber(['Q-2', 'Q-10', 'INV-3'], 'Q'), 'Q-11');
  assert.strictEqual(lib.nextDocumentNumber(['INV-3'], 'INV'), 'INV-4');
});

test('sample bundle is labeled and uses no live addresses', function () {
  const sample = lib.sampleBundle(new Date('2026-11-14T12:00:00'));
  const blobs = JSON.stringify(sample);
  assert.ok(/sample/i.test(blobs));
  assert.ok(!/legacycomputingservices\.com/.test(blobs));
  assert.ok(sample.Customers.every(function (row) { return /example\.test$/.test(row.email); }));
  assert.ok(sample.Quotes[0].notes.toLowerCase().indexOf('not a company price') !== -1);
  assert.strictEqual(sample.QuoteItems[0].unitPrice, '10');
  assert.ok(sample.files.every(function (file) { return !file.webViewLink; }));
  assert.ok(sample.events[0].summary.indexOf('SAMPLE') === 0);
});

test('calendar embed and in-page file previews', function () {
  assert.strictEqual(lib.calendarEmbedUrl('', { mode: 'WEEK' }), '');
  assert.strictEqual(lib.calendarEmbedUrl('YOUR_CALENDAR_ID', { mode: 'WEEK' }), '');
  const week = lib.calendarEmbedUrl('person@example.test', { mode: 'WEEK', timeZone: 'America/New_York' });
  assert.ok(week.indexOf('https://calendar.google.com/calendar/embed?') === 0);
  assert.ok(week.indexOf('src=' + encodeURIComponent('person@example.test')) !== -1);
  assert.ok(week.indexOf('ctz=' + encodeURIComponent('America/New_York')) !== -1);
  assert.ok(week.indexOf('mode=WEEK') !== -1);
  assert.ok(week.indexOf('bgcolor=0B131E') !== -1);
  assert.ok(lib.calendarEmbedUrl('person@example.test', { mode: 'AGENDA' }).indexOf('mode=AGENDA') !== -1);

  assert.strictEqual(
    lib.drivePreviewUrl({ id: 'file1', mimeType: 'application/pdf' }, false),
    'https://drive.google.com/file/d/file1/preview'
  );
  assert.strictEqual(
    lib.drivePreviewUrl({ id: 'doc1', mimeType: 'application/vnd.google-apps.document' }, false),
    'https://docs.google.com/document/d/doc1/preview'
  );
  assert.strictEqual(
    lib.drivePreviewUrl({ id: 'doc1', mimeType: 'application/vnd.google-apps.document' }, true),
    'https://docs.google.com/document/d/doc1/edit?rm=minimal'
  );
  assert.strictEqual(
    lib.drivePreviewUrl({ id: 'sheet1', mimeType: 'application/vnd.google-apps.spreadsheet' }, true),
    'https://docs.google.com/spreadsheets/d/sheet1/edit?rm=minimal'
  );
  assert.strictEqual(
    lib.drivePreviewUrl({ id: 'slides1', mimeType: 'application/vnd.google-apps.presentation' }, false),
    'https://docs.google.com/presentation/d/slides1/preview'
  );
  assert.strictEqual(lib.drivePreviewUrl({ id: 'folder1', mimeType: 'application/vnd.google-apps.folder' }, false), '');
  assert.strictEqual(lib.drivePreviewUrl({ id: 'x', sample: true, mimeType: 'application/pdf' }, false), '');
  assert.strictEqual(lib.spreadsheetEmbedUrl('abc_123'), 'https://docs.google.com/spreadsheets/d/abc_123/edit?rm=minimal');
  assert.strictEqual(lib.spreadsheetEmbedUrl(''), '');
});

test('intake form opens a gmail draft and can add a column', function () {
  const columns = lib.columnsOf('Tickets');
  assert.strictEqual(columns[columns.length - 1].header, 'Intake Sent');
  assert.strictEqual(columns[columns.length - 1].key, 'intakeSent');

  const parsed = lib.rowsFromValues([
    ['Issue', 'ID', 'Customer', 'Notes'],
    ['Fix the printer', 't1', 'Ada Example', 'Keep this']
  ], columns);
  assert.strictEqual(parsed.rows[0].issue, 'Fix the printer');
  assert.strictEqual(parsed.rows[0].intakeSent, '');
  assert.ok(parsed.missingHeaders.indexOf('Intake Sent') !== -1);
  assert.strictEqual(parsed.rows[0].notes, 'Keep this');

  const withDate = lib.rowsFromValues([
    ['ID', 'Customer', 'Issue', 'Intake Sent', 'Extra'],
    ['t1', 'Ada Example', 'Fix the printer', '2026-11-15', 'leave me']
  ], columns);
  assert.strictEqual(withDate.rows[0].intakeSent, '2026-11-15');
  withDate.rows[0].issue = 'Fix the printer drawer';
  assert.deepStrictEqual(
    lib.recordToCells(withDate.rows[0], withDate.headerRow, columns),
    ['t1', 'Ada Example', 'Fix the printer drawer', '2026-11-15', 'leave me']
  );

  const oldHeader = ['ID', 'Created', 'Updated', 'Customer', 'Issue', 'Status', 'Priority', 'Assigned to', 'Opened', 'Due', 'Notes'];
  const plan = lib.headersToAppend(oldHeader, columns);
  assert.deepStrictEqual(plan.headers, ['Intake Sent']);
  assert.strictEqual(plan.startColumn, 12);
  const again = lib.headersToAppend(withDate.headerRow, columns);
  assert.ok(again.headers.indexOf('Intake Sent') === -1);
  assert.ok(again.headers.indexOf('Created') !== -1);
  assert.deepStrictEqual(
    lib.headersToAppend(oldHeader.concat(['Intake Sent']), columns).headers,
    []
  );

  assert.strictEqual(lib.customerEmail([
    { name: 'Ada Example', email: '' },
    { name: 'Ada Example', email: 'ada.example@example.test' }
  ], ' ada example '), 'ada.example@example.test');
  assert.strictEqual(lib.customerEmail([{ name: 'Ada Example', email: 'not-an-email' }], 'Ada Example'), '');
  assert.strictEqual(lib.customerEmail([{ name: 'Ben Sample', email: 'ben.sample@example.test' }], 'Ada Example'), '');

  const form = 'https://docs.google.com/forms/d/e/1FAIpQLSdlt6J9Ew889ZO0dq4z6yzTrxb1FSuutsxvAiVGYX-5679tSQ/viewform';
  assert.strictEqual(lib.intakeFormUrl({ intakeFormUrl: form + '?entry.123=no&usp=sf_link' }), form);
  assert.strictEqual(lib.intakeFormUrl({ intakeFormUrl: '' }), '');
  assert.strictEqual(lib.intakeFormUrl({ intakeFormUrl: 'YOUR_INTAKE_FORM_URL' }), '');
  assert.strictEqual(lib.intakeFormUrl({ intakeFormUrl: 'https://evil.example/viewform' }), '');

  const url = lib.intakeComposeUrl({ intakeFormUrl: form + '?entry.999=hidden' }, 'ada.example@example.test');
  const parsedUrl = new URL(url);
  assert.strictEqual(parsedUrl.origin + parsedUrl.pathname, 'https://mail.google.com/mail/');
  assert.strictEqual(parsedUrl.searchParams.get('view'), 'cm');
  assert.strictEqual(parsedUrl.searchParams.get('fs'), '1');
  assert.strictEqual(parsedUrl.searchParams.get('to'), 'ada.example@example.test');
  assert.strictEqual(
    parsedUrl.searchParams.get('su'),
    'Legacy Computing Services \u2013 Client Intake & Service Agreement'
  );
  const body = parsedUrl.searchParams.get('body');
  assert.ok(body.indexOf('Before we begin work') !== -1);
  assert.ok(body.indexOf('client intake and service agreement') !== -1);
  assert.ok(body.indexOf(form) !== -1);
  assert.ok(body.indexOf('Legacy Computing Services') !== -1);
  assert.ok(body.indexOf('scott@legacycomputingservices.com') !== -1);
  assert.strictEqual(body.indexOf('entry.'), -1);
  assert.strictEqual(url.indexOf('entry.'), -1);
  assert.strictEqual(lib.intakeComposeUrl({ intakeFormUrl: form }, 'not-an-email'), '');
  assert.strictEqual(lib.intakeComposeUrl({ intakeFormUrl: '' }, 'ada.example@example.test'), '');

  const sample = lib.sampleBundle(new Date('2026-11-14T12:00:00'));
  assert.ok(sample.Tickets.some(function (row) { return row.intakeSent; }));
  assert.ok(sample.Tickets.some(function (row) { return !row.intakeSent; }));
});

test('proposals sheet is appended and existing tabs stay put', function () {
  const titles = lib.SHEETS.map(function (sheet) { return sheet.title; });
  assert.deepStrictEqual(titles.slice(0, 7), [
    'Tickets', 'Customers', 'Inquiries', 'Quotes', 'QuoteItems', 'Invoices', 'InvoiceItems'
  ]);
  assert.strictEqual(titles[titles.length - 1], 'Proposals');
  const headers = lib.columnsOf('Proposals').map(function (col) { return col.header; });
  assert.deepStrictEqual(headers, [
    'ID', 'Prospect name', 'Business', 'Email', 'Phone', 'Title', 'Status',
    'Created', 'Sent', 'Expires', 'Total', 'Doc URL', 'Notes',
    'Sections', 'Line items', 'Customer ID', 'Job ID'
  ]);
  assert.deepStrictEqual(lib.CHOICES.proposalStatus, ['Draft', 'Sent', 'Accepted', 'Declined']);
  const tickets = lib.columnsOf('Tickets').map(function (col) { return col.header; });
  assert.strictEqual(tickets[tickets.length - 1], 'Intake Sent');
  assert.ok(tickets.indexOf('Sections') === -1);
});

test('proposal json round trip does not invent a total', function () {
  const written = lib.writeProposal({
    id: 'p1',
    prospectName: 'Pat Preview',
    business: 'Sample Bakery',
    email: 'pat.preview@example.test',
    phone: '(410) 555-0142',
    title: 'SAMPLE: website refresh',
    status: 'Draft',
    expires: '2026-12-01',
    overview: 'A fake overview',
    scope: 'One page\nA form',
    timeline: 'Two weeks',
    terms: 'Pay on completion',
    notes: 'Internal only',
    lines: [
      { description: 'Sample page', qty: '2', unitPrice: '25' },
      { description: 'Blank price', qty: '1', unitPrice: '' }
    ]
  });
  assert.strictEqual(written.total, '');
  const again = lib.readProposal(written);
  assert.strictEqual(again.overview, 'A fake overview');
  assert.strictEqual(again.scope, 'One page\nA form');
  assert.strictEqual(again.lines.length, 2);
  assert.strictEqual(again.sectionsOk, true);
  assert.strictEqual(again.linesOk, true);

  const priced = lib.writeProposal({
    prospectName: 'Pat Preview',
    title: 'Priced',
    lines: [{ description: 'Visit', qty: '1', unitPrice: '10' }]
  });
  assert.strictEqual(priced.total, '10');
  assert.strictEqual(lib.proposalQuoteGrid(again.lines).rows[0][0], 'Description');
  assert.strictEqual(lib.proposalQuoteGrid([{ description: 'Visit', qty: '1', unitPrice: '10' }]).totals.total, 10);

  const broken = lib.readProposal({ sections: '{', lineItems: '{"no":"array"}', prospectName: 'Pat' });
  assert.strictEqual(broken.sectionsOk, false);
  assert.strictEqual(broken.linesOk, false);
  assert.strictEqual(broken.overview, '');
  const kept = lib.writeProposal(Object.assign({}, broken, { keepBrokenSections: true, keepBrokenLines: true }));
  assert.strictEqual(kept.sections, '{');
  assert.strictEqual(kept.lineItems, '{"no":"array"}');
});

test('accepting a proposal makes a customer and a job once', function () {
  const proposal = lib.writeProposal({
    id: 'sample-proposal-1',
    prospectName: 'Pat Preview',
    business: 'Sample Bakery',
    email: 'ada.example@example.test',
    title: 'SAMPLE: website refresh',
    overview: 'SAMPLE overview',
    lines: [{ description: 'Visit', qty: '1', unitPrice: '10' }]
  });
  const customers = [{ id: 'c1', name: 'Ada Example', email: 'ada.example@example.test', company: 'Sample Bakery' }];
  const first = lib.planProposalAcceptance(proposal, customers, []);
  assert.strictEqual(first.error, '');
  assert.strictEqual(first.creatingCustomer, false);
  assert.strictEqual(first.customer.id, 'c1');
  assert.strictEqual(first.creatingTicket, true);
  assert.strictEqual(first.ticket.customer, 'Ada Example');
  assert.strictEqual(first.ticket.status, 'Open');
  assert.strictEqual(first.ticket.priority, 'Normal');
  assert.ok(first.ticket.notes.indexOf('sample-proposal-1') !== -1);
  assert.strictEqual(first.proposal.status, 'Accepted');
  assert.strictEqual(first.proposal.customerId, 'c1');

  const savedTicket = Object.assign({ id: 't9' }, first.ticket);
  const savedProposal = Object.assign({}, proposal, { customerId: 'c1', jobId: 't9', status: 'Accepted' });
  const second = lib.planProposalAcceptance(savedProposal, customers, [savedTicket]);
  assert.strictEqual(second.creatingCustomer, false);
  assert.strictEqual(second.creatingTicket, false);
  assert.strictEqual(second.ticket.id, 't9');

  const fresh = lib.planProposalAcceptance(lib.writeProposal({
    id: 'p-new',
    prospectName: 'New Person',
    email: 'new.person@example.test',
    business: 'Sample Shop',
    title: 'SAMPLE: new work',
    phone: '(410) 555-0199'
  }), [], []);
  assert.strictEqual(fresh.creatingCustomer, true);
  assert.strictEqual(fresh.customer.name, 'New Person');
  assert.strictEqual(fresh.customer.email, 'new.person@example.test');
  assert.strictEqual(fresh.customer.company, 'Sample Shop');
  assert.strictEqual(fresh.ticket.issue, 'SAMPLE: new work');
  assert.strictEqual(lib.planProposalAcceptance({ prospectName: '' }, [], []).error.length > 0, true);
});

test('proposal doc requests carry the shield, brand line, and quote table', function () {
  const record = lib.writeProposal({
    prospectName: 'Pat Preview',
    business: 'Sample Bakery',
    email: 'pat.preview@example.test',
    phone: '(410) 555-0142',
    title: 'SAMPLE: website refresh',
    created: '2026-11-15',
    expires: '2026-11-29',
    overview: 'SAMPLE overview for a fake website refresh.',
    scope: 'SAMPLE: one new page',
    timeline: 'SAMPLE: two weeks after approval.',
    terms: 'SAMPLE terms. Not a real agreement.',
    lines: [
      { description: 'Sample page (not a real price)', qty: '2', unitPrice: '25' },
      { description: 'Sample visit (not a real price)', qty: '1', unitPrice: '10' }
    ]
  });
  const view = lib.proposalView(record);
  assert.strictEqual(view.grid.totals.total, 60);
  const opening = lib.proposalOpeningRequests(view);
  const image = opening.requests.filter(function (req) { return req.insertInlineImage; })[0];
  assert.ok(image);
  assert.strictEqual(image.insertInlineImage.uri, lib.PROPOSAL_BRAND.logoUrl);
  assert.strictEqual(
    image.insertInlineImage.uri,
    'https://legacycomputingservices.com/assets/legacy-computing-shield.png'
  );
  const text = opening.requests.filter(function (req) { return req.insertText; }).map(function (req) {
    return req.insertText.text;
  }).join('');
  assert.ok(text.indexOf('Legacy Computing Services LLC') !== -1);
  assert.ok(text.indexOf("Protecting what matters. Building what's next.") !== -1);
  assert.ok(text.indexOf('Bel Air, MD | scott@legacycomputingservices.com | legacycomputingservices.com') !== -1);
  assert.ok(text.indexOf('Prepared for') !== -1);
  assert.ok(text.indexOf('Pat Preview') !== -1);
  assert.ok(text.indexOf('OVERVIEW') !== -1);
  assert.ok(text.indexOf('SAMPLE overview for a fake website refresh.') !== -1);
  assert.ok(text.indexOf('SCOPE & DELIVERABLES') !== -1);
  assert.ok(text.indexOf('TIMELINE') !== -1);
  assert.ok(text.indexOf('QUOTE') !== -1);
  assert.ok(text.indexOf('Valid until:') !== -1);
  const table = opening.requests.filter(function (req) { return req.insertTable; })[0];
  assert.strictEqual(table.insertTable.rows, view.grid.rows.length);
  assert.strictEqual(table.insertTable.columns, 4);
  assert.strictEqual(table.insertTable.location.index, opening.tableIndex);
  const closing = lib.proposalClosingText(view);
  assert.ok(closing.indexOf('TERMS') !== -1);
  assert.ok(closing.indexOf('SAMPLE terms. Not a real agreement.') !== -1);
  assert.ok(closing.indexOf('ACCEPTANCE') !== -1);
  assert.ok(closing.indexOf('Client signature:') !== -1);
  assert.ok(closing.indexOf('Pat Preview') !== -1);
  assert.strictEqual(lib.proposalDocName(record), 'Proposal — SAMPLE: website refresh — Pat Preview');

  const doc = {
    body: {
      content: [
        { startIndex: 1, endIndex: 8, paragraph: { elements: [{ startIndex: 1, endIndex: 8, textRun: { content: 'QUOTE\n' } }] } },
        {
          startIndex: 8,
          endIndex: 30,
          table: {
            rows: 2,
            columns: 2,
            tableRows: [
              {
                tableCells: [
                  { startIndex: 10, content: [{ startIndex: 11, endIndex: 12, paragraph: { elements: [{ textRun: { content: '\n' } }] } }] },
                  { startIndex: 14, content: [{ startIndex: 15, endIndex: 16, paragraph: { elements: [{ textRun: { content: '\n' } }] } }] }
                ]
              },
              {
                tableCells: [
                  { startIndex: 18, content: [{ startIndex: 19, endIndex: 20, paragraph: { elements: [{ textRun: { content: '\n' } }] } }] },
                  { startIndex: 22, content: [{ startIndex: 23, endIndex: 24, paragraph: { elements: [{ textRun: { content: '\n' } }] } }] }
                ]
              }
            ]
          }
        },
        { startIndex: 30, endIndex: 31, paragraph: { elements: [{ startIndex: 30, endIndex: 31, textRun: { content: '\n' } }] } }
      ]
    }
  };
  const fills = lib.proposalFillRequests(doc, [['Description', 'Qty'], ['Total', '$10.00']], closing);
  assert.ok(fills.length >= 5);
  const indexes = fills.map(function (req) { return req.insertText.location.index; });
  const sorted = indexes.slice().sort(function (a, b) { return b - a; });
  assert.deepStrictEqual(indexes, sorted);
  assert.strictEqual(fills[0].insertText.location.index, 30);
  assert.ok(fills[0].insertText.text.indexOf('TERMS') !== -1);
  assert.strictEqual(fills[fills.length - 1].insertText.text, 'Description');

  const polishDoc = {
    body: {
      content: [
        { startIndex: 1, endIndex: 8, paragraph: { elements: [{ startIndex: 1, endIndex: 7, textRun: { content: 'TERMS\n' } }] } },
        {
          startIndex: 8,
          endIndex: 20,
          table: {
            tableRows: [
              {
                tableCells: [
                  { content: [{ startIndex: 10, endIndex: 22, paragraph: { elements: [{ textRun: { content: 'Description\n' } }] } }] },
                  { content: [{ startIndex: 24, endIndex: 28, paragraph: { elements: [{ textRun: { content: 'Qty\n' } }] } }] }
                ]
              },
              {
                tableCells: [
                  { content: [{ startIndex: 30, endIndex: 36, paragraph: { elements: [{ textRun: { content: 'Total\n' } }] } }] },
                  { content: [{ startIndex: 38, endIndex: 44, paragraph: { elements: [{ textRun: { content: '$10.00\n' } }] } }] }
                ]
              }
            ]
          }
        }
      ]
    }
  };
  const polish = lib.proposalPolishRequests(polishDoc);
  const headerBg = polish.filter(function (req) {
    return req.updateTableCellStyle && req.updateTableCellStyle.tableCellStyle.backgroundColor;
  })[0];
  assert.ok(headerBg);
  assert.deepStrictEqual(
    headerBg.updateTableCellStyle.tableCellStyle.backgroundColor.color.rgbColor,
    lib.PROPOSAL_BRAND.navy
  );
  const terms = polish.filter(function (req) {
    return req.updateParagraphStyle && req.updateParagraphStyle.paragraphStyle.namedStyleType === 'HEADING_2';
  });
  assert.ok(terms.length >= 1);
});

test('proposal send opens a gmail draft and sample rows stay fake', function () {
  const record = lib.writeProposal({
    prospectName: 'Pat Preview',
    email: 'pat.preview@example.test',
    title: 'SAMPLE: website refresh',
    expires: '2026-11-29',
    docUrl: 'https://docs.google.com/document/d/sample-proposal/edit'
  });
  const url = lib.proposalComposeUrl(record);
  const parsed = new URL(url);
  assert.strictEqual(parsed.origin + parsed.pathname, 'https://mail.google.com/mail/');
  assert.strictEqual(parsed.searchParams.get('view'), 'cm');
  assert.strictEqual(parsed.searchParams.get('fs'), '1');
  assert.strictEqual(parsed.searchParams.get('to'), 'pat.preview@example.test');
  assert.strictEqual(parsed.searchParams.get('su'), 'Proposal: SAMPLE: website refresh');
  const body = parsed.searchParams.get('body');
  assert.ok(body.indexOf('https://docs.google.com/document/d/sample-proposal/edit') !== -1);
  assert.ok(body.indexOf('Hello Pat,') !== -1);
  assert.ok(body.indexOf('Nov 29, 2026') !== -1);
  assert.ok(body.indexOf('scott@legacycomputingservices.com') !== -1);
  assert.strictEqual(lib.proposalComposeUrl(Object.assign({}, record, { email: 'nope' })), '');
  assert.strictEqual(lib.proposalComposeUrl(Object.assign({}, record, { docUrl: '' })), '');
  assert.strictEqual(lib.googleDocId(record.docUrl), 'sample-proposal');
  assert.strictEqual(lib.googleDocId('https://example.com/not-a-doc'), '');

  const sample = lib.sampleBundle(new Date('2026-11-14T12:00:00'));
  assert.strictEqual(sample.Proposals.length, 2);
  assert.ok(sample.Proposals.every(function (row) { return /example\.test$/.test(row.email); }));
  assert.ok(sample.Proposals.every(function (row) { return row.sample && /sample/i.test(row.notes); }));
  const blobs = JSON.stringify(sample);
  assert.ok(!/legacycomputingservices\.com/.test(blobs));
  const parsedSample = lib.readProposal(sample.Proposals[0]);
  assert.strictEqual(parsedSample.lines.length, 2);
  assert.strictEqual(parsedSample.status, 'Draft');
  assert.strictEqual(sample.Proposals[1].status, 'Sent');
  assert.ok(sample.Proposals[1].docUrl.indexOf('docs.google.com/document') !== -1);
});

console.log('all logic tests passed');
