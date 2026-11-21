/**
 * Legacy Bowling Academy — public booking and inquiry form → Academy Requests tab.
 *
 * This is a second Apps Script project. Do not paste it into the inquiry project.
 * Both files define doPost, and one project can publish only one web app.
 *
 * Standalone project (script.google.com → New project):
 *   Project Settings → Script properties → add SPREADSHEET_ID
 *   Value: the portal spreadsheet ID (the same id as spreadsheetId in portal/config.js).
 *   Do not commit that property, the web app URL, or any other secret into the website repo.
 *
 * Deploy → New deployment → Web app.
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the URL that ends in /exec into the academy website (the other repository).
 * The employee portal does not need the URL. It reads the Academy Requests tab after sign-in.
 *
 * The website repositories are public. Anyone who can read the URL can POST a fake request.
 * This script only adds a row. It never returns students, invoices, or prices.
 *
 * Header names must match portal/logic.js (the Academy Requests sheet).
 *
 * Accepts:
 *   - a JSON body
 *   - a form POST with the fields below
 *   - a form field named payload whose value is that same JSON
 *     (how a browser page can post without CORS, same idea as inquiries.gs)
 *
 * Fields: form (booking or inquiry), name, email, phone, ageGroup, program,
 * preferredTimes, goals, message, source, website.
 * website is a honeypot. It must be empty. A filled value returns {ok:true} and writes nothing.
 * source should be legacy-bowling-academy. A blank source is stored as that.
 */

var ACADEMY_LIMITS = {
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
  form: 40
};

var ACADEMY_REQUEST_HEADERS = [
  'ID', 'Received', 'Form', 'Name', 'Email', 'Phone', 'Age group', 'Program',
  'Preferred times', 'Goals', 'Message', 'Source', 'Status', 'Notes', 'Session ID'
];

var ACADEMY_PAYLOAD_KEYS = [
  'form', 'name', 'email', 'phone', 'ageGroup', 'program',
  'preferredTimes', 'goals', 'message', 'source', 'website'
];

function doGet() {
  return ContentService
    .createTextOutput('Legacy Bowling Academy intake. This address accepts new booking and inquiry requests only.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var data = academyFieldsFromPost_(e);
    var result = academyRequestRecord_(data);
    if (!result.ok) return json_({ ok: false, error: result.error || 'Request was not saved.' });
    if (!result.ignored) appendAcademyRequest_(result.record);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function academyFieldsFromPost_(e) {
  var fields = (e && e.parameter) || {};
  var body = '';
  if (e && e.postData && e.postData.contents) body = String(e.postData.contents).trim();
  var fromBody = jsonObject_(body);
  var bodyFields = {};
  if (!fromBody && body && body.indexOf('=') !== -1 && body.charAt(0) !== '{') {
    bodyFields = parseFormEncoded_(body);
  }
  var payloadRaw = fields.payload != null ? fields.payload : bodyFields.payload;
  var fromPayload = jsonObject_(payloadRaw);
  var data = {};
  takeAcademyFields_(data, fromPayload);
  takeAcademyFields_(data, fromBody);
  takeAcademyFields_(data, bodyFields);
  takeAcademyFields_(data, fields);
  [fromPayload, fromBody, bodyFields, fields].forEach(function (source) {
    if (!source || typeof source !== 'object') return;
    if (!Object.prototype.hasOwnProperty.call(source, 'website')) return;
    var value = firstAcademyValue_(source.website);
    if (value != null && String(value).trim()) data.website = value;
  });
  return data;
}

function takeAcademyFields_(data, source) {
  if (!source || typeof source !== 'object') return;
  ACADEMY_PAYLOAD_KEYS.forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return;
    var value = firstAcademyValue_(source[key]);
    if (value == null) return;
    data[key] = value;
  });
}

function academyRequestRecord_(data) {
  data = data || {};
  if (clip_(data.website, ACADEMY_LIMITS.website)) return { ok: true, ignored: true };
  var form = clip_(data.form, ACADEMY_LIMITS.form).toLowerCase();
  if (form !== 'booking' && form !== 'inquiry') {
    return { ok: false, error: 'form must be booking or inquiry.' };
  }
  var name = clip_(data.name, ACADEMY_LIMITS.name);
  var email = clip_(data.email, ACADEMY_LIMITS.email);
  if (!name || !email) return { ok: false, error: 'Name and email are required.' };
  if (email.indexOf('@') === -1) return { ok: false, error: 'Email is not valid.' };
  return {
    ok: true,
    record: {
      'ID': Utilities.getUuid(),
      'Received': new Date().toISOString(),
      'Form': form,
      'Name': name,
      'Email': email,
      'Phone': clip_(data.phone, ACADEMY_LIMITS.phone),
      'Age group': normalizeAgeGroup_(data.ageGroup),
      'Program': clip_(data.program, ACADEMY_LIMITS.program),
      'Preferred times': clip_(data.preferredTimes, ACADEMY_LIMITS.preferredTimes),
      'Goals': clip_(data.goals, ACADEMY_LIMITS.goals),
      'Message': clip_(data.message, ACADEMY_LIMITS.message),
      'Source': clip_(data.source, ACADEMY_LIMITS.source) || 'legacy-bowling-academy',
      'Status': 'New',
      'Notes': '',
      'Session ID': ''
    }
  };
}

function appendAcademyRequest_(record) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = academyRequestsSheet_();
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

function academyRequestsSheet_() {
  var ss = portalSpreadsheet_();
  var sheet = ss.getSheetByName('Academy Requests');
  if (!sheet) {
    sheet = ss.insertSheet('Academy Requests');
    sheet.getRange(1, 1, 1, ACADEMY_REQUEST_HEADERS.length).setValues([ACADEMY_REQUEST_HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  var last = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, last).getValues()[0].map(function (cell) {
    return String(cell || '').trim();
  });
  var have = {};
  var lastFilled = 0;
  headers.forEach(function (name, i) {
    if (!name) return;
    have[name.toLowerCase()] = true;
    lastFilled = i + 1;
  });
  if (!lastFilled) {
    sheet.getRange(1, 1, 1, ACADEMY_REQUEST_HEADERS.length).setValues([ACADEMY_REQUEST_HEADERS]);
    return sheet;
  }
  var missing = ACADEMY_REQUEST_HEADERS.filter(function (name) {
    return !have[name.toLowerCase()];
  });
  if (missing.length) {
    sheet.getRange(1, lastFilled + 1, 1, missing.length).setValues([missing]);
  }
  return sheet;
}

function portalSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id && String(id).trim()) return SpreadsheetApp.openById(String(id).trim());
  var active = SpreadsheetApp.getActive();
  if (active) return active;
  throw new Error('Set the script property SPREADSHEET_ID to the portal spreadsheet ID.');
}

function normalizeAgeGroup_(value) {
  var text = clip_(value, ACADEMY_LIMITS.ageGroup);
  var key = text.toLowerCase();
  if (key === 'youth') return 'Youth';
  if (key === 'adult') return 'Adult';
  if (key === 'senior') return 'Senior';
  return text;
}

function jsonObject_(text) {
  var raw = text == null ? '' : String(text).trim();
  if (!raw || (raw.charAt(0) !== '{' && raw.charAt(0) !== '[')) return null;
  try {
    var value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Object.prototype.toString.call(value) === '[object Array]') return null;
    return value;
  } catch (err) {
    return null;
  }
}

function parseFormEncoded_(text) {
  var out = {};
  String(text || '').split('&').forEach(function (pair) {
    if (!pair) return;
    var idx = pair.indexOf('=');
    var key = decodeFormComponent_(idx === -1 ? pair : pair.slice(0, idx));
    var val = decodeFormComponent_(idx === -1 ? '' : pair.slice(idx + 1));
    if (!key || Object.prototype.hasOwnProperty.call(out, key)) return;
    out[key] = val;
  });
  return out;
}

function decodeFormComponent_(text) {
  var raw = String(text == null ? '' : text).replace(/\+/g, ' ');
  try { return decodeURIComponent(raw); } catch (err) { return raw; }
}

function firstAcademyValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Array]') return value.length ? value[0] : '';
  return value;
}

function clip_(value, max) {
  var text = value == null ? '' : String(value).trim();
  if (text.length > max) return text.slice(0, max);
  return text;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
