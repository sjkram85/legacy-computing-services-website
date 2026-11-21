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
  assert.strictEqual(titles[7], 'Proposals');
  assert.deepStrictEqual(titles.slice(8), ['Academy Students', 'Academy Requests', 'Academy Sessions']);
  const headers = lib.columnsOf('Proposals').map(function (col) { return col.header; });
  assert.deepStrictEqual(headers, [
    'ID', 'Prospect name', 'Business', 'Email', 'Phone', 'Title', 'Status',
    'Created', 'Sent', 'Expires', 'Total', 'Doc URL', 'Notes',
    'Sections', 'Line items', 'Customer ID', 'Job ID', 'Attachments'
  ]);
  const oldHeader = headers.filter(function (name) { return name !== 'Attachments'; });
  const oldRow = oldHeader.map(function () { return ''; });
  oldRow[0] = 'p1';
  oldRow[1] = 'Pat Preview';
  const parsedOld = lib.rowsFromValues([oldHeader, oldRow], lib.columnsOf('Proposals'));
  assert.deepStrictEqual(parsedOld.missingHeaders, ['Attachments']);
  assert.strictEqual(parsedOld.rows[0].prospectName, 'Pat Preview');
  assert.deepStrictEqual(lib.readProposal(parsedOld.rows[0]).attachments, []);
  const plan = lib.headersToAppend(parsedOld.headerRow, lib.columnsOf('Proposals'));
  assert.deepStrictEqual(plan.headers, ['Attachments']);
  assert.strictEqual(plan.startColumn, oldHeader.length + 1);
  const withFile = lib.writeProposal(Object.assign({}, lib.readProposal(parsedOld.rows[0]), {
    attachments: [{
      id: 'fileAbcdef123456',
      name: 'Quote PDF',
      mimeType: 'application/pdf',
      url: 'https://drive.google.com/file/d/fileAbcdef123456/view'
    }]
  }));
  const newHeader = oldHeader.concat(['Attachments']);
  const cells = lib.recordToCells(withFile, newHeader, lib.columnsOf('Proposals'));
  assert.strictEqual(cells.length, newHeader.length);
  assert.strictEqual(cells[1], 'Pat Preview');
  assert.strictEqual(JSON.parse(cells[cells.length - 1])[0].name, 'Quote PDF');
  const unchanged = lib.recordToCells(withFile, oldHeader, lib.columnsOf('Proposals'));
  assert.strictEqual(unchanged.length, oldHeader.length);
  assert.strictEqual(unchanged[1], 'Pat Preview');
  assert.strictEqual(unchanged.indexOf(withFile.attachments), -1);
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
  assert.strictEqual(sample.Proposals.length, 3);
  assert.ok(sample.Proposals.every(function (row) { return /example\.test$/.test(row.email); }));
  assert.ok(sample.Proposals.every(function (row) { return row.sample && /sample/i.test(row.notes); }));
  const blobs = JSON.stringify(sample);
  assert.ok(!/legacycomputingservices\.com/.test(blobs));
  const parsedSample = lib.readProposal(sample.Proposals[0]);
  assert.strictEqual(parsedSample.lines.length, 2);
  assert.strictEqual(parsedSample.status, 'Draft');
  assert.strictEqual(sample.Proposals[1].status, 'Sent');
  assert.ok(sample.Proposals[1].docUrl.indexOf('docs.google.com/document') !== -1);
  const linked = lib.readProposal(sample.Proposals[2]);
  assert.strictEqual(linked.status, 'Sent');
  assert.strictEqual(linked.lines.length, 0);
  assert.strictEqual(linked.docUrl, '');
  assert.strictEqual(linked.attachments.length, 2);
  assert.strictEqual(linked.attachments[0].mimeType, 'application/pdf');
  assert.strictEqual(lib.attachmentKind(linked.attachments[0].mimeType), 'PDF');
  assert.strictEqual(lib.attachmentKind(linked.attachments[1].mimeType), 'Google Doc');
});

test('drive attachments round trip and the send draft includes their links', function () {
  assert.strictEqual(lib.driveFileId('https://drive.google.com/file/d/abcDEF_123-xyz/view?usp=sharing'), 'abcDEF_123-xyz');
  assert.strictEqual(lib.driveFileId('https://docs.google.com/document/d/docId1234567890/edit'), 'docId1234567890');
  assert.strictEqual(lib.driveFileId('https://docs.google.com/spreadsheets/d/sheetId123456789/edit#gid=0'), 'sheetId123456789');
  assert.strictEqual(lib.driveFileId('https://drive.google.com/drive/folders/folderId12345678'), 'folderId12345678');
  assert.strictEqual(lib.driveFileId('https://drive.google.com/open?id=openId1234567890'), 'openId1234567890');
  assert.strictEqual(lib.driveFileId('bareId1234567890'), 'bareId1234567890');
  assert.strictEqual(lib.driveFileId('https://example.com/not-a-file'), '');
  assert.strictEqual(lib.driveFileId('short'), '');
  assert.strictEqual(lib.driveFileId('YOUR_FILE_ID'), '');
  assert.strictEqual(lib.mimeHintFromDriveUrl('https://docs.google.com/document/d/docId1234567890/edit'), 'application/vnd.google-apps.document');
  assert.strictEqual(lib.pickerApiKey({}), '');
  assert.strictEqual(lib.pickerApiKey({ pickerApiKey: '  ' }), '');
  assert.strictEqual(lib.pickerApiKey({ pickerApiKey: 'YOUR_PICKER_API_KEY' }), '');
  assert.strictEqual(lib.pickerApiKey({ pickerApiKey: 'AIzaExampleKey' }), 'AIzaExampleKey');
  assert.strictEqual(lib.pickerAppId('530425506690-abc.apps.googleusercontent.com'), '530425506690');
  assert.strictEqual(lib.pickerAppId('not-a-client'), '');
  assert.strictEqual(lib.proposalSentDate('Sent', '', '2026-11-01'), '2026-11-01');
  assert.strictEqual(lib.proposalSentDate('Sent', '2026-10-02', '2026-11-01'), '2026-10-02');
  assert.strictEqual(lib.proposalSentDate('Draft', '', '2026-11-01'), '');

  const pdf = lib.normalizeAttachment({
    url: 'https://drive.google.com/file/d/fileOne12345678/view'
  });
  assert.strictEqual(pdf.id, 'fileOne12345678');
  assert.strictEqual(pdf.name, 'Drive file');
  assert.strictEqual(pdf.url, 'https://drive.google.com/file/d/fileOne12345678/view');
  const doc = lib.normalizeAttachment({
    id: 'fileTwo12345678',
    name: 'Scope notes',
    mimeType: 'application/vnd.google-apps.document'
  });
  assert.strictEqual(doc.url, 'https://docs.google.com/document/d/fileTwo12345678/edit');
  const merged = lib.mergeAttachments([pdf], [pdf, doc]);
  assert.strictEqual(merged.length, 2);
  assert.strictEqual(merged[0].name, 'Drive file');
  assert.strictEqual(lib.removeAttachment(merged, 'https://drive.google.com/file/d/fileOne12345678/view').length, 1);
  assert.strictEqual(lib.removeAttachment(merged, 'fileOne12345678')[0].id, 'fileTwo12345678');

  const written = lib.writeProposal({
    prospectName: 'Riley Sample',
    business: 'Sample Hardware',
    email: 'riley.sample@example.test',
    status: 'Sent',
    sent: '2026-11-01',
    attachments: [pdf, doc],
    lines: []
  });
  assert.strictEqual(written.title, '');
  assert.strictEqual(written.total, '');
  assert.strictEqual(written.lineItems, '[]');
  assert.strictEqual(written.docUrl, '');
  assert.strictEqual(written.status, 'Sent');
  assert.strictEqual(written.sent, '2026-11-01');
  const again = lib.readProposal(written);
  assert.strictEqual(again.attachmentsOk, true);
  assert.strictEqual(again.attachments.length, 2);
  assert.strictEqual(again.attachments[1].name, 'Scope notes');
  const url = lib.proposalComposeUrl(again);
  const body = new URL(url).searchParams.get('body');
  assert.ok(body.indexOf('https://drive.google.com/file/d/fileOne12345678/view') !== -1);
  assert.ok(body.indexOf('Scope notes: https://docs.google.com/document/d/fileTwo12345678/edit') !== -1);
  assert.ok(body.indexOf('Hello Riley,') !== -1);
  assert.strictEqual(body.indexOf('docs.google.com/document/d/sample-proposal'), -1);

  const withDoc = lib.proposalComposeUrl(lib.writeProposal({
    email: 'riley.sample@example.test',
    title: 'SAMPLE: already sent',
    docUrl: 'https://docs.google.com/document/d/sample-proposal/edit',
    attachments: [pdf]
  }));
  const both = new URL(withDoc).searchParams.get('body');
  assert.ok(both.indexOf('https://docs.google.com/document/d/sample-proposal/edit') !== -1);
  assert.ok(both.indexOf('https://drive.google.com/file/d/fileOne12345678/view') !== -1);

  const broken = lib.readProposal({ attachments: '{', prospectName: 'Riley Sample', email: 'riley.sample@example.test' });
  assert.strictEqual(broken.attachmentsOk, false);
  assert.deepStrictEqual(broken.attachments, []);
  const kept = lib.writeProposal(Object.assign({}, broken, { keepBrokenAttachments: true }));
  assert.strictEqual(kept.attachments, '{');
  assert.strictEqual(lib.proposalComposeUrl(kept), '');
});

test('academy sheets append and old invoice headers stay in front', function () {
  const invoiceHeaders = lib.columnsOf('Invoices').map(function (col) { return col.header; });
  assert.deepStrictEqual(invoiceHeaders.slice(0, 11), [
    'ID', 'Number', 'Created', 'Updated', 'Customer', 'Status', 'Issued', 'Due', 'Quote number', 'Tax', 'Notes'
  ]);
  assert.deepStrictEqual(invoiceHeaders.slice(11), ['Business', 'Payment link', 'Session ID', 'Package']);
  const old = ['ID', 'Number', 'Created', 'Updated', 'Customer', 'Status', 'Issued', 'Due', 'Quote number', 'Tax', 'Notes'];
  const plan = lib.headersToAppend(old, lib.columnsOf('Invoices'));
  assert.deepStrictEqual(plan.headers, ['Business', 'Payment link', 'Session ID', 'Package']);
  assert.strictEqual(plan.startColumn, 12);
  const studentHeaders = lib.columnsOf('Academy Students').map(function (col) { return col.header; });
  assert.ok(studentHeaders.indexOf('Parent/guardian') !== -1);
  assert.ok(studentHeaders.indexOf('Age group') !== -1);
  assert.deepStrictEqual(lib.CHOICES.ageGroup, ['Youth', 'Adult', 'Senior']);
  assert.deepStrictEqual(lib.CHOICES.sessionStatus, ['Requested', 'Confirmed', 'Completed', 'Cancelled']);
  const fs = require('fs');
  const path = require('path');
  const gs = fs.readFileSync(path.join(__dirname, '../apps-script/academy.gs'), 'utf8');
  lib.columnsOf('Academy Requests').forEach(function (col) {
    assert.ok(gs.indexOf("'" + col.header + "'") !== -1, col.header);
  });
  assert.ok(gs.indexOf('SPREADSHEET_ID') !== -1);
  assert.ok(!/AKfycb|ya29\.|client_secret/i.test(gs));
});

test('academy intake accepts json and form posts and drops the honeypot', function () {
  const payload = {
    form: 'booking',
    name: 'Casey Preview',
    email: 'casey.preview@example.test',
    phone: '410-555-0100',
    ageGroup: 'youth',
    program: 'Youth program',
    preferredTimes: 'Tuesdays after 4',
    goals: 'Learn a hook',
    message: 'Looking for a coach',
    source: 'legacy-bowling-academy',
    website: ''
  };
  const fromJson = lib.academyRequestRecord(lib.academyFieldsFromPost({ body: JSON.stringify(payload) }));
  assert.strictEqual(fromJson.ok, true);
  assert.strictEqual(fromJson.record.form, 'booking');
  assert.strictEqual(fromJson.record.ageGroup, 'Youth');
  assert.strictEqual(fromJson.record.source, 'legacy-bowling-academy');
  assert.strictEqual(fromJson.record.status, 'New');
  const encoded = 'form=inquiry&name=Casey+Preview&email=casey.preview%40example.test&phone=410-555-0100&ageGroup=adult&program=League&preferredTimes=Saturdays&goals=Spare+shooting&message=Hello&source=legacy-bowling-academy&website=';
  const fromForm = lib.academyRequestRecord(lib.academyFieldsFromPost({ body: encoded }));
  assert.strictEqual(fromForm.record.form, 'inquiry');
  assert.strictEqual(fromForm.record.ageGroup, 'Adult');
  assert.strictEqual(fromForm.record.email, 'casey.preview@example.test');
  const wrapped = lib.academyRequestRecord(lib.academyFieldsFromPost({
    fields: { payload: JSON.stringify(payload) }
  }));
  assert.strictEqual(wrapped.record.name, 'Casey Preview');
  const honeypot = lib.academyRequestRecord(lib.academyFieldsFromPost({
    body: JSON.stringify(Object.assign({}, payload, { website: '' })),
    fields: { website: 'https://spam.example' }
  }));
  assert.strictEqual(honeypot.ok, true);
  assert.strictEqual(honeypot.ignored, true);
  assert.strictEqual(lib.academyRequestRecord({ form: 'other', name: 'A', email: 'a@b.c' }).ok, false);
  assert.strictEqual(lib.academyRequestRecord({ form: 'booking', name: '', email: 'a@b.c' }).ok, false);
});

test('academy invoices reuse the invoice feature and do not invent a price', function () {
  assert.strictEqual(lib.invoiceBrand('').title, 'Legacy Computing Services LLC');
  assert.strictEqual(lib.invoiceBrand('Legacy Computing Services').academy, false);
  assert.ok(lib.invoiceBrand('').title.indexOf('Bowling') === -1);
  const academyBrand = lib.invoiceBrand('Legacy Bowling Academy');
  assert.strictEqual(academyBrand.title, 'Legacy Bowling Academy, a DBA of Legacy Computing Services, LLC');
  assert.ok(academyBrand.lines.indexOf('Make payments to Legacy Computing Services, LLC') !== -1);
  assert.ok(lib.invoiceBrand('').lines.indexOf('Make payments to Legacy Computing Services, LLC') === -1);
  assert.strictEqual(lib.invoicePaymentUrl(
    { paymentLink: 'https://bowling.example/pay' },
    { paymentUrl: 'https://pay.example/lcs' }
  ), 'https://pay.example/lcs');
  assert.strictEqual(lib.invoicePaymentUrl({ paymentLink: 'https://pay.example/lcs' }, {}), 'https://pay.example/lcs');
  assert.strictEqual(lib.invoicePaymentUrl({ paymentLink: '' }, { paymentUrl: '' }), '');
  assert.strictEqual(lib.invoicePaymentUrl({ brand: 'Legacy Bowling Academy', paymentLink: '' }, {}), '');
  const session = {
    id: 'sess-1',
    student: 'Riley Sample',
    kind: 'Private lesson',
    status: 'Completed',
    date: '2026-11-21',
    start: '16:00',
    end: '17:00',
    coach: 'Sample Coach',
    location: 'Forest Hill Lanes'
  };
  const draft = lib.academySessionInvoice(session);
  assert.strictEqual(draft.brand, 'Legacy Bowling Academy');
  assert.strictEqual(draft.customer, 'Riley Sample');
  assert.strictEqual(draft.sessionId, 'sess-1');
  assert.strictEqual(draft.paymentLink, '');
  assert.strictEqual(draft.lines.length, 1);
  assert.strictEqual(draft.lines[0].qty, '1');
  assert.strictEqual(draft.lines[0].unitPrice, '');
  assert.ok(draft.lines[0].description.indexOf('Forest Hill Lanes') !== -1);
  assert.ok(JSON.stringify(draft.lines).indexOf('60') === -1);
  assert.ok(JSON.stringify(draft.lines).indexOf('$') === -1);
  const packaged = lib.academyPackageInvoice({ customer: 'Jordan Example', packageName: 'Four private lessons' });
  assert.strictEqual(packaged.brand, 'Legacy Bowling Academy');
  assert.strictEqual(packaged.lines[0].unitPrice, '');
  assert.strictEqual(packaged.lines[0].description, 'Four private lessons');
  assert.ok(lib.academyPackageInvoice({ customer: 'Jordan Example' }).error);
  assert.strictEqual(lib.paymentLinkProblem(''), '');
  assert.strictEqual(lib.paymentLinkProblem('http://pay.example/x') !== '', true);
  assert.strictEqual(lib.paymentLinkProblem('https://pay.example/academy'), '');
  assert.ok(lib.academyStudentError({ name: 'Riley Sample', ageGroup: 'Youth', status: 'Active', guardian: '' }));
  assert.strictEqual(lib.academyStudentError({
    name: 'Riley Sample', ageGroup: 'Youth', status: 'Active', guardian: 'Pat Preview', email: 'riley.sample@example.test'
  }), '');
  const calendar = lib.academyCalendarDraft(session);
  assert.ok(calendar.templateUrl.indexOf('https://calendar.google.com/calendar/render?action=TEMPLATE') === 0);
  assert.ok(calendar.templateUrl.indexOf(encodeURIComponent('Forest Hill Lanes')) !== -1);
  assert.ok(calendar.description.indexOf('$') === -1);
  assert.strictEqual(calendar.event.start.dateTime, '2026-11-21T16:00:00');
  assert.strictEqual(calendar.event.end.dateTime, '2026-11-21T17:00:00');
  const assumed = lib.academyCalendarDraft({ date: '2026-11-21', start: '16:00', kind: 'Private lesson', student: 'Riley Sample' });
  assert.strictEqual(assumed.assumedEnd, true);
  assert.strictEqual(assumed.event.end.dateTime, '2026-11-21T17:00:00');
  assert.ok(assumed.description.indexOf('$') === -1);
  const sample = lib.sampleBundle(new Date('2026-11-21T15:00:00Z'));
  assert.ok(sample['Academy Students'].every(function (row) { return /example\.test$/.test(row.email); }));
  assert.ok(sample['Academy Requests'].every(function (row) { return row.source === 'legacy-bowling-academy'; }));
  assert.strictEqual(sample['Academy Sessions'][0].location, 'Forest Hill Lanes');
  const academyLine = sample.InvoiceItems.filter(function (row) { return row.invoiceId === 'sample-invoice-academy'; })[0];
  assert.strictEqual(academyLine.unitPrice, '');
  assert.strictEqual(lib.invoiceBrand(sample.Invoices[0].brand).academy, false);
  assert.strictEqual(lib.invoiceBrand(sample.Invoices[1].brand).academy, true);
});

console.log('all logic tests passed');
