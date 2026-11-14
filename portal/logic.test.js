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

console.log('all logic tests passed');
