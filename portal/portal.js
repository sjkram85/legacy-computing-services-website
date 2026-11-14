/* Employee portal. The page is public. Company records stay in Google.
   Access is the signed-in user's own token plus Google's sharing, not this file. */
(function () {
  'use strict';

  var Lib = window.LCSPortal;
  var IDENTITY_SCOPES = 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
  var DATA_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/calendar.readonly'
  ].join(' ');

  var INPUT = 'w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:outline-none text-white text-sm placeholder-slate-500';
  var LABEL = 'block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2';
  var PRIMARY = 'inline-flex items-center justify-center px-4 py-3 rounded-xl bg-[#18A2D6] hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-cyber-cyan disabled:opacity-60';
  var SECONDARY = 'inline-flex items-center justify-center px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:border-sky-400/50 font-semibold text-sm';
  var GHOST = 'inline-flex items-center justify-center px-3 py-2 rounded-xl text-sm font-semibold text-sky-300 hover:text-white';

  var state = {
    mode: 'gate',
    section: 'home',
    editorId: '',
    printKind: '',
    printId: '',
    profile: null,
    token: null,
    grantedScope: '',
    expiresAt: 0,
    expired: false,
    busy: '',
    banner: null,
    data: Lib ? Lib.emptyData() : {},
    parsed: {},
    headers: {},
    sheetIds: {},
    missingTabs: [],
    spreadsheetUrl: '',
    spreadsheetTitle: '',
    sessionSpreadsheetId: '',
    createdSheet: null,
    drive: { files: [], error: '', folderId: '' },
    events: [],
    calendarError: '',
    sheetsError: '',
    customerQuery: '',
    ticketFilter: 'Open work',
    inquiryFilter: 'New'
  };

  var expiryTimer = 0;
  var shieldSerial = 0;

  function cfg() {
    return window.LCS_PORTAL || {};
  }

  function spreadsheetId() {
    return Lib.googleId(state.sessionSpreadsheetId) || Lib.googleId(cfg().spreadsheetId);
  }

  function driveFolderId() {
    return Lib.googleId(cfg().driveFolderId);
  }

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val == null || val === false) return;
        if (key === 'class') node.className = val;
        else node.setAttribute(key, val === true ? '' : String(val));
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid == null || kid === false) return;
      node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  function button(label, className, onClick) {
    var node = el('button', { type: 'button', class: className }, [label]);
    node.addEventListener('click', onClick);
    return node;
  }

  function shield() {
    var tpl = document.getElementById('shield-tpl');
    if (!tpl || !tpl.content || !tpl.content.firstElementChild) return el('span');
    var svg = tpl.content.firstElementChild.cloneNode(true);
    shieldSerial += 1;
    var stamp = 'p' + shieldSerial;
    Array.prototype.forEach.call(svg.querySelectorAll('[id]'), function (node) {
      var old = node.id;
      node.id = old + stamp;
      Array.prototype.forEach.call(svg.querySelectorAll('[fill],[stroke]'), function (use) {
        ['fill', 'stroke'].forEach(function (attr) {
          if (use.getAttribute(attr) === 'url(#' + old + ')') use.setAttribute(attr, 'url(#' + node.id + ')');
        });
      });
    });
    return svg;
  }

  function brandMark() {
    var box = el('span', { class: 'official-logo-stage w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0' });
    box.appendChild(shield());
    return box;
  }

  function paint(keepScroll) {
    var y = keepScroll ? window.scrollY : 0;
    var app = document.getElementById('app');
    app.replaceChildren(state.mode === 'gate' ? renderGate() : renderApp());
    window.scrollTo(0, y);
  }

  function go() {
    var hash = Array.prototype.map.call(arguments, function (part) {
      return encodeURIComponent(part);
    }).join('/');
    if (location.hash === '#' + hash) {
      applyHash();
      paint();
      return;
    }
    location.hash = hash;
  }

  function hashParts() {
    try {
      return (location.hash || '').replace(/^#/, '').split('/').filter(Boolean).map(decodeURIComponent);
    } catch (err) {
      return [];
    }
  }

  function applyHash() {
    var parts = hashParts();
    if (parts[0] === 'print' && (parts[1] === 'quote' || parts[1] === 'invoice')) {
      state.section = 'print';
      state.printKind = parts[1];
      state.printId = parts[2] || '';
      state.editorId = '';
      return;
    }
    var known = { home: 1, tickets: 1, customers: 1, inquiries: 1, quotes: 1, invoices: 1, docs: 1 };
    state.section = known[parts[0]] ? parts[0] : 'home';
    state.editorId = parts[1] || '';
    state.printKind = '';
    state.printId = '';
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function stamp() {
    return new Date().toISOString();
  }

  function todayInput() {
    return Lib.isoDate(0);
  }

  function findRow(title, id) {
    var list = state.data[title] || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function stampUpdate(record, existing) {
    record.id = (existing && existing.id) || record.id || newId();
    record.created = (existing && existing.created) || record.created || stamp();
    record.updated = stamp();
    if (existing && existing._row) record._row = existing._row;
    if (state.mode === 'demo') record.sample = true;
    return record;
  }

  function formatDay(value) {
    var match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return value ? String(value).replace('T', ' ').slice(0, 16) : '';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[Number(match[2]) - 1] + ' ' + Number(match[3]) + ', ' + match[1];
  }

  function formatWhen(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDay(value);
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function badgeClass(value) {
    var v = String(value || '').toLowerCase();
    if (v === 'done' || v === 'paid' || v === 'accepted' || v === 'replied' || v === 'closed') {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40';
    }
    if (v === 'urgent' || v === 'high' || v === 'void' || v === 'declined') {
      return 'bg-rose-500/15 text-rose-200 border-rose-400/40';
    }
    if (v === 'in progress' || v === 'sent' || v === 'waiting on customer' || v === 'reviewed') {
      return 'bg-amber-500/15 text-amber-100 border-amber-400/40';
    }
    return 'bg-sky-500/15 text-sky-200 border-sky-400/40';
  }

  function badge(text) {
    return el('span', {
      class: 'inline-flex items-center px-2.5 py-1 rounded-md border font-mono text-[11px] uppercase tracking-wider ' + badgeClass(text)
    }, [text || 'Unset']);
  }

  function sampleChip() {
    return el('span', {
      class: 'inline-flex items-center px-2 py-0.5 rounded-md border border-amber-400/50 bg-amber-500/10 font-mono text-[10px] uppercase tracking-wider text-amber-200'
    }, ['Sample']);
  }

  function moneyLabel(record, totals) {
    var row = el('div', { class: 'text-right' });
    if (record && record.sample) row.appendChild(sampleChip());
    var figure = el('p', { class: 'font-display font-bold text-white mt-1' });
    if (totals.empty) figure.textContent = 'No lines yet';
    else if (!totals.complete) figure.textContent = 'Price incomplete';
    else figure.textContent = Lib.formatUSD(totals.total);
    row.appendChild(figure);
    if (record && record.sample && totals.complete) {
      row.appendChild(el('p', { class: 'text-[11px] text-amber-200' }, ['Sample figure, not a company price']));
    }
    return row;
  }

  function itemsFor(kind, id) {
    var spec = Lib.DOC_SPEC[kind];
    return (state.data[spec.items] || []).filter(function (item) {
      return item[spec.parentKey] === id;
    });
  }

  function totalsFor(kind, record) {
    return Lib.documentTotals(itemsFor(kind, record.id), record.tax);
  }

  function safeHttp(url) {
    return typeof url === 'string' && /^https:\/\/[^\s]+$/i.test(url) ? url : '';
  }

  function fileKind(mime) {
    if (mime === 'application/vnd.google-apps.folder') return 'Folder';
    if (mime === 'application/vnd.google-apps.document') return 'Google Doc';
    if (mime === 'application/vnd.google-apps.spreadsheet') return 'Google Sheet';
    if (mime === 'application/vnd.google-apps.presentation') return 'Slides';
    if (mime === 'application/pdf') return 'PDF';
    if (mime && mime.indexOf('image/') === 0) return 'Image';
    return 'File';
  }

  function bannerEl() {
    if (!state.banner) return null;
    var tone = 'border-sky-400/40 bg-sky-500/10 text-sky-100';
    if (state.banner.tone === 'bad') tone = 'border-rose-400/50 bg-rose-500/10 text-rose-100';
    if (state.banner.tone === 'warn') tone = 'border-amber-400/50 bg-amber-500/10 text-amber-100';
    if (state.banner.tone === 'ok') tone = 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100';
    return el('div', { class: 'rounded-2xl border px-4 py-3 text-sm leading-relaxed ' + tone, role: 'status' }, [state.banner.text]);
  }

  function demoBanner() {
    return el('div', { class: 'rounded-2xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 leading-relaxed' }, [
      'Sample data. Not connected to Google. Every name, ticket, and dollar amount on this screen is fake and is not a company record.'
    ]);
  }

  function field(labelText, control, hint) {
    var wrap = el('div');
    var lab = el('label', { class: LABEL, for: control.id || '' }, [labelText]);
    wrap.appendChild(lab);
    wrap.appendChild(control);
    if (hint) wrap.appendChild(el('p', { class: 'mt-1.5 text-xs text-slate-400' }, [hint]));
    return wrap;
  }

  function textInput(id, value, opts) {
    opts = opts || {};
    var input = el('input', { id: id, class: INPUT, type: opts.type || 'text', name: opts.name || id });
    input.value = value || '';
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.required) input.required = true;
    if (opts.list) input.setAttribute('list', opts.list);
    if (opts.inputmode) input.setAttribute('inputmode', opts.inputmode);
    if (!input.name) input.removeAttribute('name');
    return input;
  }

  function areaInput(id, value, placeholder) {
    var input = el('textarea', { id: id, name: id, class: INPUT, rows: '4' });
    input.value = value || '';
    if (placeholder) input.placeholder = placeholder;
    return input;
  }

  function selectInput(id, value, options) {
    var input = el('select', { id: id, name: id, class: INPUT });
    options.forEach(function (option) {
      var node = el('option', { value: option }, [option]);
      if (option === value) node.selected = true;
      input.appendChild(node);
    });
    if (!value && options.length) input.value = options[0];
    return input;
  }

  function customerList(id) {
    var list = el('datalist', { id: id });
    (state.data.Customers || []).forEach(function (row) {
      if (row.name) list.appendChild(el('option', { value: row.name }));
    });
    return list;
  }

  function sectionHead(kicker, title, lede) {
    var head = el('div', { class: 'flex flex-col sm:flex-row sm:items-end justify-between gap-4' });
    var copy = el('div');
    copy.appendChild(el('p', { class: 'font-mono text-xs uppercase tracking-[0.2em] text-cyan-400' }, [kicker]));
    copy.appendChild(el('h1', { class: 'font-display text-3xl font-bold text-white mt-2' }, [title]));
    if (lede) copy.appendChild(el('p', { class: 'mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed' }, [lede]));
    head.appendChild(copy);
    return head;
  }

  function emptyNote(text) {
    return el('p', { class: 'cyber-panel rounded-2xl p-6 text-sm text-slate-300 leading-relaxed' }, [text]);
  }

  function renderGate() {
    var domain = Lib.allowedDomain(cfg()) || 'the company domain in portal/config.js';
    var ready = Lib.clientConfigured(cfg()) && Lib.allowedDomain(cfg());
    var page = el('div', { class: 'bg-cyber-matrix min-h-screen flex flex-col' });
    var bar = el('header', { class: 'border-b border-slate-700/70 bg-[#0B131E]/92' });
    var barInner = el('div', { class: 'max-w-3xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-3' });
    var brand = el('div', { class: 'flex items-center gap-3 min-w-0' });
    brand.appendChild(brandMark());
    var name = el('div', { class: 'leading-tight min-w-0' });
    name.appendChild(el('span', { class: 'block font-display text-base font-extrabold tracking-wide text-white uppercase' }, ['Legacy']));
    name.appendChild(el('span', { class: 'block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300' }, ['Employee portal']));
    brand.appendChild(name);
    barInner.appendChild(brand);
    barInner.appendChild(el('a', { href: '../', class: 'text-xs text-slate-500 hover:text-slate-300 shrink-0' }, ['Back to the website']));
    bar.appendChild(barInner);

    var main = el('main', { class: 'max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex-1 w-full' });
    var card = el('section', { class: 'cyber-panel rounded-3xl p-6 sm:p-8 space-y-6' });
    card.appendChild(el('p', { class: 'font-mono text-xs uppercase tracking-[0.2em] text-cyan-400' }, ['Staff only']));
    card.appendChild(el('h1', { class: 'font-display text-3xl sm:text-4xl font-bold text-white' }, ['Sign in with your company Google account']));
    card.appendChild(el('p', { class: 'text-slate-300 leading-relaxed' }, [
      'This page is public and stores no customer list, no prices, and no files. After sign-in, Google Sheets, Drive, and Calendar are opened with your own Google access. If a file is not shared with you, Google will not show it.'
    ]));
    card.appendChild(el('p', { class: 'font-mono text-sm text-sky-300' }, ['Allowed accounts: @' + domain]));

    if (state.banner) card.appendChild(bannerEl());
    var actions = el('div', { class: 'flex flex-col sm:flex-row gap-3' });
    if (ready) {
      var signInBtn = button(state.busy || 'Sign in with Google', PRIMARY, signIn);
      signInBtn.disabled = Boolean(state.busy);
      actions.appendChild(signInBtn);
    }
    actions.appendChild(button('Preview with sample data', ready ? SECONDARY : PRIMARY, enterDemo));
    card.appendChild(actions);

    card.appendChild(el('p', { class: 'text-sm text-slate-400 leading-relaxed' }, [
      'The page asks Google for the hosted domain (hd) and rejects every other account, including personal Gmail. That check lives in the browser, so it is not the real lock. The lock is Google: the spreadsheet and Drive folder stay restricted to employees. This site never sees your password.'
    ]));

    if (!Lib.allowedDomain(cfg())) {
      card.appendChild(el('p', { class: 'rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100' }, [
        'allowedDomain in portal/config.js is empty. Set it to the Workspace domain before anyone signs in.'
      ]));
    }

    if (!Lib.clientConfigured(cfg())) {
      var setup = el('div', { class: 'rounded-2xl border border-sky-400/30 bg-slate-950/50 p-5 space-y-3' });
      setup.appendChild(el('h2', { class: 'font-display text-xl font-bold text-white' }, ['Not configured yet']));
      setup.appendChild(el('p', { class: 'text-sm text-slate-300 leading-relaxed' }, [
        'There is no Google sign-in client in portal/config.js yet, so this page will not try to open Google. Nothing is broken. Scott still needs to create an Internal OAuth client and paste the Client ID into that file.'
      ]));
      var steps = el('ol', { class: 'list-decimal pl-5 text-sm text-slate-300 space-y-1.5' });
      [
        'Create a Google Cloud project with the Workspace admin account and set the consent screen to Internal.',
        'Enable the Sheets, Drive, and Calendar APIs, then create a Web OAuth client.',
        'Paste the Client ID into portal/config.js. Leave the spreadsheet ID blank for now.',
        'Sign in here and use Create the portal spreadsheet, then share that file with employees.'
      ].forEach(function (step) { steps.appendChild(el('li', {}, [step])); });
      setup.appendChild(steps);
      setup.appendChild(el('p', { class: 'text-sm text-slate-400' }, [
        'The click-by-click version is in docs/portal-setup.md in the website repository.'
      ]));
      setup.appendChild(el('a', {
        href: '../docs/portal-setup.md',
        class: 'inline-flex text-sm font-semibold text-sky-300 hover:text-white'
      }, ['Open the setup guide']));
      card.appendChild(setup);
    }

    card.appendChild(el('p', { class: 'text-xs text-slate-500 leading-relaxed' }, [
      'Sample data is fake, stays in this browser tab, and is not saved. The sign-in token, when you have one, is also kept only in this tab.'
    ]));
    main.appendChild(card);
    page.appendChild(bar);
    page.appendChild(main);
    return page;
  }

  function renderApp() {
    var page = el('div', { class: 'min-h-screen flex flex-col bg-[#0B131E]' });
    page.appendChild(renderHeader());
    page.appendChild(renderNav());
    var main = el('main', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-5' });
    if (state.mode === 'demo') main.appendChild(demoBanner());
    if (state.banner) main.appendChild(bannerEl());
    if (state.busy) main.appendChild(el('p', { class: 'text-sm text-sky-300', role: 'status' }, [state.busy]));
    main.appendChild(renderSection());
    page.appendChild(main);
    return page;
  }

  function renderHeader() {
    var header = el('header', { class: 'no-print sticky top-0 z-30 border-b border-slate-700/70 bg-[#0B131E]/92 backdrop-blur-xl' });
    var inner = el('div', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3' });
    var brand = button('', 'flex items-center gap-3 min-w-0 text-left', function () { go('home'); });
    brand.appendChild(brandMark());
    var name = el('span', { class: 'leading-tight min-w-0' });
    name.appendChild(el('span', { class: 'block font-display text-base font-extrabold tracking-wide text-white uppercase truncate' }, ['Legacy']));
    name.appendChild(el('span', { class: 'block font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300' }, ['Employee portal']));
    brand.appendChild(name);
    inner.appendChild(brand);
    var side = el('div', { class: 'flex items-center gap-2 sm:gap-3 shrink-0' });
    if (state.mode === 'demo') side.appendChild(sampleChip());
    var who = state.profile && (state.profile.email || state.profile.name);
    if (who) side.appendChild(el('span', { class: 'hidden sm:block font-mono text-[11px] text-slate-400 max-w-[14rem] truncate' }, [who]));
    side.appendChild(button(state.mode === 'demo' ? 'Leave sample data' : 'Sign out', GHOST, signOut));
    inner.appendChild(side);
    header.appendChild(inner);
    return header;
  }

  function renderNav() {
    var nav = el('nav', { class: 'no-print border-b border-slate-800 bg-[#0B131E]', 'aria-label': 'Portal' });
    var row = el('div', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 overflow-x-auto py-3' });
    [
      ['home', 'Overview'],
      ['tickets', 'Tickets'],
      ['customers', 'Customers'],
      ['inquiries', 'Inquiries'],
      ['quotes', 'Quotes'],
      ['invoices', 'Invoices'],
      ['docs', 'Docs']
    ].forEach(function (item) {
      var on = state.section === item[0];
      if (state.section === 'print') {
        on = (state.printKind === 'invoice' && item[0] === 'invoices') || (state.printKind === 'quote' && item[0] === 'quotes');
      }
      var node = button(item[1], 'shrink-0 px-3 py-2 rounded-xl text-sm font-semibold ' + (on ? 'nav-current' : 'text-slate-300 hover:bg-slate-900'), function () {
        go(item[0]);
      });
      if (on) node.setAttribute('aria-current', 'page');
      row.appendChild(node);
    });
    nav.appendChild(row);
    return nav;
  }

  function renderSection() {
    if (state.section === 'tickets') return state.editorId ? renderTicketEditor() : renderTickets();
    if (state.section === 'customers') return state.editorId ? renderCustomerEditor() : renderCustomers();
    if (state.section === 'inquiries') return state.editorId ? renderInquiryEditor() : renderInquiries();
    if (state.section === 'quotes') return state.editorId ? renderDocEditor('quote') : renderDocList('quote');
    if (state.section === 'invoices') return state.editorId ? renderDocEditor('invoice') : renderDocList('invoice');
    if (state.section === 'docs') return renderDocs();
    if (state.section === 'print') return renderPrint();
    return renderHome();
  }

  function quickLinks() {
    var domain = Lib.allowedDomain(cfg()) || 'legacycomputingservices.com';
    return [
      ['Gmail', 'https://mail.google.com/a/' + domain, 'Company inbox'],
      ['Drive', 'https://drive.google.com/', 'Files'],
      ['Calendar', 'https://calendar.google.com/calendar/u/0/r', 'Schedule'],
      ['Meet', 'https://meet.google.com/', 'Video calls'],
      ['Admin', 'https://admin.google.com/', 'For Workspace admins']
    ];
  }

  function linkGrid() {
    var grid = el('div', { class: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3' });
    quickLinks().forEach(function (item) {
      var link = el('a', {
        href: item[1],
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'cyber-panel cyber-panel-hover rounded-2xl p-4 block'
      });
      link.appendChild(el('span', { class: 'block font-display font-bold text-white' }, [item[0]]));
      link.appendChild(el('span', { class: 'block mt-1 text-xs text-slate-400' }, [item[2]]));
      grid.appendChild(link);
    });
    return grid;
  }

  function statCard(label, value, hash) {
    var card = el('button', { type: 'button', class: 'cyber-panel cyber-panel-hover rounded-2xl p-4 text-left w-full' });
    card.appendChild(el('span', { class: 'block font-mono text-[11px] uppercase tracking-wider text-slate-400' }, [label]));
    card.appendChild(el('span', { class: 'block font-display text-3xl font-bold text-white mt-2' }, [String(value)]));
    card.addEventListener('click', function () { go(hash); });
    return card;
  }

  function sheetCallout() {
    if (state.mode !== 'live') return null;
    var box = el('section', { class: 'cyber-panel rounded-3xl p-6 space-y-4' });
    if (!spreadsheetId()) {
      box.appendChild(el('h2', { class: 'font-display text-2xl font-bold text-white' }, ['Create the portal spreadsheet']));
      box.appendChild(el('p', { class: 'text-sm text-slate-300 leading-relaxed' }, [
        'No spreadsheet ID is in portal/config.js. This button creates a Google Sheet in your Drive with the Tickets, Customers, Inquiries, Quotes, QuoteItems, Invoices, and InvoiceItems tabs and their header rows. It does not add sample customers or prices.'
      ]));
      var create = button(state.busy ? 'Working…' : 'Create the portal spreadsheet', PRIMARY, createSpreadsheet);
      create.disabled = Boolean(state.busy);
      box.appendChild(create);
    } else {
      box.appendChild(el('h2', { class: 'font-display text-xl font-bold text-white' }, [state.spreadsheetTitle || 'Portal spreadsheet']));
      box.appendChild(el('p', { class: 'text-sm text-slate-300' }, [
        'Google is the gate. Share this file with employees and leave general access Restricted.'
      ]));
      if (state.spreadsheetUrl) {
        box.appendChild(el('a', { href: state.spreadsheetUrl, target: '_blank', rel: 'noopener noreferrer', class: 'text-sm font-semibold text-sky-300' }, ['Open the spreadsheet']));
      }
    }
    if (state.createdSheet) box.appendChild(createdSheetCard());
    if (state.missingTabs && state.missingTabs.length) {
      box.appendChild(el('p', { class: 'text-sm text-amber-200' }, ['Missing tabs: ' + state.missingTabs.join(', ') + '.']));
      box.appendChild(button('Add missing tabs and headers', SECONDARY, repairSheets));
    }
    var rawSheet = Lib.clean(cfg().spreadsheetId);
    if (rawSheet && !Lib.googleId(rawSheet) && !state.sessionSpreadsheetId) {
      box.appendChild(el('p', { class: 'text-sm text-rose-200' }, [
        'spreadsheetId in portal/config.js is not a valid ID or Google Sheets URL.'
      ]));
    }
    return box;
  }

  function createdSheetCard() {
    var box = el('div', { class: 'rounded-2xl border border-emerald-400/30 bg-slate-950/60 p-4 space-y-3' });
    box.appendChild(el('p', { class: 'text-sm text-emerald-200' }, [
      'Created. Paste this ID into spreadsheetId in portal/config.js, then share the file. This tab can use it until you close the tab. A later visit will not, until the file is updated.'
    ]));
    var input = el('input', { class: INPUT, readonly: 'readonly', 'aria-label': 'Spreadsheet ID' });
    input.value = state.createdSheet.id;
    box.appendChild(input);
    var row = el('div', { class: 'flex flex-wrap gap-2' });
    row.appendChild(button('Copy ID', SECONDARY, function () { copyText(state.createdSheet.id, row); }));
    if (state.createdSheet.url) {
      row.appendChild(el('a', { href: state.createdSheet.url, target: '_blank', rel: 'noopener noreferrer', class: SECONDARY }, ['Open in Google Sheets']));
    }
    box.appendChild(row);
    return box;
  }

  function copyText(text, host) {
    var finish = function (ok) {
      host.appendChild(el('span', { class: 'text-xs text-slate-300 self-center' }, [ok ? 'Copied.' : 'Select the ID and copy it.']));
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { finish(true); }).catch(function () { finish(false); });
    } else finish(false);
  }

  function renderHome() {
    var page = el('div', { class: 'space-y-8' });
    page.appendChild(sectionHead('Workspace', 'Dashboard', 'Links open Google. Lists below are the sheet and calendar your account is allowed to read.'));
    page.appendChild(linkGrid());
    var callout = sheetCallout();
    if (callout) page.appendChild(callout);
    if (state.sheetsError) page.appendChild(emptyNote(state.sheetsError));
    var openTickets = (state.data.Tickets || []).filter(function (row) { return row.status !== 'Done'; }).length;
    var fresh = (state.data.Inquiries || []).filter(function (row) { return !row.status || row.status === 'New'; }).length;
    var openQuotes = (state.data.Quotes || []).filter(function (row) { return row.status === 'Draft' || row.status === 'Sent'; }).length;
    var unpaid = (state.data.Invoices || []).filter(function (row) { return row.status === 'Draft' || row.status === 'Sent'; }).length;
    var stats = el('div', { class: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3' });
    stats.appendChild(statCard('Open tickets', openTickets, 'tickets'));
    stats.appendChild(statCard('Customers', (state.data.Customers || []).length, 'customers'));
    stats.appendChild(statCard('New inquiries', fresh, 'inquiries'));
    stats.appendChild(statCard('Open quotes', openQuotes, 'quotes'));
    stats.appendChild(statCard('Unpaid invoices', unpaid, 'invoices'));
    page.appendChild(stats);
    var cols = el('div', { class: 'grid lg:grid-cols-2 gap-6' });
    cols.appendChild(calendarCard());
    cols.appendChild(recentTickets());
    page.appendChild(cols);
    return page;
  }

  function calendarCard() {
    var card = el('section', { class: 'cyber-panel rounded-3xl p-6 space-y-4' });
    card.appendChild(el('h2', { class: 'font-display text-xl font-bold text-white' }, ['Upcoming']));
    if (state.calendarError) card.appendChild(el('p', { class: 'text-sm text-amber-200 leading-relaxed' }, [state.calendarError]));
    if (!state.events.length && !state.calendarError) {
      card.appendChild(el('p', { class: 'text-sm text-slate-400' }, ['No upcoming events on the primary calendar.']));
    }
    var list = el('ul', { class: 'space-y-3' });
    state.events.forEach(function (event) {
      var item = el('li', { class: 'flex items-start justify-between gap-3' });
      var copy = el('div');
      copy.appendChild(el('p', { class: 'text-sm text-white' }, [event.summary || '(No title)']));
      copy.appendChild(el('p', { class: 'text-xs text-slate-400 mt-1' }, [formatWhen(event.start)]));
      item.appendChild(copy);
      if (event.sample) item.appendChild(sampleChip());
      else if (safeHttp(event.htmlLink)) {
        item.appendChild(el('a', { href: event.htmlLink, target: '_blank', rel: 'noopener noreferrer', class: 'text-xs font-semibold text-sky-300 shrink-0' }, ['Open']));
      }
      list.appendChild(item);
    });
    card.appendChild(list);
    return card;
  }

  function recentTickets() {
    var card = el('section', { class: 'cyber-panel rounded-3xl p-6 space-y-4' });
    var head = el('div', { class: 'flex items-center justify-between gap-3' });
    head.appendChild(el('h2', { class: 'font-display text-xl font-bold text-white' }, ['Open tickets']));
    head.appendChild(button('All tickets', GHOST, function () { go('tickets'); }));
    card.appendChild(head);
    var rows = (state.data.Tickets || []).filter(function (row) { return row.status !== 'Done'; }).slice(0, 4);
    if (!rows.length) card.appendChild(el('p', { class: 'text-sm text-slate-400' }, ['No open tickets.']));
    rows.forEach(function (row) {
      var item = el('button', { type: 'button', class: 'w-full text-left rounded-xl border border-slate-700/80 px-3 py-3 hover:border-sky-400/50' });
      item.appendChild(el('span', { class: 'block text-sm text-white' }, [row.issue || 'Untitled']));
      var meta = el('span', { class: 'mt-1 flex flex-wrap items-center gap-2' });
      meta.appendChild(el('span', { class: 'text-xs text-slate-400' }, [row.customer || 'No customer']));
      meta.appendChild(badge(row.status));
      if (row.sample) meta.appendChild(sampleChip());
      item.appendChild(meta);
      item.addEventListener('click', function () { go('tickets', row.id); });
      card.appendChild(item);
    });
    return card;
  }

  function sheetBlocked(title) {
    if (state.mode === 'demo') return null;
    if (!spreadsheetId()) return sheetCallout();
    if (state.sheetsError) return emptyNote(state.sheetsError);
    if (state.missingTabs && state.missingTabs.indexOf(title) !== -1) {
      var box = el('div', { class: 'space-y-3' });
      box.appendChild(emptyNote('The ' + title + ' tab is not in the spreadsheet yet.'));
      box.appendChild(button('Add missing tabs and headers', SECONDARY, repairSheets));
      return box;
    }
    var parsed = state.parsed[title];
    if (parsed && parsed.missingHeaders && parsed.missingHeaders.length && !(parsed.rows || []).length) {
      var warn = el('div', { class: 'space-y-3' });
      warn.appendChild(emptyNote('The ' + title + ' header row is missing: ' + parsed.missingHeaders.join(', ') + '. Adding headers will not overwrite existing data rows.'));
      warn.appendChild(button('Add missing tabs and headers', SECONDARY, repairSheets));
      return warn;
    }
    return null;
  }

  function renderTickets() {
    var page = el('div', { class: 'space-y-5' });
    var head = sectionHead('Jobs', 'Tickets', 'Customer, issue, status, priority, who has it, dates, and notes. Stored on the Tickets tab.');
    head.appendChild(button('Add ticket', PRIMARY, function () { go('tickets', 'new'); }));
    page.appendChild(head);
    var blocked = sheetBlocked('Tickets');
    if (blocked) {
      page.appendChild(blocked);
      return page;
    }
    var filters = [
      ['Open work', function (row) { return row.status !== 'Done'; }],
      ['All', function () { return true; }],
      ['Open', function (row) { return row.status === 'Open'; }],
      ['In progress', function (row) { return row.status === 'In progress'; }],
      ['Waiting', function (row) { return row.status === 'Waiting on customer'; }],
      ['Done', function (row) { return row.status === 'Done'; }]
    ];
    page.appendChild(filterBar(filters, state.ticketFilter, function (label) {
      state.ticketFilter = label;
      paint(true);
    }));
    var chosen = filters.filter(function (item) { return item[0] === state.ticketFilter; })[0] || filters[0];
    var rows = (state.data.Tickets || []).filter(chosen[1]);
    if (!rows.length) page.appendChild(emptyNote('No tickets in this view.'));
    var list = el('div', { class: 'space-y-3' });
    rows.forEach(function (row) { list.appendChild(ticketCard(row)); });
    page.appendChild(list);
    return page;
  }

  function filterBar(options, current, onPick) {
    var bar = el('div', { class: 'flex gap-2 overflow-x-auto' });
    options.forEach(function (option) {
      var on = option[0] === current;
      bar.appendChild(button(option[0], 'shrink-0 px-3 py-2 rounded-xl text-sm font-semibold border ' + (on ? 'bg-[#18A2D6] text-slate-950 border-transparent' : 'bg-slate-900 border-slate-700 text-slate-300'), function () {
        onPick(option[0]);
      }));
    });
    return bar;
  }

  function ticketCard(row) {
    var card = el('article', { class: 'cyber-panel rounded-2xl p-5' });
    var top = el('div', { class: 'flex flex-wrap items-start justify-between gap-3' });
    var copy = el('div', { class: 'min-w-0' });
    copy.appendChild(el('h2', { class: 'font-display font-bold text-white text-lg' }, [row.issue || 'Untitled ticket']));
    copy.appendChild(el('p', { class: 'text-sm text-slate-300 mt-1' }, [row.customer || 'No customer']));
    top.appendChild(copy);
    var tags = el('div', { class: 'flex flex-wrap gap-2' });
    tags.appendChild(badge(row.status));
    tags.appendChild(badge(row.priority));
    if (row.sample) tags.appendChild(sampleChip());
    top.appendChild(tags);
    card.appendChild(top);
    var meta = el('p', { class: 'mt-3 text-xs text-slate-400' }, [
      [row.assignedTo ? 'Assigned to ' + row.assignedTo : 'Unassigned', row.openedOn ? 'Opened ' + formatDay(row.openedOn) : '', row.dueOn ? 'Due ' + formatDay(row.dueOn) : ''].filter(Boolean).join(' · ')
    ]);
    card.appendChild(meta);
    if (row.notes) card.appendChild(el('p', { class: 'mt-3 text-sm text-slate-300 whitespace-pre-wrap' }, [row.notes]));
    card.appendChild(el('div', { class: 'mt-4' }, [button('Update', SECONDARY, function () { go('tickets', row.id); })]));
    return card;
  }

  function formError() {
    return el('p', { 'data-form-error': '1', class: 'hidden rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100' });
  }

  function showFormError(form, text) {
    var node = form.querySelector('[data-form-error]');
    node.textContent = text;
    node.classList.remove('hidden');
  }

  function renderTicketEditor() {
    var existing = state.editorId === 'new' ? null : findRow('Tickets', state.editorId);
    if (state.editorId !== 'new' && !existing) return missingRecord('tickets', 'That ticket is not in the current list.');
    var record = existing || { status: 'Open', priority: 'Normal', openedOn: todayInput() };
    var page = el('div', { class: 'space-y-5 max-w-3xl' });
    page.appendChild(sectionHead('Jobs', existing ? 'Update ticket' : 'New ticket', 'Leave a date blank if you do not know it yet.'));
    var form = el('form', { class: 'cyber-panel rounded-3xl p-6 space-y-5', autocomplete: 'off' });
    form.appendChild(customerList('ticket-customers'));
    form.appendChild(field('Customer', textInput('customer', record.customer, { required: true, list: 'ticket-customers', placeholder: 'Who is it for?' })));
    form.appendChild(field('Issue', textInput('issue', record.issue, { required: true, placeholder: 'What needs doing?' })));
    var grid = el('div', { class: 'grid sm:grid-cols-2 gap-5' });
    grid.appendChild(field('Status', selectInput('status', record.status || 'Open', Lib.CHOICES.ticketStatus)));
    grid.appendChild(field('Priority', selectInput('priority', record.priority || 'Normal', Lib.CHOICES.priority)));
    grid.appendChild(field('Assigned to', textInput('assignedTo', record.assignedTo, { placeholder: 'Name' })));
    grid.appendChild(field('Opened', textInput('openedOn', record.openedOn, { type: 'date' })));
    grid.appendChild(field('Due', textInput('dueOn', record.dueOn, { type: 'date' })));
    form.appendChild(grid);
    form.appendChild(field('Notes', areaInput('notes', record.notes, 'What you want the next person to know')));
    form.appendChild(formError());
    var actions = el('div', { class: 'flex flex-col sm:flex-row gap-3' });
    var save = el('button', { type: 'submit', class: PRIMARY }, ['Save ticket']);
    actions.appendChild(save);
    actions.appendChild(button('Cancel', SECONDARY, function () { go('tickets'); }));
    form.appendChild(actions);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      saveTicket(form, existing);
    });
    page.appendChild(form);
    return page;
  }

  function saveTicket(form, existing) {
    var record = {
      id: existing && existing.id,
      _row: existing && existing._row,
      created: existing && existing.created,
      customer: form.elements.customer.value.trim(),
      issue: form.elements.issue.value.trim(),
      status: form.elements.status.value,
      priority: form.elements.priority.value,
      assignedTo: form.elements.assignedTo.value.trim(),
      openedOn: form.elements.openedOn.value,
      dueOn: form.elements.dueOn.value,
      notes: form.elements.notes.value.trim()
    };
    if (!record.customer || !record.issue) {
      showFormError(form, 'Enter a customer and an issue.');
      return;
    }
    saveAndReturn('Tickets', record, existing, 'tickets', form, 'Ticket saved.');
  }

  function saveAndReturn(title, record, existing, section, form, message) {
    var submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    persistRecord(title, record, existing).then(function () {
      state.banner = { tone: 'ok', text: state.mode === 'demo' ? message + ' Sample only — nothing was sent to Google.' : message };
      go(section);
    }).catch(function (err) {
      submit.disabled = false;
      showFormError(form, friendly(err));
    });
  }

  function renderCustomers() {
    var page = el('div', { class: 'space-y-5' });
    var head = sectionHead('People', 'Customers', 'Search is in this browser. The list itself is the Customers tab.');
    head.appendChild(button('Add customer', PRIMARY, function () { go('customers', 'new'); }));
    page.appendChild(head);
    var blocked = sheetBlocked('Customers');
    if (blocked) {
      page.appendChild(blocked);
      return page;
    }
    var search = textInput('customer-search', state.customerQuery, { placeholder: 'Search name, email, phone, company, or town' });
    search.addEventListener('input', function () {
      state.customerQuery = search.value;
      var list = document.getElementById('customer-list');
      if (list) fillCustomers(list);
    });
    page.appendChild(search);
    var list = el('div', { id: 'customer-list', class: 'space-y-3' });
    fillCustomers(list);
    page.appendChild(list);
    return page;
  }

  function fillCustomers(list) {
    var q = state.customerQuery.trim().toLowerCase();
    var rows = (state.data.Customers || []).filter(function (row) {
      if (!q) return true;
      return [row.name, row.email, row.phone, row.company, row.town, row.notes].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    list.replaceChildren();
    if (!rows.length) {
      list.appendChild(emptyNote(q ? 'No customers match that search.' : 'No customers yet.'));
      return;
    }
    rows.forEach(function (row) {
      var card = el('article', { class: 'cyber-panel rounded-2xl p-5' });
      var top = el('div', { class: 'flex flex-wrap items-start justify-between gap-3' });
      var copy = el('div');
      copy.appendChild(el('h2', { class: 'font-display font-bold text-white text-lg' }, [row.name || 'Unnamed']));
      copy.appendChild(el('p', { class: 'text-sm text-slate-300 mt-1' }, [[row.company, row.town].filter(Boolean).join(' · ') || 'No company yet']));
      top.appendChild(copy);
      if (row.sample) top.appendChild(sampleChip());
      card.appendChild(top);
      card.appendChild(el('p', { class: 'mt-3 text-sm text-slate-300' }, [[row.email, row.phone].filter(Boolean).join(' · ') || 'No email or phone']));
      if (row.notes) card.appendChild(el('p', { class: 'mt-2 text-sm text-slate-400 whitespace-pre-wrap' }, [row.notes]));
      card.appendChild(el('div', { class: 'mt-4' }, [button('Edit', SECONDARY, function () { go('customers', row.id); })]));
      list.appendChild(card);
    });
  }

  function renderCustomerEditor() {
    var existing = state.editorId === 'new' ? null : findRow('Customers', state.editorId);
    if (state.editorId !== 'new' && !existing) return missingRecord('customers', 'That customer is not in the current list.');
    var record = existing || {};
    var page = el('div', { class: 'space-y-5 max-w-3xl' });
    page.appendChild(sectionHead('People', existing ? 'Edit customer' : 'New customer', 'Only the name is required.'));
    var form = el('form', { class: 'cyber-panel rounded-3xl p-6 space-y-5', autocomplete: 'off' });
    var grid = el('div', { class: 'grid sm:grid-cols-2 gap-5' });
    grid.appendChild(field('Name', textInput('name', record.name, { required: true })));
    grid.appendChild(field('Company', textInput('company', record.company)));
    grid.appendChild(field('Email', textInput('email', record.email, { type: 'email' })));
    grid.appendChild(field('Phone', textInput('phone', record.phone, { type: 'tel' })));
    grid.appendChild(field('Town', textInput('town', record.town, { placeholder: 'Bel Air' })));
    form.appendChild(grid);
    form.appendChild(field('Notes', areaInput('notes', record.notes)));
    form.appendChild(formError());
    var actions = el('div', { class: 'flex flex-col sm:flex-row gap-3' });
    actions.appendChild(el('button', { type: 'submit', class: PRIMARY }, ['Save customer']));
    actions.appendChild(button('Cancel', SECONDARY, function () { go('customers'); }));
    form.appendChild(actions);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var recordToSave = {
        id: existing && existing.id,
        _row: existing && existing._row,
        created: existing && existing.created,
        name: form.elements.name.value.trim(),
        company: form.elements.company.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        town: form.elements.town.value.trim(),
        notes: form.elements.notes.value.trim()
      };
      if (!recordToSave.name) {
        showFormError(form, 'Enter a name.');
        return;
      }
      saveAndReturn('Customers', recordToSave, existing, 'customers', form, 'Customer saved.');
    });
    page.appendChild(form);
    return page;
  }

  function renderInquiries() {
    var page = el('div', { class: 'space-y-5' });
    var head = sectionHead('Inbox', 'Inquiries', 'Rows arrive from the Inquiries tab. The public form still builds an email. A sheet copy is optional and off until the Apps Script URL is set.');
    head.appendChild(button('Add an inquiry', PRIMARY, function () { go('inquiries', 'new'); }));
    page.appendChild(head);
    var blocked = sheetBlocked('Inquiries');
    if (blocked) {
      page.appendChild(blocked);
      return page;
    }
    var filters = ['New', 'Reviewed', 'Replied', 'Closed', 'All'].map(function (label) {
      return [label, function (row) {
        if (label === 'All') return true;
        if (label === 'New') return !row.status || row.status === 'New';
        return row.status === label;
      }];
    });
    page.appendChild(filterBar(filters, state.inquiryFilter, function (label) {
      state.inquiryFilter = label;
      paint(true);
    }));
    var chosen = filters.filter(function (item) { return item[0] === state.inquiryFilter; })[0];
    var rows = (state.data.Inquiries || []).filter(chosen[1]);
    if (!rows.length) {
      page.appendChild(emptyNote('No inquiries in this view. Website messages land here after the Apps Script in apps-script/inquiries.gs is deployed, or when someone adds one here.'));
      return page;
    }
    var list = el('div', { class: 'space-y-3' });
    rows.forEach(function (row) {
      var card = el('article', { class: 'cyber-panel rounded-2xl p-5 space-y-3' });
      var top = el('div', { class: 'flex flex-wrap items-start justify-between gap-3' });
      var copy = el('div');
      copy.appendChild(el('h2', { class: 'font-display font-bold text-white text-lg' }, [row.name || 'Unnamed']));
      copy.appendChild(el('p', { class: 'text-sm text-slate-300 mt-1' }, [row.service || 'No service selected']));
      top.appendChild(copy);
      var tags = el('div', { class: 'flex flex-wrap gap-2' });
      tags.appendChild(badge(row.status || 'New'));
      if (row.sample) tags.appendChild(sampleChip());
      top.appendChild(tags);
      card.appendChild(top);
      card.appendChild(el('p', { class: 'text-xs text-slate-400' }, [
        [row.email, row.phone, row.received ? 'Received ' + formatWhen(row.received) : '', row.source].filter(Boolean).join(' · ')
      ]));
      if (row.budget) card.appendChild(el('p', { class: 'text-sm text-slate-300' }, ['Budget / timeline: ' + row.budget]));
      if (row.details) card.appendChild(el('p', { class: 'text-sm text-slate-300 whitespace-pre-wrap' }, [row.details]));
      if (row.notes) card.appendChild(el('p', { class: 'text-sm text-slate-400 whitespace-pre-wrap' }, ['Notes: ' + row.notes]));
      card.appendChild(button('Update', SECONDARY, function () { go('inquiries', row.id); }));
      list.appendChild(card);
    });
    page.appendChild(list);
    return page;
  }

  function renderInquiryEditor() {
    var existing = state.editorId === 'new' ? null : findRow('Inquiries', state.editorId);
    if (state.editorId !== 'new' && !existing) return missingRecord('inquiries', 'That inquiry is not in the current list.');
    var record = existing || { status: 'New', source: 'Entered in the portal' };
    var page = el('div', { class: 'space-y-5 max-w-3xl' });
    page.appendChild(sectionHead('Inbox', existing ? 'Update inquiry' : 'New inquiry', 'Use this for a call or a walk-in. The public form does not need it.'));
    var form = el('form', { class: 'cyber-panel rounded-3xl p-6 space-y-5', autocomplete: 'off' });
    var grid = el('div', { class: 'grid sm:grid-cols-2 gap-5' });
    grid.appendChild(field('Name', textInput('name', record.name, { required: true })));
    grid.appendChild(field('Email', textInput('email', record.email, { type: 'email' })));
    grid.appendChild(field('Phone', textInput('phone', record.phone, { type: 'tel' })));
    grid.appendChild(field('Status', selectInput('status', record.status || 'New', Lib.CHOICES.inquiryStatus)));
    form.appendChild(grid);
    form.appendChild(field('Service', textInput('service', record.service)));
    form.appendChild(field('Budget / timeline', textInput('budget', record.budget, { placeholder: 'Only what they told you' })));
    form.appendChild(field('Details', areaInput('details', record.details)));
    form.appendChild(field('Notes', areaInput('notes', record.notes, 'Staff notes. Not sent back to the customer from this page.')));
    form.appendChild(formError());
    var actions = el('div', { class: 'flex flex-col sm:flex-row gap-3' });
    actions.appendChild(el('button', { type: 'submit', class: PRIMARY }, ['Save inquiry']));
    actions.appendChild(button('Cancel', SECONDARY, function () { go('inquiries'); }));
    form.appendChild(actions);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var recordToSave = {
        id: existing && existing.id,
        _row: existing && existing._row,
        received: (existing && existing.received) || stamp(),
        source: (existing && existing.source) || 'Entered in the portal',
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        status: form.elements.status.value,
        service: form.elements.service.value.trim(),
        budget: form.elements.budget.value.trim(),
        details: form.elements.details.value.trim(),
        notes: form.elements.notes.value.trim()
      };
      if (!recordToSave.name) {
        showFormError(form, 'Enter a name.');
        return;
      }
      saveAndReturn('Inquiries', recordToSave, existing, 'inquiries', form, 'Inquiry saved.');
    });
    page.appendChild(form);
    return page;
  }

  function renderDocList(kind) {
    var spec = Lib.DOC_SPEC[kind];
    var page = el('div', { class: 'space-y-5' });
    var head = sectionHead(spec.title + 's', spec.title + 's', 'Numbers, customers, line items, and totals come from what you type. Blank prices stay blank.');
    head.appendChild(button('New ' + spec.title.toLowerCase(), PRIMARY, function () { go(spec.sheet === 'Quotes' ? 'quotes' : 'invoices', 'new'); }));
    page.appendChild(head);
    var blocked = sheetBlocked(spec.sheet);
    if (blocked) {
      page.appendChild(blocked);
      return page;
    }
    var rows = state.data[spec.sheet] || [];
    if (!rows.length) {
      page.appendChild(emptyNote('No ' + spec.title.toLowerCase() + 's yet. Create one when you are ready to write the number and the lines. Nothing is priced for you.'));
      return page;
    }
    var list = el('div', { class: 'space-y-3' });
    rows.forEach(function (row) {
      var card = el('article', { class: 'cyber-panel rounded-2xl p-5' });
      var top = el('div', { class: 'flex flex-wrap items-start justify-between gap-3' });
      var copy = el('div');
      copy.appendChild(el('h2', { class: 'font-display font-bold text-white text-lg' }, [(row.number || 'No number') + ' · ' + (row.customer || 'No customer')]));
      copy.appendChild(el('p', { class: 'text-xs text-slate-400 mt-1' }, [
        [row.issuedOn ? 'Issued ' + formatDay(row.issuedOn) : '', row.status].filter(Boolean).join(' · ')
      ]));
      top.appendChild(copy);
      var side = el('div', { class: 'flex flex-col items-end gap-2' });
      side.appendChild(badge(row.status));
      side.appendChild(moneyLabel(row, totalsFor(kind, row)));
      top.appendChild(side);
      card.appendChild(top);
      var actions = el('div', { class: 'mt-4 flex flex-wrap gap-2' });
      actions.appendChild(button('Edit', SECONDARY, function () { go(kind === 'quote' ? 'quotes' : 'invoices', row.id); }));
      actions.appendChild(button('Print view', SECONDARY, function () { go('print', kind, row.id); }));
      card.appendChild(actions);
      list.appendChild(card);
    });
    page.appendChild(list);
    return page;
  }

  function renderDocEditor(kind) {
    var spec = Lib.DOC_SPEC[kind];
    var section = kind === 'quote' ? 'quotes' : 'invoices';
    var existing = state.editorId === 'new' ? null : findRow(spec.sheet, state.editorId);
    if (state.editorId !== 'new' && !existing) return missingRecord(section, 'That ' + spec.title.toLowerCase() + ' is not in the current list.');
    var record = existing || { status: spec.statuses[0], issuedOn: todayInput() };
    var lines = existing ? itemsFor(kind, existing.id) : [];
    var page = el('div', { class: 'space-y-5' });
    page.appendChild(sectionHead(spec.title, existing ? 'Edit ' + spec.title.toLowerCase() : 'New ' + spec.title, 'Type the prices you agreed. Leave a price blank and the total stays incomplete.'));
    var form = el('form', { class: 'cyber-panel rounded-3xl p-6 space-y-5', autocomplete: 'off', id: 'doc-form' });
    form.appendChild(customerList('doc-customers'));
    var grid = el('div', { class: 'grid sm:grid-cols-2 gap-5' });
    var numberWrap = el('div');
    var numberInput = textInput('number', record.number, { required: true, placeholder: spec.prefix + '-1001' });
    numberWrap.appendChild(field('Number', numberInput));
    var suggest = button('Suggest next number', GHOST, function () {
      var next = Lib.nextDocumentNumber((state.data[spec.sheet] || []).map(function (row) { return row.number; }), spec.prefix);
      var hint = numberWrap.querySelector('[data-number-hint]');
      if (!next) {
        hint.textContent = 'Nothing numbered ' + spec.prefix + '-1, ' + spec.prefix + '-2, … is in the sheet yet. Type the first number yourself.';
        return;
      }
      numberInput.value = next;
      hint.textContent = 'Filled from the highest ' + spec.prefix + ' number already in the sheet. Change it if you want a different one.';
    });
    numberWrap.appendChild(suggest);
    numberWrap.appendChild(el('p', { 'data-number-hint': '1', class: 'mt-1 text-xs text-slate-400' }, ['']));
    grid.appendChild(numberWrap);
    grid.appendChild(field('Customer', textInput('customer', record.customer, { required: true, list: 'doc-customers' })));
    grid.appendChild(field('Status', selectInput('status', record.status || spec.statuses[0], spec.statuses)));
    spec.dates.forEach(function (dateField) {
      grid.appendChild(field(dateField[1], textInput(dateField[0], record[dateField[0]], { type: 'date' })));
    });
    (spec.extra || []).forEach(function (extra) {
      grid.appendChild(field(extra[1], textInput(extra[0], record[extra[0]], { placeholder: extra[2] || '' })));
    });
    grid.appendChild(field('Tax amount', textInput('tax', record.tax, { placeholder: 'Leave blank if there is no tax', inputmode: 'decimal' }), 'Only a tax amount you type is added. There is no default rate.'));
    form.appendChild(grid);
    form.appendChild(field('Notes', areaInput('notes', record.notes)));
    form.appendChild(el('h2', { class: 'font-display font-bold text-white' }, ['Line items']));
    var host = el('div', { 'data-lines': '1', class: 'space-y-3' });
    (lines.length ? lines : [{ qty: '1', description: '', unitPrice: '' }]).forEach(function (line) {
      host.appendChild(lineRow(line));
    });
    form.appendChild(host);
    form.appendChild(button('Add a line', SECONDARY, function () {
      host.appendChild(lineRow({ qty: '1', description: '', unitPrice: '' }));
      updateDocPreview(form);
    }));
    var total = el('div', { 'data-doc-total': '1' });
    form.appendChild(total);
    form.appendChild(formError());
    var actions = el('div', { class: 'flex flex-col sm:flex-row gap-3' });
    actions.appendChild(el('button', { type: 'submit', class: PRIMARY }, ['Save ' + spec.title.toLowerCase()]));
    actions.appendChild(button('Cancel', SECONDARY, function () { go(section); }));
    if (existing) actions.appendChild(button('Print view', SECONDARY, function () { go('print', kind, existing.id); }));
    form.appendChild(actions);
    form.addEventListener('input', function () { updateDocPreview(form); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      saveDocument(kind, form, existing);
    });
    page.appendChild(form);
    updateDocPreview(form);
    return page;
  }

  function lineRow(item) {
    var row = el('div', { class: 'line-row grid grid-cols-2 sm:grid-cols-12 gap-2 items-end' });
    if (item.id) row.setAttribute('data-id', item.id);
    if (item._row) row.setAttribute('data-row', String(item._row));
    var description = textInput('', item.description, { placeholder: 'Description' });
    description.setAttribute('data-field', 'description');
    description.removeAttribute('id');
    var qty = textInput('', item.qty || '1', { placeholder: 'Qty', inputmode: 'decimal' });
    qty.setAttribute('data-field', 'qty');
    qty.removeAttribute('id');
    var price = textInput('', item.unitPrice, { placeholder: 'Unit price', inputmode: 'decimal' });
    price.setAttribute('data-field', 'unitPrice');
    price.removeAttribute('id');
    var descWrap = el('div', { class: 'col-span-2 sm:col-span-5' });
    descWrap.appendChild(description);
    var qtyWrap = el('div', { class: 'col-span-1 sm:col-span-2' });
    qtyWrap.appendChild(qty);
    var priceWrap = el('div', { class: 'col-span-1 sm:col-span-2' });
    priceWrap.appendChild(price);
    var total = el('p', { 'data-line-total': '1', class: 'sm:col-span-2 text-sm text-slate-300 sm:text-right sm:pb-3' }, ['Price not entered']);
    var remove = button('Remove', 'sm:col-span-1 text-xs text-slate-400 hover:text-white sm:pb-3 text-left', function () {
      var form = row.closest('form');
      var rows = row.parentNode.querySelectorAll('.line-row');
      if (rows.length === 1) {
        description.value = '';
        qty.value = '1';
        price.value = '';
        row.removeAttribute('data-id');
        row.removeAttribute('data-row');
      } else row.remove();
      if (form) updateDocPreview(form);
    });
    row.append(descWrap, qtyWrap, priceWrap, total, remove);
    return row;
  }

  function readLines(form) {
    return Array.prototype.map.call(form.querySelectorAll('.line-row'), function (row) {
      return {
        id: row.getAttribute('data-id') || '',
        _row: Number(row.getAttribute('data-row') || 0),
        description: row.querySelector('[data-field="description"]').value.trim(),
        qty: row.querySelector('[data-field="qty"]').value.trim(),
        unitPrice: row.querySelector('[data-field="unitPrice"]').value.trim()
      };
    }).filter(function (line) {
      return line.description || line.unitPrice;
    });
  }

  function totalsNode(totals) {
    var wrap = el('div', { class: 'rounded-2xl bg-slate-950/70 border border-slate-800 px-4 py-3 text-sm space-y-1' });
    if (totals.empty) {
      wrap.appendChild(el('p', { class: 'text-slate-300' }, ['No line items yet. A blank price is not treated as $0.']));
      return wrap;
    }
    if (totals.priced) wrap.appendChild(el('p', { class: 'text-slate-300' }, ['Priced lines: ' + Lib.formatUSD(totals.subtotal)]));
    if (totals.taxAmount != null) wrap.appendChild(el('p', { class: 'text-slate-300' }, ['Tax entered: ' + Lib.formatUSD(totals.taxAmount)]));
    if (totals.complete) wrap.appendChild(el('p', { class: 'text-white font-bold' }, ['Total: ' + Lib.formatUSD(totals.total)]));
    else wrap.appendChild(el('p', { class: 'text-amber-200' }, ['Total not shown. ' + totals.missing + ' line' + (totals.missing === 1 ? '' : 's') + ' still need both a quantity and a price.']));
    return wrap;
  }

  function updateDocPreview(form) {
    Array.prototype.forEach.call(form.querySelectorAll('.line-row'), function (row) {
      var math = Lib.lineMath(row.querySelector('[data-field="qty"]').value, row.querySelector('[data-field="unitPrice"]').value);
      row.querySelector('[data-line-total]').textContent = math.ok ? Lib.formatUSD(math.amount) : 'Price not entered';
    });
    var box = form.querySelector('[data-doc-total]');
    box.replaceChildren(totalsNode(Lib.documentTotals(readLines(form), form.elements.tax.value)));
  }

  function saveDocument(kind, form, existing) {
    var spec = Lib.DOC_SPEC[kind];
    var header = {
      id: existing && existing.id,
      _row: existing && existing._row,
      created: existing && existing.created,
      number: form.elements.number.value.trim(),
      customer: form.elements.customer.value.trim(),
      status: form.elements.status.value,
      tax: form.elements.tax.value.trim(),
      notes: form.elements.notes.value.trim()
    };
    spec.dates.forEach(function (dateField) {
      header[dateField[0]] = form.elements[dateField[0]].value;
    });
    (spec.extra || []).forEach(function (extra) {
      header[extra[0]] = form.elements[extra[0]].value.trim();
    });
    if (!header.number || !header.customer) {
      showFormError(form, 'Enter a number and a customer. Prices can stay blank.');
      return;
    }
    var lines = readLines(form);
    var nameless = lines.filter(function (line) { return !line.description; });
    if (nameless.length) {
      showFormError(form, 'Each line with a price needs a description.');
      return;
    }
    var submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    persistDocument(kind, header, lines, existing).then(function () {
      state.banner = {
        tone: 'ok',
        text: state.mode === 'demo'
          ? spec.title + ' saved in this sample preview only.'
          : spec.title + ' saved to the spreadsheet.'
      };
      go(kind === 'quote' ? 'quotes' : 'invoices');
    }).catch(function (err) {
      submit.disabled = false;
      showFormError(form, friendly(err));
    });
  }

  function renderDocs() {
    var page = el('div', { class: 'space-y-5' });
    page.appendChild(sectionHead('Drive', 'Company docs and how-tos', 'Files are listed from the Drive folder in portal/config.js. Opening one uses Google Drive, not a copy stored on this website.'));
    if (state.mode === 'live' && !driveFolderId()) {
      var raw = Lib.clean(cfg().driveFolderId);
      page.appendChild(emptyNote(raw && !Lib.googleId(raw)
        ? 'driveFolderId in portal/config.js is not a valid folder ID or Drive folder URL.'
        : 'No Drive folder is set. Create a folder, share it with employees as Restricted, and paste its ID into driveFolderId in portal/config.js.'));
      return page;
    }
    if (state.drive.error) page.appendChild(emptyNote(state.drive.error));
    var files = state.drive.files || [];
    if (!files.length && !state.drive.error) page.appendChild(emptyNote('That folder has no files yet, or Google returned an empty list.'));
    var list = el('div', { class: 'space-y-3' });
    files.forEach(function (file) {
      var card = el('article', { class: 'cyber-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3' });
      var copy = el('div');
      copy.appendChild(el('h2', { class: 'font-display font-bold text-white' }, [file.name || 'Untitled']));
      copy.appendChild(el('p', { class: 'text-xs text-slate-400 mt-1' }, [
        [fileKind(file.mimeType), file.modifiedTime ? 'Updated ' + formatWhen(file.modifiedTime) : ''].filter(Boolean).join(' · ')
      ]));
      card.appendChild(copy);
      var side = el('div', { class: 'flex items-center gap-2' });
      if (file.sample || state.mode === 'demo') {
        side.appendChild(sampleChip());
        side.appendChild(el('span', { class: 'text-xs text-slate-400' }, ['Not a Drive link']));
      } else if (safeHttp(file.webViewLink)) {
        side.appendChild(el('a', { href: file.webViewLink, target: '_blank', rel: 'noopener noreferrer', class: SECONDARY }, ['Open']));
      } else {
        side.appendChild(el('span', { class: 'text-xs text-slate-400' }, ['No open link from Google']));
      }
      card.appendChild(side);
      list.appendChild(card);
    });
    page.appendChild(list);
    return page;
  }

  function renderPrint() {
    var spec = Lib.DOC_SPEC[state.printKind];
    if (!spec) return missingRecord('home', 'Nothing to print.');
    var record = findRow(spec.sheet, state.printId);
    if (!record) return missingRecord(state.printKind === 'invoice' ? 'invoices' : 'quotes', 'That ' + spec.title.toLowerCase() + ' is not in the current list.');
    var lines = itemsFor(state.printKind, record.id);
    var totals = Lib.documentTotals(lines, record.tax);
    var page = el('div', { class: 'space-y-4' });
    var tools = el('div', { class: 'no-print flex flex-wrap gap-2' });
    tools.appendChild(button('Back', SECONDARY, function () { go(state.printKind === 'invoice' ? 'invoices' : 'quotes'); }));
    tools.appendChild(button('Print or save as PDF', PRIMARY, function () { window.print(); }));
    page.appendChild(tools);
    page.appendChild(el('p', { class: 'no-print text-xs text-slate-400' }, [
      'Use the browser print dialog and choose Save as PDF. This page does not upload a PDF anywhere.'
    ]));
    var sheet = el('article', { class: 'print-sheet max-w-3xl rounded-3xl p-6 sm:p-10' });
    if (record.sample || state.mode === 'demo') {
      sheet.appendChild(el('p', { class: 'font-mono text-xs uppercase tracking-wider text-amber-700 mb-4' }, [
        'Sample document. Not a real ' + spec.title.toLowerCase() + '. Dollar amounts are fake.'
      ]));
    }
    var top = el('div', { class: 'flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5' });
    var brand = el('div');
    brand.appendChild(el('p', { class: 'font-display text-xl font-extrabold' }, ['Legacy Computing Services LLC']));
    brand.appendChild(el('p', { class: 'text-sm mt-1' }, ['Bel Air, Maryland']));
    brand.appendChild(el('p', { class: 'text-sm' }, ['scott@legacycomputingservices.com']));
    top.appendChild(brand);
    var title = el('div', { class: 'sm:text-right' });
    title.appendChild(el('p', { class: 'font-display text-3xl font-extrabold' }, [spec.title]));
    title.appendChild(el('p', { class: 'font-mono text-sm mt-1' }, [record.number || 'No number']));
    title.appendChild(el('p', { class: 'text-sm mt-1' }, [record.status || 'Draft']));
    top.appendChild(title);
    sheet.appendChild(top);
    var meta = el('div', { class: 'grid sm:grid-cols-2 gap-4 py-5 text-sm' });
    meta.appendChild(el('p', {}, ['Customer: ' + (record.customer || '—')]));
    spec.dates.forEach(function (dateField) {
      if (record[dateField[0]]) meta.appendChild(el('p', {}, [dateField[1] + ': ' + formatDay(record[dateField[0]])]));
    });
    if (record.quoteNumber) meta.appendChild(el('p', {}, ['Quote number: ' + record.quoteNumber]));
    sheet.appendChild(meta);
    var table = el('table');
    table.appendChild(el('thead', {}, [el('tr', {}, [
      el('th', {}, ['Description']),
      el('th', {}, ['Qty']),
      el('th', {}, ['Unit price']),
      el('th', {}, ['Line'])
    ])]));
    var body = el('tbody');
    if (!lines.length) body.appendChild(el('tr', {}, [el('td', { colspan: '4' }, ['No line items.'])]));
    lines.forEach(function (line) {
      var math = Lib.lineMath(line.qty, line.unitPrice);
      body.appendChild(el('tr', {}, [
        el('td', {}, [line.description || '']),
        el('td', {}, [line.qty || '']),
        el('td', {}, [Lib.parseNumber(line.unitPrice) == null ? 'Price not entered' : Lib.formatUSD(Lib.parseNumber(line.unitPrice))]),
        el('td', {}, [math.ok ? Lib.formatUSD(math.amount) : 'Price not entered'])
      ]));
    });
    table.appendChild(body);
    sheet.appendChild(table);
    var sum = el('div', { class: 'mt-4 text-sm space-y-1 text-right' });
    if (!totals.empty && totals.priced) sum.appendChild(el('p', {}, ['Priced lines ' + Lib.formatUSD(totals.subtotal)]));
    if (totals.taxAmount != null) sum.appendChild(el('p', {}, ['Tax ' + Lib.formatUSD(totals.taxAmount)]));
    if (totals.complete) sum.appendChild(el('p', { class: 'text-lg font-bold' }, ['Total ' + Lib.formatUSD(totals.total)]));
    else if (!totals.empty) sum.appendChild(el('p', {}, ['Total incomplete. A line is missing a quantity or a price.']));
    sheet.appendChild(sum);
    if (record.notes) sheet.appendChild(el('p', { class: 'mt-6 text-sm whitespace-pre-wrap' }, [record.notes]));
    sheet.appendChild(el('p', { class: 'mt-8 text-xs text-slate-500' }, [
      'Printed from the employee portal. Figures are whatever was typed into the sheet. This is not a filed tax document.'
    ]));
    page.appendChild(sheet);
    return page;
  }

  function missingRecord(section, text) {
    var page = el('div', { class: 'space-y-4' });
    page.appendChild(emptyNote(text));
    page.appendChild(button('Back', SECONDARY, function () { go(section); }));
    return page;
  }

  function enterDemo() {
    var sample = Lib.sampleBundle(new Date());
    state.mode = 'demo';
    state.profile = { name: 'Sample employee', email: 'sample.employee@example.test' };
    state.token = null;
    state.data = sample;
    state.events = sample.events;
    state.drive = { files: sample.files, error: '', folderId: 'sample' };
    state.sheetsError = '';
    state.calendarError = '';
    state.banner = null;
    state.expired = false;
    state.busy = '';
    state.parsed = {};
    state.missingTabs = [];
    go('home');
  }

  function signOut() {
    clearTimeout(expiryTimer);
    state.mode = 'gate';
    state.token = null;
    state.profile = null;
    state.grantedScope = '';
    state.data = Lib.emptyData();
    state.events = [];
    state.drive = { files: [], error: '', folderId: '' };
    state.sessionSpreadsheetId = '';
    state.createdSheet = null;
    state.banner = null;
    state.expired = false;
    state.busy = '';
    state.sheetsError = '';
    state.calendarError = '';
    if (location.hash && location.hash !== '#') location.hash = '';
    paint();
  }

  function signIn() {
    if (!Lib.clientConfigured(cfg()) || !Lib.allowedDomain(cfg())) return;
    state.banner = null;
    state.busy = 'Opening Google…';
    paint();
    loadGis().then(function () {
      var client = google.accounts.oauth2.initTokenClient({
        client_id: Lib.clean(cfg().clientId),
        scope: IDENTITY_SCOPES,
        hd: Lib.allowedDomain(cfg()),
        prompt: 'select_account',
        callback: onIdentityToken,
        error_callback: onGisError
      });
      client.requestAccessToken();
    }).catch(function (err) {
      state.busy = '';
      state.banner = { tone: 'bad', text: err.message || 'Google sign-in could not start.' };
      paint();
    });
  }

  function onGisError(err) {
    var type = err && err.type;
    var text = 'Google sign-in did not finish.';
    if (type === 'popup_failed_to_open') text = 'The Google window did not open. Allow pop-ups for this site and try again.';
    if (type === 'popup_closed') text = 'The Google window was closed before sign-in finished.';
    state.busy = '';
    state.banner = { tone: 'bad', text: text };
    paint();
  }

  function onIdentityToken(resp) {
    if (!resp || resp.error) {
      state.busy = '';
      state.banner = { tone: 'bad', text: resp && resp.error === 'access_denied' ? 'Sign-in was cancelled.' : 'Google did not complete sign-in.' };
      paint();
      return;
    }
    googleFetch('https://www.googleapis.com/oauth2/v3/userinfo', { token: resp.access_token }).then(function (profile) {
      if (!Lib.domainAllowed(profile, Lib.allowedDomain(cfg()))) {
        return revoke(resp.access_token).then(function () {
          state.busy = '';
          state.profile = null;
          state.banner = { tone: 'bad', text: rejectionText(profile) };
          paint();
        });
      }
      state.profile = profile;
      requestDataAccess();
    }).catch(function (err) {
      state.busy = '';
      state.banner = { tone: 'bad', text: 'Could not check the Google account domain. ' + (err.message || '') };
      paint();
    });
  }

  function rejectionText(profile) {
    var domain = Lib.allowedDomain(cfg());
    var who = profile && profile.email ? profile.email : 'That Google account';
    return who + ' is not a ' + domain + ' Workspace account. The portal checks the hosted domain Google sends (hd) and does not accept other accounts. The token from this attempt was revoked.';
  }

  function requestDataAccess() {
    var client = google.accounts.oauth2.initTokenClient({
      client_id: Lib.clean(cfg().clientId),
      scope: DATA_SCOPES,
      include_granted_scopes: true,
      hd: Lib.allowedDomain(cfg()),
      prompt: '',
      callback: function (resp) {
        if (!resp || resp.error) {
          state.busy = '';
          state.banner = { tone: 'bad', text: 'Google did not grant access to Sheets. The portal cannot open company records without it.' };
          paint();
          return;
        }
        var granted = resp.scope || '';
        if (granted.indexOf('https://www.googleapis.com/auth/spreadsheets') === -1) {
          state.busy = '';
          state.banner = { tone: 'bad', text: 'Sheets access was not granted, so tickets, customers, and quotes cannot load.' };
          paint();
          return;
        }
        state.token = resp.access_token;
        state.grantedScope = granted;
        state.expiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
        state.expired = false;
        state.mode = 'live';
        state.busy = '';
        armExpiry(resp.expires_in);
        loadAll().then(function () {
          state.banner = null;
          go('home');
        });
      },
      error_callback: onGisError
    });
    client.requestAccessToken();
  }

  function armExpiry(seconds) {
    clearTimeout(expiryTimer);
    var ms = Math.max(5000, (Number(seconds) || 3600) * 1000 - 20000);
    expiryTimer = setTimeout(function () {
      if (state.mode !== 'live') return;
      state.expired = true;
      state.banner = { tone: 'warn', text: 'This Google sign-in is about to expire, or has expired. Sign in again before saving. The token is only kept in this tab.' };
      paint(true);
    }, ms);
  }

  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.querySelector('script[data-gis]');
      var done = function () {
        if (window.google && google.accounts && google.accounts.oauth2) resolve();
        else reject(new Error('Google sign-in loaded, but the sign-in library was not available.'));
      };
      var fail = function () {
        reject(new Error('Google sign-in did not load. Check the connection and try again.'));
      };
      if (script) {
        script.addEventListener('load', done);
        script.addEventListener('error', fail);
        return;
      }
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.dataset.gis = '1';
      script.onload = done;
      script.onerror = fail;
      document.head.appendChild(script);
    });
  }

  function revoke(token) {
    return new Promise(function (resolve) {
      if (window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke) {
        google.accounts.oauth2.revoke(token, resolve);
        return;
      }
      fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).then(resolve, resolve);
    });
  }

  function googleFetch(url, options) {
    var opts = options || {};
    if (!opts.token && state.mode === 'demo') {
      return Promise.reject(new Error('Sample mode does not call Google.'));
    }
    var headers = { Authorization: 'Bearer ' + (opts.token || state.token) };
    var init = { method: opts.method || 'GET', headers: headers };
    if (opts.body != null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch(url, init).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) {
          try { data = JSON.parse(text); } catch (err) { data = { raw: text }; }
        }
        if (!res.ok) {
          var apiMsg = data && data.error && (data.error.message || data.error.status);
          var error = new Error(apiMsg || res.statusText || 'Google request failed');
          error.status = res.status;
          throw error;
        }
        return data;
      });
    });
  }

  function friendly(err) {
    var msg = err && err.message ? err.message : 'Google returned an error.';
    if (/has not been used in project|it is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(msg)) {
      return 'A Google API this portal needs is turned off in the Cloud project. Enable Sheets, Drive, and Calendar. Google said: ' + msg;
    }
    if (err && (err.status === 401)) {
      state.expired = true;
      return 'The Google sign-in expired. Sign out and sign in again.';
    }
    if (err && (err.status === 403 || err.status === 404)) {
      return 'Google refused or could not find that file. Check the ID in portal/config.js and share the file with this account. Google said: ' + msg;
    }
    return msg;
  }

  function scopeHas(fragment) {
    return (state.grantedScope || '').indexOf(fragment) !== -1;
  }

  function loadAll() {
    state.busy = 'Loading from Google…';
    paint();
    var jobs = [];
    if (spreadsheetId()) {
      jobs.push(loadSheets().catch(function (err) { state.sheetsError = friendly(err); }));
    } else state.sheetsError = '';
    if (driveFolderId()) {
      if (scopeHas('drive')) jobs.push(loadDrive().catch(function (err) { state.drive = { files: [], error: friendly(err), folderId: driveFolderId() }; }));
      else state.drive = { files: [], error: 'Drive access was not granted. Docs cannot be listed. You can still open Drive from the overview links.', folderId: '' };
    }
    if (scopeHas('calendar')) {
      jobs.push(loadCalendar().catch(function (err) { state.calendarError = friendly(err); state.events = []; }));
    } else {
      state.calendarError = 'Calendar access was not granted. The Calendar link still opens Google Calendar.';
      state.events = [];
    }
    return Promise.all(jobs).then(function () {
      state.busy = '';
    });
  }

  function loadSheets() {
    var id = spreadsheetId();
    return googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '?fields=' + encodeURIComponent('spreadsheetUrl,properties.title,sheets.properties')).then(function (meta) {
      state.spreadsheetUrl = (meta && meta.spreadsheetUrl) || ('https://docs.google.com/spreadsheets/d/' + id + '/edit');
      state.spreadsheetTitle = meta && meta.properties && meta.properties.title || '';
      state.sheetIds = {};
      (meta.sheets || []).forEach(function (sheet) {
        state.sheetIds[sheet.properties.title] = sheet.properties.sheetId;
      });
      state.missingTabs = Lib.SHEETS.filter(function (spec) {
        return state.sheetIds[spec.title] == null;
      }).map(function (spec) { return spec.title; });
      var present = Lib.SHEETS.filter(function (spec) { return state.sheetIds[spec.title] != null; });
      if (!present.length) {
        state.data = Lib.emptyData();
        state.parsed = {};
        state.sheetsError = '';
        return null;
      }
      var query = present.map(function (spec) {
        return 'ranges=' + encodeURIComponent(spec.title + '!A1:' + Lib.colLetter(spec.columns.length));
      }).join('&');
      return googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values:batchGet?' + query).then(function (batch) {
        var next = Lib.emptyData();
        state.parsed = {};
        state.headers = {};
        (batch.valueRanges || []).forEach(function (range, index) {
          var spec = present[index];
          var parsed = Lib.rowsFromValues(range.values || [], Lib.columnsOf(spec.title));
          state.parsed[spec.title] = parsed;
          state.headers[spec.title] = parsed.headerRow;
          next[spec.title] = parsed.rows;
        });
        state.data = next;
        state.sheetsError = '';
      });
    });
  }

  function headerRowFor(title) {
    var columns = Lib.columnsOf(title);
    var current = state.headers[title];
    if (current && current.some(function (cell) { return String(cell || '').trim(); })) return current;
    return columns.map(function (col) { return col.header; });
  }

  function upsert(title, record) {
    if (state.mode === 'demo') {
      demoUpsert(title, record);
      return Promise.resolve();
    }
    var id = spreadsheetId();
    var columns = Lib.columnsOf(title);
    var headers = headerRowFor(title);
    var row = Lib.recordToCells(record, headers, columns);
    var width = Lib.colLetter(headers.length);
    if (record._row) {
      var range = title + '!A' + record._row + ':' + width + record._row;
      return googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/' + encodeURIComponent(range) + '?valueInputOption=RAW', {
        method: 'PUT',
        body: { range: range, majorDimension: 'ROWS', values: [row] }
      });
    }
    var appendRange = title + '!A1:' + width + '1';
    return googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/' + encodeURIComponent(appendRange) + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', {
      method: 'POST',
      body: { range: appendRange, majorDimension: 'ROWS', values: [row] }
    });
  }

  function demoUpsert(title, record) {
    if (!state.data[title]) state.data[title] = [];
    if (!record.id) record.id = newId();
    record.sample = true;
    var list = state.data[title];
    var index = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === record.id) index = i;
    if (index === -1) list.unshift(Object.assign({}, record));
    else list[index] = Object.assign({}, list[index], record);
  }

  function persistRecord(title, record, existing) {
    stampUpdate(record, existing);
    return upsert(title, record).then(function () {
      if (state.mode === 'live') return loadSheets();
      return null;
    });
  }

  function persistDocument(kind, header, lines, existing) {
    var spec = Lib.DOC_SPEC[kind];
    stampUpdate(header, existing);
    return upsert(spec.sheet, header).then(function () {
      var previous = (state.data[spec.items] || []).filter(function (item) {
        return item[spec.parentKey] === header.id;
      });
      var keep = {};
      var chain = Promise.resolve();
      lines.forEach(function (line) {
        chain = chain.then(function () {
          var prior = line.id ? findRow(spec.items, line.id) : null;
          line.id = (prior && prior.id) || line.id || newId();
          line[spec.parentKey] = header.id;
          line[spec.parentNumberKey] = header.number;
          if (prior && prior._row) line._row = prior._row;
          else delete line._row;
          keep[line.id] = true;
          return upsert(spec.items, line);
        });
      });
      return chain.then(function () {
        var removed = previous.filter(function (item) { return !keep[item.id]; });
        if (state.mode === 'demo') {
          state.data[spec.items] = (state.data[spec.items] || []).filter(function (item) {
            return item[spec.parentKey] !== header.id || keep[item.id];
          });
          return null;
        }
        return deleteSheetRows(spec.items, removed.map(function (item) { return item._row; })).then(loadSheets);
      });
    });
  }

  function deleteSheetRows(title, rowNumbers) {
    var sheetId = state.sheetIds[title];
    var rows = rowNumbers.filter(Boolean).sort(function (a, b) { return b - a; });
    if (!rows.length || sheetId == null) return Promise.resolve();
    return googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId()) + ':batchUpdate', {
      method: 'POST',
      body: {
        requests: rows.map(function (row) {
          return { deleteDimension: { range: { sheetId: sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row } } };
        })
      }
    });
  }

  function loadDrive() {
    var id = driveFolderId();
    var q = "'" + id + "' in parents and trashed = false";
    var fields = 'files(id,name,mimeType,webViewLink,modifiedTime)';
    var base = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q)
      + '&fields=' + encodeURIComponent(fields)
      + '&orderBy=' + encodeURIComponent('folder,name')
      + '&pageSize=100';
    return googleFetch(base + '&supportsAllDrives=true&includeItemsFromAllDrives=true').catch(function () {
      return googleFetch(base);
    }).then(function (data) {
      state.drive = { files: (data && data.files) || [], error: '', folderId: id };
    });
  }

  function loadCalendar() {
    var url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=6&singleEvents=true&orderBy=startTime&timeMin=' + encodeURIComponent(new Date().toISOString());
    return googleFetch(url).then(function (data) {
      state.events = ((data && data.items) || []).map(function (item) {
        return {
          id: item.id,
          summary: item.summary || '(No title)',
          start: item.start && (item.start.dateTime || item.start.date) || '',
          htmlLink: item.htmlLink || ''
        };
      });
      state.calendarError = '';
    });
  }

  function createSpreadsheet() {
    if (state.mode !== 'live' || state.busy) return;
    state.busy = 'Creating the spreadsheet…';
    state.banner = null;
    paint(true);
    var body = {
      properties: { title: 'Legacy Computing Services — Portal' },
      sheets: [startHereSheet()].concat(Lib.SHEETS.map(sheetResource))
    };
    googleFetch('https://sheets.googleapis.com/v4/spreadsheets', { method: 'POST', body: body }).then(function (created) {
      state.createdSheet = { id: created.spreadsheetId, url: created.spreadsheetUrl };
      state.sessionSpreadsheetId = created.spreadsheetId;
      return formatCreated(created).catch(function () { return null; }).then(function () {
        return loadAll();
      }).then(function () {
        state.banner = {
          tone: 'ok',
          text: 'Spreadsheet created in your Google Drive. Copy the ID into portal/config.js, commit that file, and share the spreadsheet with employees. Leave general access Restricted.'
        };
        go('home');
      });
    }).catch(function (err) {
      state.busy = '';
      state.banner = { tone: 'bad', text: friendly(err) };
      paint();
    });
  }

  function startHereSheet() {
    var lines = [
      'Legacy Computing Services — employee portal spreadsheet',
      'Share this file only with employees. Leave general access Restricted. Do not choose Anyone with the link.',
      'Do not rename these tabs: Tickets, Customers, Inquiries, Quotes, QuoteItems, Invoices, InvoiceItems.',
      'Do not delete or rename the header row on those tabs. The portal reads the header names.',
      'Quote and invoice lines are stored on QuoteItems and InvoiceItems.',
      'The public website does not read this file. Inquiries show up after the Apps Script is connected, or when you type one in the portal.',
      'Paste the spreadsheet ID into portal/config.js. It is the long code between /d/ and /edit in the address bar.'
    ];
    return {
      properties: { title: 'Start here' },
      data: [{
        startRow: 0,
        startColumn: 0,
        rowData: lines.map(function (line) {
          return { values: [{ userEnteredValue: { stringValue: line } }] };
        })
      }]
    };
  }

  function sheetResource(spec) {
    return {
      properties: { title: spec.title, gridProperties: { frozenRowCount: 1 } },
      data: [{
        startRow: 0,
        startColumn: 0,
        rowData: [{
          values: spec.columns.map(function (col) {
            return { userEnteredValue: { stringValue: col[1] } };
          })
        }]
      }]
    };
  }

  function statusChoices(title) {
    if (title === 'Tickets') return Lib.CHOICES.ticketStatus;
    if (title === 'Inquiries') return Lib.CHOICES.inquiryStatus;
    if (title === 'Quotes') return Lib.CHOICES.quoteStatus;
    if (title === 'Invoices') return Lib.CHOICES.invoiceStatus;
    return null;
  }

  function formatCreated(created) {
    var byTitle = {};
    (created.sheets || []).forEach(function (sheet) {
      byTitle[sheet.properties.title] = sheet.properties.sheetId;
    });
    var requests = [];
    Lib.SHEETS.forEach(function (spec) {
      var sheetId = byTitle[spec.title];
      if (sheetId == null) return;
      requests.push({
        repeatCell: {
          range: { sheetId: sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: spec.columns.length },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, foregroundColor: { red: 0.94, green: 0.97, blue: 1 } },
              backgroundColor: { red: 0.05, green: 0.12, blue: 0.22 }
            }
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)'
        }
      });
      var lists = { Status: statusChoices(spec.title) };
      if (spec.title === 'Tickets') lists.Priority = Lib.CHOICES.priority;
      Object.keys(lists).forEach(function (header) {
        if (!lists[header]) return;
        var index = -1;
        spec.columns.forEach(function (col, i) { if (col[1] === header) index = i; });
        if (index === -1) return;
        requests.push({
          setDataValidation: {
            range: { sheetId: sheetId, startRowIndex: 1, endRowIndex: 500, startColumnIndex: index, endColumnIndex: index + 1 },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: lists[header].map(function (value) { return { userEnteredValue: value }; })
              },
              showCustomUi: true,
              strict: false
            }
          }
        });
      });
    });
    if (!requests.length) return Promise.resolve();
    return googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(created.spreadsheetId) + ':batchUpdate', {
      method: 'POST',
      body: { requests: requests }
    });
  }

  function repairSheets() {
    if (state.mode !== 'live' || !spreadsheetId()) return;
    state.busy = 'Updating tabs…';
    paint(true);
    var missing = Lib.SHEETS.filter(function (spec) { return state.sheetIds[spec.title] == null; });
    var chain = Promise.resolve();
    if (missing.length) {
      chain = googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId()) + ':batchUpdate', {
        method: 'POST',
        body: {
          requests: missing.map(function (spec) {
            return { addSheet: { properties: { title: spec.title, gridProperties: { frozenRowCount: 1 } } } };
          })
        }
      }).then(loadSheets);
    }
    chain.then(function () {
      var writes = Promise.resolve();
      Lib.SHEETS.forEach(function (spec) {
        writes = writes.then(function () {
          var parsed = state.parsed[spec.title];
          var hasData = parsed && parsed.rows && parsed.rows.length;
          var badHeader = !parsed || (parsed.missingHeaders && parsed.missingHeaders.length);
          if (hasData || !badHeader) return null;
          var range = spec.title + '!A1:' + Lib.colLetter(spec.columns.length) + '1';
          return googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId()) + '/values/' + encodeURIComponent(range) + '?valueInputOption=RAW', {
            method: 'PUT',
            body: { range: range, majorDimension: 'ROWS', values: [spec.columns.map(function (col) { return col[1]; })] }
          });
        });
      });
      return writes.then(loadSheets);
    }).then(function () {
      state.busy = '';
      state.banner = { tone: 'ok', text: 'Missing tabs and empty header rows were added. Existing data rows were left alone.' };
      paint(true);
    }).catch(function (err) {
      state.busy = '';
      state.banner = { tone: 'bad', text: friendly(err) };
      paint(true);
    });
  }

  function boot() {
    if (!Lib) {
      document.getElementById('app').textContent = 'The portal scripts did not load.';
      return;
    }
    window.addEventListener('hashchange', function () {
      if (state.mode === 'gate') return;
      applyHash();
      paint();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || state.mode === 'gate') return;
      if (state.section === 'print') go(state.printKind === 'invoice' ? 'invoices' : 'quotes');
      else if (state.editorId) go(state.section);
    });
    paint();
  }

  boot();
})();
