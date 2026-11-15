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

console.log('all logic tests passed');
