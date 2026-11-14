/**
 * Legacy Computing Services — public contact form → Inquiries tab.
 *
 * Bind this script to the portal spreadsheet:
 * open the spreadsheet → Extensions → Apps Script → paste this file → Save.
 *
 * Deploy → New deployment → Web app.
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the URL that ends in /exec into portal/config.js as inquiriesWebhookUrl.
 *
 * The website repository is public. Once that URL is in portal/config.js,
 * anyone who can read the repo can POST a fake inquiry. This script only
 * adds a row. It never returns existing customers, tickets, or prices.
 *
 * The public form still builds a mailto: link. This copy is optional.
 *
 * Header names must match portal/logic.js (the Inquiries sheet).
 */

var INQUIRY_LIMITS = {
  name: 200,
  email: 200,
  phone: 80,
  service: 200,
  budget: 300,
  details: 5000,
  source: 200
};

function doGet() {
  return ContentService
    .createTextOutput('Legacy Computing Services inquiry endpoint. This address accepts new inquiries only.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var data = readPayload_(e);
    var row = validateInquiry_(data);
    appendInquiry_(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/**
 * Optional: if you would rather use a Google Form, point the form at this
 * spreadsheet and add an installable trigger: on form submit → onFormSubmit.
 * The form questions should be named Name, Email, Phone, Service, Budget, Details.
 */
function onFormSubmit(e) {
  var named = (e && e.namedValues) || {};
  appendInquiry_(validateInquiry_({
    name: first_(named.Name || named['Your Name']),
    email: first_(named.Email || named['Email Address']),
    phone: first_(named.Phone || named['Phone Number']),
    service: first_(named.Service || named['What Can We Help With?']),
    budget: first_(named.Budget || named['Target Timeline or Budget (Optional)']),
    details: first_(named.Details || named['Project Goal or Issue Description']),
    source: 'Google Form'
  }));
}

function readPayload_(e) {
  var raw = '';
  if (e && e.parameter && e.parameter.payload) raw = e.parameter.payload;
  else if (e && e.postData && e.postData.contents) raw = e.postData.contents;
  if (!raw) throw new Error('Missing inquiry.');
  var data = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('Missing inquiry.');
  return data;
}

function validateInquiry_(data) {
  var name = clip_(data.name, INQUIRY_LIMITS.name);
  var email = clip_(data.email, INQUIRY_LIMITS.email);
  var details = clip_(data.details, INQUIRY_LIMITS.details);
  if (!name || !email || !details) throw new Error('Name, email, and details are required.');
  if (email.indexOf('@') === -1) throw new Error('Email is not valid.');
  return {
    'ID': Utilities.getUuid(),
    'Received': new Date().toISOString(),
    'Name': name,
    'Email': email,
    'Phone': clip_(data.phone, INQUIRY_LIMITS.phone),
    'Service': clip_(data.service, INQUIRY_LIMITS.service),
    'Budget': clip_(data.budget, INQUIRY_LIMITS.budget),
    'Details': details,
    'Status': 'New',
    'Source': clip_(data.source, INQUIRY_LIMITS.source) || 'Website form',
    'Notes': ''
  };
}

function appendInquiry_(record) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName('Inquiries');
    if (!sheet) throw new Error('The Inquiries tab is missing. Create the portal spreadsheet first.');
    var last = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, last).getValues()[0];
    var row = headers.map(function (header) {
      var key = String(header || '').trim();
      return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : '';
    });
    sheet.appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

function clip_(value, max) {
  var text = value == null ? '' : String(value).trim();
  if (text.length > max) return text.slice(0, max);
  return text;
}

function first_(value) {
  if (Object.prototype.toString.call(value) === '[object Array]') return value[0] || '';
  return value || '';
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
