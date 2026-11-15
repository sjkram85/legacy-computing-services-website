/* Employee portal. The page is public. Company records stay in Google.
   Access is the signed-in user's own token plus Google's sharing, not this file. */
(function () {
  'use strict';

  var Lib = window.LCSPortal;
  var IDENTITY_SCOPES = 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
  var DATA_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
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
    viewer: null,
    calendarError: '',
    sheetsError: '',
    customerQuery: '',
    ticketFilter: 'Open work',
    inquiryFilter: 'New',
    proposalFilter: 'Open',
    proposalSheetReady: false,
    proposalSheetWorking: false,
    proposalSheetFailed: '',
    intakeDialog: null
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

  function calendarEmbedSrc() {
    if (state.mode !== 'live') return '';
    var configured = Lib.clean(cfg().calendarId);
    if (Lib.isPlaceholder(configured)) configured = '';
    var id = configured || (state.profile && state.profile.email) || '';
    if (!id) return '';
    var agenda = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    return Lib.calendarEmbedUrl(id, { mode: agenda ? 'AGENDA' : 'WEEK', timeZone: 'America/New_York' });
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
    var intakeEmail = document.getElementById('intake-dialog-email');
    if (intakeEmail) intakeEmail.focus();
    if (state.mode === 'live' && state.section === 'proposals') scheduleProposalSheet();
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
    state.viewer = null;
    state.intakeDialog = null;
    var parts = hashParts();
    if (parts[0] === 'print' && (parts[1] === 'quote' || parts[1] === 'invoice' || parts[1] === 'proposal')) {
      state.section = 'print';
      state.printKind = parts[1];
      state.printId = parts[2] || '';
      state.editorId = '';
      return;
    }
    var known = { home: 1, tickets: 1, customers: 1, inquiries: 1, proposals: 1, quotes: 1, invoices: 1, docs: 1, sheet: 1 };
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
    if (existing && existing._cells && record._cells == null) record._cells = existing._cells;
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
    var node = el('div', { class: 'rounded-2xl border px-4 py-3 text-sm leading-relaxed ' + tone, role: 'status' });
    node.appendChild(document.createTextNode(state.banner.text || ''));
    if (safeHttp(state.banner.href)) {
      node.appendChild(document.createTextNode(' '));
      node.appendChild(el('a', {
        href: state.banner.href,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'font-semibold underline'
      }, [state.banner.hrefLabel || 'Open']));
    }
    if (state.banner.actionLabel && typeof state.banner.action === 'function') {
      node.appendChild(document.createTextNode(' '));
      node.appendChild(button(state.banner.actionLabel, 'font-semibold underline', state.banner.action));
    }
    return node;
  }

  function demoBanner() {
    return el('div', { class: 'rounded-2xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 leading-relaxed' }, [
      'Sample data. Not connected to Google. Every name, ticket, proposal, and dollar amount on this screen is fake and is not a company record.'
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
      'This page is public and stores no customer list, no prices, and no files. After sign-in, Google Sheets, Drive, Docs, and Calendar are opened with your own Google access. If a file is not shared with you, Google will not show it.'
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
        'Enable the Sheets, Drive, Docs, and Calendar APIs, then create a Web OAuth client.',
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
    var dialog = renderIntakeDialog();
    if (dialog) page.appendChild(dialog);
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
      ['proposals', 'Proposals'],
      ['quotes', 'Quotes'],
      ['invoices', 'Invoices'],
      ['docs', 'Docs'],
      ['sheet', 'Spreadsheet']
    ].forEach(function (item) {
      var on = state.section === item[0];
      if (state.section === 'print') {
        on = (state.printKind === 'invoice' && item[0] === 'invoices') || (state.printKind === 'quote' && item[0] === 'quotes') || (state.printKind === 'proposal' && item[0] === 'proposals');
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
    if (state.section === 'proposals') return state.editorId ? renderProposalEditor() : renderProposals();
    if (state.section === 'quotes') return state.editorId ? renderDocEditor('quote') : renderDocList('quote');
    if (state.section === 'invoices') return state.editorId ? renderDocEditor('invoice') : renderDocList('invoice');
    if (state.section === 'docs') return renderDocs();
    if (state.section === 'sheet') return renderSheet();
    if (state.section === 'print') return renderPrint();
    return renderHome();
  }

  function quickLinks() {
    var domain = Lib.allowedDomain(cfg()) || 'legacycomputingservices.com';
    return [
      ['Gmail', 'https://mail.google.com/a/' + domain, 'Cannot be embedded'],
      ['Drive', 'https://drive.google.com/', 'Files'],
      ['Calendar', 'https://calendar.google.com/calendar/u/0/r', 'Full calendar'],
      ['Meet', 'https://meet.google.com/', 'Video calls'],
      ['Admin', 'https://admin.google.com/', 'Workspace admins']
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
      link.appendChild(el('span', { class: 'block mt-2 font-mono text-[10px] uppercase tracking-wider text-sky-300' }, ['Opens in a new tab']));
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
        'No spreadsheet ID is in portal/config.js. This button creates a Google Sheet in your Drive with the Tickets, Customers, Inquiries, Quotes, QuoteItems, Invoices, InvoiceItems, and Proposals tabs and their header rows. It does not add sample customers or prices.'
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
    page.appendChild(sectionHead('Workspace', 'Dashboard', 'Gmail cannot be embedded, so Gmail, Drive, Calendar, Meet, and Admin open in a new tab. The calendar below stays on this page.'));
    page.appendChild(linkGrid());
    page.appendChild(renderCalendarEmbed());
    var callout = sheetCallout();
    if (callout) page.appendChild(callout);
    if (state.sheetsError) page.appendChild(emptyNote(state.sheetsError));
    var openTickets = (state.data.Tickets || []).filter(function (row) { return row.status !== 'Done'; }).length;
    var fresh = (state.data.Inquiries || []).filter(function (row) { return !row.status || row.status === 'New'; }).length;
    var openQuotes = (state.data.Quotes || []).filter(function (row) { return row.status === 'Draft' || row.status === 'Sent'; }).length;
    var unpaid = (state.data.Invoices || []).filter(function (row) { return row.status === 'Draft' || row.status === 'Sent'; }).length;
    var openProposals = (state.data.Proposals || []).filter(function (row) {
      return !row.status || row.status === 'Draft' || row.status === 'Sent';
    }).length;
    var stats = el('div', { class: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3' });
    stats.appendChild(statCard('Open tickets', openTickets, 'tickets'));
    stats.appendChild(statCard('Customers', (state.data.Customers || []).length, 'customers'));
    stats.appendChild(statCard('New inquiries', fresh, 'inquiries'));
    stats.appendChild(statCard('Open proposals', openProposals, 'proposals'));
    stats.appendChild(statCard('Open quotes', openQuotes, 'quotes'));
    stats.appendChild(statCard('Unpaid invoices', unpaid, 'invoices'));
    page.appendChild(stats);
    page.appendChild(recentTickets());
    return page;
  }

  function sampleLayout(label) {
    return el('div', {
      class: 'w-full h-80 sm:h-[32rem] rounded-2xl border border-dashed border-amber-400/50 bg-slate-950/80 flex items-center justify-center p-6 text-center'
    }, [
      el('p', { class: 'max-w-md text-sm text-amber-100 leading-relaxed' }, [
        'Sample — ' + label + '. Not connected to Google.'
      ])
    ]);
  }

  function renderCalendarEmbed() {
    var wrap = el('div', { class: 'space-y-4' });
    var box = el('section', { class: 'cyber-panel rounded-3xl p-6 space-y-4' });
    box.appendChild(el('h2', { class: 'font-display text-xl font-bold text-white' }, ['Calendar']));
    var src = calendarEmbedSrc();
    if (state.mode === 'demo') {
      box.appendChild(el('p', { class: 'text-sm text-amber-100 leading-relaxed' }, [
        'Sample layout. Not a Google calendar. After sign-in, this frame embeds Google Calendar for calendarId in portal/config.js, or for the signed-in email when that setting is blank. A narrow window uses agenda mode.'
      ]));
      box.appendChild(sampleLayout('calendar embed'));
    } else if (src) {
      box.appendChild(el('p', { class: 'text-sm text-slate-300 leading-relaxed' }, [
        'Embedded from Google Calendar. A narrow window uses agenda mode. The dark frame is as far as Google’s embed follows this page. Google still decides who can see the calendar.'
      ]));
      box.appendChild(el('iframe', {
        id: 'lcs-calendar-frame',
        title: 'Google Calendar',
        src: src,
        class: 'w-full h-80 sm:h-[32rem] rounded-2xl border border-slate-700 bg-[#0B131E]'
      }));
    } else {
      box.appendChild(el('p', { class: 'text-sm text-slate-300 leading-relaxed' }, [
        'No calendar to embed yet. Set calendarId in portal/config.js, or sign in so the page can use that account’s email.'
      ]));
    }
    wrap.appendChild(box);
    wrap.appendChild(calendarCard());
    return wrap;
  }

  function calendarCard() {
    var card = el('section', { class: 'cyber-panel rounded-3xl p-6 space-y-4' });
    card.appendChild(el('h2', { class: 'font-display text-xl font-bold text-white' }, ['Upcoming']));
    card.appendChild(el('p', { class: 'text-sm text-slate-400 leading-relaxed' }, [
      'A short list from Calendar access, when Google granted it. This is the fallback under the embed.'
    ]));
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
      var sent = intakeBadge(row);
      if (sent) meta.appendChild(sent);
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
    var blocking = blockingHeaders(parsed);
    if (blocking.length && !(parsed.rows || []).length) {
      var warn = el('div', { class: 'space-y-3' });
      warn.appendChild(emptyNote('The ' + title + ' header row is missing: ' + blocking.join(', ') + '. Adding headers will not overwrite existing data rows.'));
      warn.appendChild(button('Add missing tabs and headers', SECONDARY, repairSheets));
      return warn;
    }
    return null;
  }

  function blockingHeaders(parsed) {
    if (!parsed || !parsed.missingHeaders || !parsed.missingHeaders.length) return [];
    return parsed.missingHeaders.filter(function (name) {
      return String(name).trim().toLowerCase() !== 'intake sent';
    });
  }

  function renderTickets() {
    var page = el('div', { class: 'space-y-5' });
    var head = sectionHead('Jobs', 'Tickets', 'Customer, issue, status, priority, who has it, dates, and notes. Stored on the Tickets tab. Send intake form opens a Gmail draft. This page does not send the email.');
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
    var sent = intakeBadge(row);
    if (sent) tags.appendChild(sent);
    if (row.sample) tags.appendChild(sampleChip());
    top.appendChild(tags);
    card.appendChild(top);
    var meta = el('p', { class: 'mt-3 text-xs text-slate-400' }, [
      [row.assignedTo ? 'Assigned to ' + row.assignedTo : 'Unassigned', row.openedOn ? 'Opened ' + formatDay(row.openedOn) : '', row.dueOn ? 'Due ' + formatDay(row.dueOn) : ''].filter(Boolean).join(' · ')
    ]);
    card.appendChild(meta);
    if (row.notes) card.appendChild(el('p', { class: 'mt-3 text-sm text-slate-300 whitespace-pre-wrap' }, [row.notes]));
    var actions = el('div', { class: 'mt-4 flex flex-wrap gap-3' });
    actions.appendChild(button('Update', SECONDARY, function () { go('tickets', row.id); }));
    actions.appendChild(intakeButton(row));
    card.appendChild(actions);
    return card;
  }

  function intakeBadge(row) {
    if (!row || !Lib.clean(row.intakeSent)) return null;
    var when = formatDay(row.intakeSent) || Lib.clean(row.intakeSent);
    return el('span', {
      class: 'inline-flex items-center px-2.5 py-1 rounded-md border border-emerald-400/40 bg-emerald-500/15 font-mono text-[11px] tracking-wide text-emerald-200'
    }, ['Intake sent ' + when]);
  }

  function intakeButton(row) {
    var node = button('Send intake form', SECONDARY, function () { startIntake(row); });
    node.title = 'Opens a Gmail draft for you to review and send. This page does not send email.';
    return node;
  }

  function startIntake(row) {
    if (!row) return;
    var email = Lib.customerEmail(state.data.Customers, row.customer);
    if (!Lib.looksLikeEmail(email)) {
      state.intakeDialog = { ticketId: row.id, customer: row.customer };
      paint(true);
      return;
    }
    openIntakeCompose(row, email);
  }

  function intakeRecord(row) {
    return stampUpdate({
      id: row.id,
      _row: row._row,
      created: row.created,
      customer: row.customer,
      issue: row.issue,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assignedTo,
      openedOn: row.openedOn,
      dueOn: row.dueOn,
      notes: row.notes,
      intakeSent: Lib.isoDate(0),
      _cells: row._cells
    }, row);
  }

  function openTab(url) {
    var link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function openIntakeCompose(row, email) {
    var url = Lib.intakeComposeUrl(cfg(), email);
    if (!url) {
      state.intakeDialog = null;
      state.banner = {
        tone: 'bad',
        text: 'The intake form link in portal/config.js is missing or is not a public Google Form link. Nothing was opened, and this page did not send email.'
      };
      paint(true);
      return;
    }
    openTab(url);
    var record = intakeRecord(row);
    var when = formatDay(record.intakeSent) || record.intakeSent;
    state.intakeDialog = null;
    if (state.mode === 'demo') {
      demoUpsert('Tickets', record);
      state.banner = {
        tone: 'ok',
        text: 'Gmail opened in a new tab so you can review and send the intake form. This page did not send the email. Intake sent ' + when + ' is shown on the ticket. Sample only — nothing was written to Google.',
        href: url,
        hrefLabel: 'Open the Gmail draft again'
      };
      paint(true);
      return;
    }
    state.busy = 'Saving the intake date…';
    state.banner = null;
    paint(true);
    ensureIntakeColumn().then(function () {
      return writeIntakeCell(record);
    }).then(function () {
      return loadSheets();
    }).then(function () {
      state.busy = '';
      state.banner = {
        tone: 'ok',
        text: 'Gmail opened in a new tab so you can review and send the intake form. This page did not send the email. Intake sent ' + when + ' was saved on the ticket.',
        href: url,
        hrefLabel: 'Open the Gmail draft again'
      };
      paint(true);
    }).catch(function (err) {
      state.busy = '';
      state.banner = {
        tone: 'bad',
        text: 'Gmail opened, but the intake date was not saved. ' + friendly(err),
        href: url,
        hrefLabel: 'Open the Gmail draft again'
      };
      paint(true);
    });
  }

  function renderIntakeDialog() {
    if (!state.intakeDialog) return null;
    var row = findRow('Tickets', state.intakeDialog.ticketId);
    if (!row) return null;
    var who = row.customer || 'this customer';
    var overlay = el('div', {
      class: 'fixed inset-0 z-50 bg-slate-950/75 flex items-end sm:items-center justify-center p-4',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'intake-dialog-title'
    });
    var panel = el('form', { class: 'cyber-panel rounded-3xl p-6 w-full max-w-lg space-y-4' });
    panel.appendChild(el('h2', { id: 'intake-dialog-title', class: 'font-display text-xl font-bold text-white' }, ['Send intake form']));
    panel.appendChild(el('p', { class: 'text-sm text-slate-300 leading-relaxed' }, [
      'No email is saved for ' + who + '. Type an address and Gmail will open a draft of the client intake and service agreement. You review it and press Send. This page does not send the email, and it does not save this address on the customer.'
    ]));
    var input = textInput('intake-dialog-email', '', { type: 'email', placeholder: 'name@example.com' });
    panel.appendChild(field('Email', input));
    panel.appendChild(formError());
    var actions = el('div', { class: 'flex flex-col sm:flex-row gap-3' });
    actions.appendChild(el('button', { type: 'submit', class: PRIMARY }, ['Open in Gmail']));
    actions.appendChild(button('Cancel', SECONDARY, function () {
      state.intakeDialog = null;
      paint(true);
    }));
    panel.appendChild(actions);
    panel.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = input.value.trim();
      if (!Lib.looksLikeEmail(email)) {
        showFormError(panel, 'Enter an email address.');
        return;
      }
      openIntakeCompose(row, email);
    });
    overlay.addEventListener('click', function (event) {
      if (event.target !== overlay) return;
      state.intakeDialog = null;
      paint(true);
    });
    overlay.appendChild(panel);
    return overlay;
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
    if (!existing) {
      var sendRow = el('label', { class: 'flex items-start gap-3 text-sm text-slate-200 cursor-pointer' });
      var sendBox = el('input', { type: 'checkbox', id: 'sendIntake', name: 'sendIntake', class: 'mt-1 h-4 w-4 accent-cyan-500' });
      sendRow.appendChild(sendBox);
      var sendCopy = el('span');
      sendCopy.appendChild(document.createTextNode('Send intake form to customer'));
      sendCopy.appendChild(el('span', { class: 'block text-xs text-slate-400 mt-1 leading-relaxed' }, [
        'When you save, Gmail opens a draft for you to review and send. This page does not send the email.'
      ]));
      sendRow.appendChild(sendCopy);
      form.appendChild(sendRow);
      var intakeEmail = textInput('intakeEmail', '', { type: 'email', placeholder: 'name@example.com' });
      var intakeEmailWrap = field('Email for the Gmail draft', intakeEmail, 'Filled from the customer list when the name matches. Otherwise type one. This address is not saved on the customer.');
      intakeEmailWrap.id = 'intake-email-field';
      intakeEmailWrap.classList.add('hidden');
      form.appendChild(intakeEmailWrap);
      var intakeEmailTouched = false;
      intakeEmail.addEventListener('input', function () { intakeEmailTouched = true; });
      var syncIntakeEmail = function () {
        intakeEmailWrap.classList.toggle('hidden', !sendBox.checked);
        if (!sendBox.checked || intakeEmailTouched) return;
        intakeEmail.value = Lib.customerEmail(state.data.Customers, form.elements.customer.value);
      };
      sendBox.addEventListener('change', syncIntakeEmail);
      form.elements.customer.addEventListener('input', syncIntakeEmail);
    }
    if (existing) {
      var alreadySent = intakeBadge(existing);
      if (alreadySent) form.appendChild(alreadySent);
    }
    form.appendChild(formError());
    var actions = el('div', { class: 'flex flex-col sm:flex-row gap-3' });
    var save = el('button', { type: 'submit', class: PRIMARY }, ['Save ticket']);
    actions.appendChild(save);
    if (existing) {
      actions.appendChild(button('Send intake form', SECONDARY, function () {
        startIntake(existing);
      }));
    }
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
      notes: form.elements.notes.value.trim(),
      intakeSent: (existing && existing.intakeSent) || ''
    };
    if (!record.customer || !record.issue) {
      showFormError(form, 'Enter a customer and an issue.');
      return;
    }
    var wantSend = !!(form.elements.sendIntake && form.elements.sendIntake.checked);
    var composeUrl = '';
    if (wantSend) {
      var typed = form.elements.intakeEmail ? form.elements.intakeEmail.value.trim() : '';
      var emailField = document.getElementById('intake-email-field');
      if (typed && !Lib.looksLikeEmail(typed)) {
        if (emailField) emailField.classList.remove('hidden');
        showFormError(form, 'Enter a valid email address for the intake form, or clear it to use the customer list.');
        return;
      }
      var email = typed || Lib.customerEmail(state.data.Customers, record.customer);
      if (!Lib.looksLikeEmail(email)) {
        if (emailField) emailField.classList.remove('hidden');
        if (form.elements.intakeEmail) form.elements.intakeEmail.focus();
        showFormError(form, 'No email is on file for that customer. Type an email to open the intake form in Gmail.');
        return;
      }
      composeUrl = Lib.intakeComposeUrl(cfg(), email);
      if (!composeUrl) {
        showFormError(form, 'The intake form link in portal/config.js is missing or is not a public Google Form link. Nothing was opened.');
        return;
      }
      openTab(composeUrl);
      record.intakeSent = Lib.isoDate(0);
    }
    var when = record.intakeSent ? (formatDay(record.intakeSent) || record.intakeSent) : '';
    var message = wantSend
      ? 'Ticket saved. Gmail opened in a new tab so you can review and send the intake form. This page did not send the email. Intake sent ' + when + ' is on the ticket.'
      : 'Ticket saved.';
    saveAndReturn('Tickets', record, existing, 'tickets', form, message, {
      prepare: wantSend ? ensureIntakeColumn : null,
      composeUrl: composeUrl
    });
  }

  function saveAndReturn(title, record, existing, section, form, message, options) {
    options = options || {};
    var submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    Promise.resolve(options.prepare ? options.prepare() : null).then(function () {
      return persistRecord(title, record, existing);
    }).then(function () {
      var text = state.mode === 'demo' ? message + ' Sample only — nothing was sent to Google.' : message;
      state.banner = { tone: 'ok', text: text };
      if (safeHttp(options.composeUrl)) {
        state.banner.href = options.composeUrl;
        state.banner.hrefLabel = 'Open the Gmail draft again';
      }
      go(section);
    }).catch(function (err) {
      submit.disabled = false;
      var prefix = options.composeUrl ? 'Gmail opened, but the ticket was not saved. ' : '';
      showFormError(form, prefix + friendly(err));
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
    var tax = form.elements.tax ? form.elements.tax.value : '';
    box.replaceChildren(totalsNode(Lib.documentTotals(readLines(form), tax)));
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

  function googleEditor(mime) {
    return mime === 'application/vnd.google-apps.document'
      || mime === 'application/vnd.google-apps.spreadsheet'
      || mime === 'application/vnd.google-apps.presentation';
  }

  function openViewer(file) {
    state.viewer = {
      id: file.id || '',
      name: file.name || 'Untitled',
      mimeType: file.mimeType || '',
      webViewLink: file.webViewLink || '',
      sample: !!(file.sample || state.mode === 'demo'),
      edit: false
    };
    paint(true);
  }

  function closeViewer() {
    state.viewer = null;
    paint(true);
  }

  function renderViewer() {
    var item = state.viewer;
    if (!item) return null;
    var overlay = el('div', {
      class: 'fixed inset-0 z-50 bg-[#0B131E]/80 flex items-end sm:items-center justify-center p-3 sm:p-6',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': item.name || 'File preview'
    });
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeViewer();
    });
    var panel = el('div', { class: 'cyber-panel rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden' });
    var bar = el('div', { class: 'flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-700' });
    var title = el('div', { class: 'min-w-0' });
    title.appendChild(el('h2', { class: 'font-display font-bold text-white truncate' }, [item.name || 'Untitled']));
    if (item.sample) title.appendChild(el('p', { class: 'text-xs text-amber-200 mt-1' }, ['Sample file. Not a Drive preview.']));
    bar.appendChild(title);
    var actions = el('div', { class: 'flex flex-wrap gap-2' });
    if (googleEditor(item.mimeType)) {
      actions.appendChild(button(item.edit ? 'View preview' : 'Edit in the page', SECONDARY, function () {
        state.viewer.edit = !state.viewer.edit;
        paint(true);
      }));
    }
    if (!item.sample && safeHttp(item.webViewLink)) {
      actions.appendChild(el('a', {
        href: item.webViewLink,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: SECONDARY
      }, ['Open in Google (new tab)']));
    }
    actions.appendChild(button('Close', PRIMARY, closeViewer));
    bar.appendChild(actions);
    panel.appendChild(bar);
    var src = item.sample ? '' : Lib.drivePreviewUrl(item, item.edit);
    if (src) {
      panel.appendChild(el('iframe', {
        title: item.name || 'File preview',
        src: src,
        class: 'flex-1 w-full min-h-0 border-0 bg-white'
      }));
    } else {
      var note = item.sample
        ? 'Sample — file preview. Not connected to Google. A real file loads in this frame. Docs, Sheets, and Slides use /preview, or /edit?rm=minimal when Edit in the page is on.'
        : 'This file has no in-page preview.';
      if (item.sample && item.edit) note = 'Sample — edit mode. Not connected to Google. A real Doc, Sheet, or Slide would load /edit?rm=minimal here.';
      panel.appendChild(el('div', { class: 'flex-1 flex items-center justify-center p-6 text-center' }, [
        el('p', { class: 'max-w-md text-sm text-amber-100 leading-relaxed' }, [note])
      ]));
    }
    overlay.appendChild(panel);
    return overlay;
  }

  function renderDocs() {
    var page = el('div', { class: 'space-y-5' });
    page.appendChild(sectionHead('Drive', 'Company docs and how-tos', 'Preview opens the file in this page. Google Docs, Sheets, and Slides can switch to a minimal editor. Google still decides whether your account can open the file.'));
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
      var folder = file.mimeType === 'application/vnd.google-apps.folder';
      if (file.sample || state.mode === 'demo') side.appendChild(sampleChip());
      if (folder && !(file.sample || state.mode === 'demo')) {
        if (safeHttp(file.webViewLink)) {
          side.appendChild(el('a', { href: file.webViewLink, target: '_blank', rel: 'noopener noreferrer', class: SECONDARY }, ['Open in a new tab']));
        } else {
          side.appendChild(el('span', { class: 'text-xs text-slate-400' }, ['No open link from Google']));
        }
      } else if (file.sample || state.mode === 'demo' || file.id) {
        side.appendChild(button('Preview', SECONDARY, function () { openViewer(file); }));
      } else if (safeHttp(file.webViewLink)) {
        side.appendChild(el('a', { href: file.webViewLink, target: '_blank', rel: 'noopener noreferrer', class: SECONDARY }, ['Open in a new tab']));
      } else {
        side.appendChild(el('span', { class: 'text-xs text-slate-400' }, ['No open link from Google']));
      }
      card.appendChild(side);
      list.appendChild(card);
    });
    page.appendChild(list);
    var viewer = renderViewer();
    if (viewer) page.appendChild(viewer);
    return page;
  }

  function renderSheet() {
    var page = el('div', { class: 'space-y-5' });
    page.appendChild(sectionHead('Sheet', 'Spreadsheet', 'The portal spreadsheet, embedded for editing. Google still decides who can open it. This page does not store a copy.'));
    if (state.mode === 'demo') {
      page.appendChild(el('p', { class: 'text-sm text-amber-100 leading-relaxed' }, [
        'Sample layout. Not a company spreadsheet. After sign-in, and after spreadsheetId is set, this tab embeds that Google Sheet.'
      ]));
      page.appendChild(sampleLayout('spreadsheet embed'));
      return page;
    }
    if (!spreadsheetId()) {
      var blocked = sheetCallout();
      if (blocked) page.appendChild(blocked);
      return page;
    }
    var src = Lib.spreadsheetEmbedUrl(spreadsheetId());
    page.appendChild(el('iframe', {
      title: state.spreadsheetTitle || 'Portal spreadsheet',
      src: src,
      class: 'w-full h-[70vh] min-h-[28rem] rounded-2xl border border-slate-700 bg-white'
    }));
    if (safeHttp(state.spreadsheetUrl)) {
      page.appendChild(el('a', {
        href: state.spreadsheetUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: SECONDARY + ' self-start'
      }, ['Open in a new tab']));
    }
    return page;
  }

  function proposalTotalLabel(row) {
    var read = Lib.readProposal(row);
    var totals = Lib.documentTotals(read.linesOk ? read.lines : [], '');
    if (totals.complete) return Lib.formatUSD(totals.total);
    if (Lib.parseNumber(row.total) != null && (!read.linesOk || !read.lines.length)) return Lib.formatUSD(Lib.parseNumber(row.total));
    if (totals.priced) return Lib.formatUSD(totals.subtotal) + ' partial';
    return 'Total not entered';
  }

  function proposalsNeedSheet() {
    if (state.mode !== 'live' || !spreadsheetId() || state.sheetsError) return false;
    if (state.sheetIds.Proposals == null) return true;
    var parsed = state.parsed.Proposals;
    var header = parsed && parsed.headerRow;
    if (!header || !header.some(function (cell) { return String(cell || '').trim(); })) return true;
    return Lib.headersToAppend(header, Lib.columnsOf('Proposals')).headers.length > 0;
  }

  function scheduleProposalSheet() {
    if (state.proposalSheetWorking || state.proposalSheetReady || state.proposalSheetFailed) return;
    if (!proposalsNeedSheet()) {
      state.proposalSheetReady = true;
      return;
    }
    if (state.busy) return;
    state.proposalSheetWorking = true;
    state.busy = 'Adding the Proposals tab…';
    paint(true);
    ensureSheet('Proposals').then(function () {
      state.proposalSheetWorking = false;
      state.proposalSheetReady = true;
      state.busy = '';
      state.banner = {
        tone: 'ok',
        text: 'The Proposals tab is ready. Missing header names were added at the end of that row. Other tabs were left as they were.'
      };
      paint(true);
    }).catch(function (err) {
      state.proposalSheetWorking = false;
      state.proposalSheetFailed = friendly(err);
      state.busy = '';
      paint(true);
    });
  }

  function renderProposals() {
    var page = el('div', { class: 'space-y-5' });
    var head = sectionHead('Prospects', 'Proposals', 'Client, scope, timeline, and price lines are stored on the Proposals tab. Sections and line items are JSON in that row. Create Google Doc writes a Doc in Drive. Send opens a Gmail draft. This page does not send email.');
    head.appendChild(button('New proposal', PRIMARY, function () { go('proposals', 'new'); }));
    page.appendChild(head);
    if (state.mode === 'live' && spreadsheetId() && state.proposalSheetFailed) {
      page.appendChild(emptyNote(state.proposalSheetFailed));
      page.appendChild(button('Try adding the Proposals tab again', SECONDARY, function () {
        state.proposalSheetFailed = '';
        state.proposalSheetReady = false;
        scheduleProposalSheet();
      }));
      return page;
    }
    if (state.mode === 'live' && proposalsNeedSheet()) {
      page.appendChild(emptyNote('Preparing the Proposals tab. Existing tabs stay as they are.'));
      return page;
    }
    var blocked = sheetBlocked('Proposals');
    if (blocked) {
      page.appendChild(blocked);
      return page;
    }
    var filters = [
      ['Open', function (row) { return !row.status || row.status === 'Draft' || row.status === 'Sent'; }],
      ['All', function () { return true; }],
      ['Draft', function (row) { return !row.status || row.status === 'Draft'; }],
      ['Sent', function (row) { return row.status === 'Sent'; }],
      ['Accepted', function (row) { return row.status === 'Accepted'; }],
      ['Declined', function (row) { return row.status === 'Declined'; }]
    ];
    page.appendChild(filterBar(filters, state.proposalFilter, function (label) {
      state.proposalFilter = label;
      paint(true);
    }));
    var chosen = filters.filter(function (item) { return item[0] === state.proposalFilter; })[0] || filters[0];
    var rows = (state.data.Proposals || []).filter(chosen[1]);
    if (!rows.length) {
      page.appendChild(emptyNote(state.proposalFilter === 'All' || state.proposalFilter === 'Open'
        ? 'No proposals yet. Add one when you are writing a prospect. Nothing is priced for you.'
        : 'No proposals with that status.'));
      return page;
    }
    var list = el('div', { class: 'space-y-3' });
    rows.forEach(function (row) {
      list.appendChild(proposalCard(row));
    });
    page.appendChild(list);
    return page;
  }

  function proposalCard(row) {
    var card = el('article', { class: 'cyber-panel rounded-2xl p-5' });
    var top = el('div', { class: 'flex flex-wrap items-start justify-between gap-3' });
    var copy = el('div', { class: 'min-w-0' });
    copy.appendChild(el('h2', { class: 'font-display font-bold text-white text-lg' }, [row.title || 'Untitled proposal']));
    copy.appendChild(el('p', { class: 'text-sm text-slate-300 mt-1' }, [
      [row.prospectName || 'No prospect', row.business].filter(Boolean).join(' · ')
    ]));
    var meta = [row.email, row.expires ? 'Expires ' + formatDay(row.expires) : '', row.sent ? 'Sent ' + formatDay(row.sent) : ''].filter(Boolean).join(' · ');
    if (meta) copy.appendChild(el('p', { class: 'text-xs text-slate-400 mt-1' }, [meta]));
    top.appendChild(copy);
    var side = el('div', { class: 'flex flex-col items-end gap-2' });
    side.appendChild(badge(row.status || 'Draft'));
    if (row.sample) side.appendChild(sampleChip());
    side.appendChild(el('p', { class: 'font-display font-bold text-white' }, [proposalTotalLabel(row)]));
    top.appendChild(side);
    card.appendChild(top);
    var actions = el('div', { class: 'mt-4 flex flex-wrap gap-2' });
    actions.appendChild(button('Edit', SECONDARY, function () { go('proposals', row.id); }));
    actions.appendChild(button('Preview', SECONDARY, function () { go('print', 'proposal', row.id); }));
    actions.appendChild(button('Send', SECONDARY, function () { sendProposal(row); }));
    if (Lib.googleDocId(row.docUrl)) {
      actions.appendChild(button('Anyone with the link can view', SECONDARY, function () { shareProposalDoc(row); }));
    }
    if (row.status !== 'Accepted') {
      actions.appendChild(button('Mark accepted', PRIMARY, function () { acceptProposal(row); }));
    }
    if (row.status !== 'Declined') {
      actions.appendChild(button('Mark declined', SECONDARY, function () { declineProposal(row); }));
    }
    if (row.status === 'Accepted' && row.jobId) {
      actions.appendChild(button('Send intake form', SECONDARY, function () {
        var ticket = findRow('Tickets', row.jobId);
        if (ticket) startIntake(ticket);
        else {
          state.banner = { tone: 'bad', text: 'The ticket for this proposal is not in the current list. Open Tickets and use Send intake form there.' };
          paint(true);
        }
      }));
    }
    card.appendChild(actions);
    if (safeHttp(row.docUrl)) {
      card.appendChild(el('a', {
        href: row.docUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'inline-flex mt-3 text-sm font-semibold text-sky-300'
      }, ['Open the Google Doc']));
    }
    return card;
  }

  function renderProposalEditor() {
    var existing = state.editorId === 'new' ? null : findRow('Proposals', state.editorId);
    if (state.editorId !== 'new' && !existing) return missingRecord('proposals', 'That proposal is not in the current list.');
    var read = existing ? Lib.readProposal(existing) : {
      status: 'Draft',
      expires: Lib.isoDate(30),
      lines: [],
      sectionsOk: true,
      linesOk: true
    };
    var page = el('div', { class: 'space-y-5' });
    page.appendChild(sectionHead('Prospects', existing ? 'Edit proposal' : 'New proposal', 'Type the prices you mean to offer. A blank price stays blank, and the total stays incomplete until every line has a quantity and a price.'));
    if (existing && (!read.sectionsOk || !read.linesOk)) {
      page.appendChild(el('p', { class: 'rounded-2xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100' }, [
        'Sections or line items on this row are not valid JSON. Saving replaces those cells with the fields below.'
      ]));
    }
    var form = el('form', { class: 'cyber-panel rounded-3xl p-6 space-y-5', autocomplete: 'off', id: 'proposal-form' });
    form.appendChild(el('h2', { class: 'font-display font-bold text-white' }, ['Client']));
    var client = el('div', { class: 'grid sm:grid-cols-2 gap-5' });
    client.appendChild(field('Prospect name', textInput('prospectName', read.prospectName, { required: true, placeholder: 'Name' })));
    client.appendChild(field('Business', textInput('business', read.business, { placeholder: 'Business name' })));
    client.appendChild(field('Email', textInput('email', read.email, { type: 'email', placeholder: 'name@example.com' })));
    client.appendChild(field('Phone', textInput('phone', read.phone, { placeholder: '(410) 555-0100' })));
    form.appendChild(client);
    form.appendChild(el('h2', { class: 'font-display font-bold text-white' }, ['Proposal']));
    var meta = el('div', { class: 'grid sm:grid-cols-2 gap-5' });
    meta.appendChild(field('Title', textInput('title', read.title, { required: true, placeholder: 'Website refresh' })));
    var statuses = Lib.CHOICES.proposalStatus.slice();
    if (read.status && statuses.indexOf(read.status) === -1) statuses.unshift(read.status);
    meta.appendChild(field('Status', selectInput('status', read.status || 'Draft', statuses)));
    meta.appendChild(field('Expiration date', textInput('expires', read.expires, { type: 'date' }), 'Shown on the Doc as valid until. Clear it if the offer has no end date.'));
    form.appendChild(meta);
    form.appendChild(field('Project overview', areaInput('overview', read.overview, 'What the project is and why it matters')));
    form.appendChild(field('Scope and deliverables', areaInput('scope', read.scope, 'One deliverable per line')));
    form.appendChild(field('Timeline', areaInput('timeline', read.timeline, 'Milestones and dates')));
    form.appendChild(el('h2', { class: 'font-display font-bold text-white' }, ['Pricing']));
    var host = el('div', { 'data-lines': '1', class: 'space-y-3' });
    (read.lines.length ? read.lines : [{ qty: '1', description: '', unitPrice: '' }]).forEach(function (line) {
      host.appendChild(lineRow(line));
    });
    form.appendChild(host);
    form.appendChild(button('Add a line', SECONDARY, function () {
      host.appendChild(lineRow({ qty: '1', description: '', unitPrice: '' }));
      updateDocPreview(form);
    }));
    var total = el('div', { 'data-doc-total': '1' });
    form.appendChild(total);
    form.appendChild(field('Terms', areaInput('terms', read.terms, 'Payment, revisions, and what is included')));
    form.appendChild(field('Internal notes', areaInput('notes', read.notes, 'Staff notes stay on this row'), 'The Google Doc includes the overview, scope, timeline, quote, and terms.'));
    if (read.docUrl) {
      form.appendChild(el('p', { class: 'text-sm text-slate-300' }, ['Saved Doc: ' + read.docUrl]));
    }
    form.appendChild(formError());
    var actions = el('div', { class: 'flex flex-col sm:flex-row flex-wrap gap-3' });
    actions.appendChild(el('button', { type: 'submit', class: PRIMARY }, ['Save proposal']));
    actions.appendChild(button('Cancel', SECONDARY, function () { go('proposals'); }));
    actions.appendChild(button('Preview layout', SECONDARY, function () {
      afterProposalCommit(form, existing, function (saved) { go('print', 'proposal', saved.id); });
    }));
    actions.appendChild(button('Create Google Doc', SECONDARY, function () {
      afterProposalCommit(form, existing, function (saved) { return createProposalDocument(saved); });
    }));
    actions.appendChild(button('Send', SECONDARY, function () {
      afterProposalCommit(form, existing, function (saved) { return sendProposal(saved); });
    }));
    actions.appendChild(button('Anyone with the link can view', SECONDARY, function () {
      afterProposalCommit(form, existing, function (saved) { shareProposalDoc(saved); });
    }));
    actions.appendChild(button('Mark accepted', PRIMARY, function () {
      afterProposalCommit(form, existing, function (saved) { return acceptProposal(saved); });
    }));
    actions.appendChild(button('Mark declined', SECONDARY, function () {
      afterProposalCommit(form, existing, function (saved) { return declineProposal(saved); });
    }));
    form.appendChild(actions);
    form.addEventListener('input', function () { updateDocPreview(form); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var status = form.elements.status.value;
      if (status === 'Accepted') {
        afterProposalCommit(form, existing, function (saved) { return acceptProposal(saved); });
        return;
      }
      if (status === 'Declined') {
        afterProposalCommit(form, existing, function (saved) { return declineProposal(saved); });
        return;
      }
      afterProposalCommit(form, existing, function () {
        state.banner = {
          tone: 'ok',
          text: state.mode === 'demo' ? 'Proposal saved in this sample preview only.' : 'Proposal saved to the spreadsheet.'
        };
        go('proposals');
      });
    });
    page.appendChild(form);
    updateDocPreview(form);
    return page;
  }

  function proposalFromForm(form, existing) {
    var read = existing ? Lib.readProposal(existing) : {};
    return Lib.writeProposal({
      id: read.id,
      _row: read._row,
      _cells: read._cells,
      prospectName: form.elements.prospectName.value.trim(),
      business: form.elements.business.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      title: form.elements.title.value.trim(),
      status: form.elements.status.value,
      created: read.created,
      sent: read.sent,
      expires: form.elements.expires.value,
      docUrl: read.docUrl,
      notes: form.elements.notes.value,
      overview: form.elements.overview.value,
      scope: form.elements.scope.value,
      timeline: form.elements.timeline.value,
      terms: form.elements.terms.value,
      lines: readLines(form),
      customerId: read.customerId,
      jobId: read.jobId,
      sample: read.sample
    });
  }

  function afterProposalCommit(form, existing, next) {
    var record = proposalFromForm(form, existing);
    if (!record.prospectName || !record.title) {
      showFormError(form, 'Enter the prospect name and a proposal title.');
      return;
    }
    var nameless = readLines(form).filter(function (line) { return line.unitPrice && !line.description; });
    if (nameless.length) {
      showFormError(form, 'Each line with a price needs a description.');
      return;
    }
    if (record.email && !Lib.looksLikeEmail(record.email)) {
      showFormError(form, 'Enter a valid email, or leave email blank until you know it.');
      return;
    }
    var submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    persistRecord('Proposals', record, existing).then(function () {
      return findRow('Proposals', record.id) || record;
    }).then(next).catch(function (err) {
      if (submit) submit.disabled = false;
      showFormError(form, friendly(err));
    });
  }

  function sendProposal(record) {
    var read = Lib.readProposal(record);
    if (!Lib.looksLikeEmail(read.email)) {
      state.banner = { tone: 'bad', text: 'Enter a valid prospect email before opening Gmail. This page does not send email.' };
      paint(true);
      return Promise.resolve();
    }
    var url = Lib.proposalComposeUrl(read);
    if (!url) {
      state.banner = { tone: 'bad', text: 'Create the Google Doc first so the Gmail draft can include the link. This page does not send email.' };
      paint(true);
      return Promise.resolve();
    }
    openTab(url);
    var keepStatus = read.status === 'Accepted' || read.status === 'Declined';
    var next = Lib.writeProposal(Object.assign({}, read, {
      status: keepStatus ? read.status : 'Sent',
      sent: keepStatus ? read.sent : Lib.isoDate(0)
    }));
    var when = formatDay(next.sent) || next.sent || 'today';
    return persistRecord('Proposals', next, record).then(function () {
      state.banner = {
        tone: 'ok',
        text: keepStatus
          ? 'Gmail opened a draft with the Doc link. This page did not send it. Status stayed ' + read.status + '. If the prospect cannot open the Doc, choose Anyone with the link can view.'
          : 'Gmail opened a draft with the Doc link. This page did not send it. You press Send in Gmail. Status is Sent as of ' + when + '. If the prospect cannot open the Doc, choose Anyone with the link can view.',
        href: url,
        hrefLabel: 'Open the Gmail draft again'
      };
      go('proposals');
    }).catch(function (err) {
      state.banner = {
        tone: 'bad',
        text: 'Gmail opened, but the proposal was not marked Sent. ' + friendly(err),
        href: url,
        hrefLabel: 'Open the Gmail draft again'
      };
      paint(true);
    });
  }

  function shareProposalDoc(record) {
    var read = Lib.readProposal(record);
    var id = Lib.googleDocId(read.docUrl);
    if (!id) {
      state.banner = { tone: 'bad', text: 'Create the Google Doc first. Then you can allow anyone with the link to view it.' };
      paint(true);
      return;
    }
    if (state.mode === 'demo' || id === 'sample-proposal') {
      state.banner = {
        tone: 'warn',
        text: 'Sample only. On a real Doc this sets anyone with the link to view. The spreadsheet and the docs folder stay restricted. This page does not email the prospect.'
      };
      paint(true);
      return;
    }
    state.busy = 'Updating Doc access…';
    paint(true);
    ensureProposalScopes().then(function () {
      return googleFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '/permissions?supportsAllDrives=true&fields=' + encodeURIComponent('permissions(id,type,role)'));
    }).then(function (data) {
      var list = (data && data.permissions) || [];
      var already = list.some(function (item) { return item.type === 'anyone'; });
      if (already) return { already: true };
      return googleFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '/permissions?supportsAllDrives=true', {
        method: 'POST',
        body: { type: 'anyone', role: 'reader' }
      });
    }).then(function (result) {
      state.busy = '';
      state.banner = {
        tone: 'ok',
        text: result && result.already
          ? 'Anyone with the link can already view this Doc. The spreadsheet stays restricted. This page does not email the prospect.'
          : 'Anyone with the link can now view this Doc. The spreadsheet and the company docs folder stay restricted. This page does not email the prospect.',
        href: read.docUrl,
        hrefLabel: 'Open the Doc'
      };
      paint(true);
    }).catch(function (err) {
      state.busy = '';
      state.banner = { tone: 'bad', text: friendly(err) };
      paint(true);
    });
  }

  function acceptProposal(record) {
    var plan = Lib.planProposalAcceptance(record, state.data.Customers, state.data.Tickets);
    if (plan.error) {
      state.banner = { tone: 'bad', text: plan.error };
      paint(true);
      return Promise.resolve();
    }
    if (!plan.customer.id) plan.customer.id = newId();
    if (!plan.ticket.id) plan.ticket.id = newId();
    state.busy = state.mode === 'demo' ? 'Saving the sample customer and ticket…' : 'Saving the customer and ticket…';
    paint(true);
    var chain = Promise.resolve();
    if (plan.creatingCustomer) chain = chain.then(function () { return persistRecord('Customers', plan.customer, null); });
    if (plan.creatingTicket) chain = chain.then(function () { return persistRecord('Tickets', plan.ticket, null); });
    var proposalId = Lib.readProposal(record).id;
    return chain.then(function () {
      var current = findRow('Proposals', proposalId) || record;
      var next = Lib.writeProposal(Object.assign({}, Lib.readProposal(current), {
        status: 'Accepted',
        customerId: plan.customer.id,
        jobId: plan.ticket.id
      }));
      return persistRecord('Proposals', next, current);
    }).then(function () {
      state.busy = '';
      var name = plan.customer.name || 'The prospect';
      state.banner = {
        tone: 'ok',
        text: name + ' is a customer and a ticket is open for this proposal. Send intake form opens a Gmail draft of the client intake. This page does not send the email.',
        actionLabel: 'Send intake form',
        action: function () {
          var ticket = findRow('Tickets', plan.ticket.id);
          if (ticket) startIntake(ticket);
          else {
            state.banner = { tone: 'bad', text: 'The new ticket is not in the current list. Open Tickets and use Send intake form there.' };
            paint(true);
          }
        }
      };
      go('proposals', proposalId);
    }).catch(function (err) {
      state.busy = '';
      state.banner = { tone: 'bad', text: friendly(err) };
      paint(true);
    });
  }

  function declineProposal(record) {
    var read = Lib.readProposal(record);
    var next = Lib.writeProposal(Object.assign({}, read, { status: 'Declined' }));
    var extra = (read.customerId || read.jobId) ? ' The customer and ticket already created stay on those tabs.' : '';
    return persistRecord('Proposals', next, record).then(function () {
      state.banner = { tone: 'ok', text: 'Proposal marked Declined.' + extra };
      go('proposals');
    }).catch(function (err) {
      state.banner = { tone: 'bad', text: friendly(err) };
      paint(true);
    });
  }

  function ensureProposalScopes() {
    if (state.mode === 'demo') return Promise.resolve();
    var documents = 'https://www.googleapis.com/auth/documents';
    var drive = 'https://www.googleapis.com/auth/drive';
    if (hasScope(documents) && hasScope(drive)) return Promise.resolve();
    return requestDataAccess({ prompt: 'consent', quiet: true }).then(function () {
      if (!hasScope(documents) || !hasScope(drive)) {
        throw new Error('Google Docs and Drive access are needed to create a proposal Doc and set its link. Sign in again and accept both.');
      }
    });
  }

  function proposalsFolder() {
    var parent = driveFolderId();
    var q = "name = 'Proposals' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    if (parent) q += " and '" + parent + "' in parents";
    else q += " and 'root' in parents";
    var url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q)
      + '&fields=' + encodeURIComponent('files(id,name)')
      + '&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true';
    return googleFetch(url).then(function (data) {
      if (data && data.files && data.files[0]) return data.files[0].id;
      var body = { name: 'Proposals', mimeType: 'application/vnd.google-apps.folder' };
      if (parent) body.parents = [parent];
      return googleFetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        body: body
      }).then(function (folder) { return folder.id; });
    });
  }

  function createProposalDocument(record) {
    var read = Lib.readProposal(record);
    if (!read.sectionsOk || !read.linesOk) {
      state.banner = { tone: 'bad', text: 'Sections or line items on this row are not valid JSON. Save the proposal first so those cells can be rewritten.' };
      paint(true);
      return Promise.resolve();
    }
    var view = Lib.proposalView(record);
    if (state.mode === 'demo') {
      var demoUrl = read.docUrl || 'https://docs.google.com/document/d/sample-proposal/edit';
      var demoRecord = Lib.writeProposal(Object.assign({}, read, { docUrl: demoUrl }));
      return persistRecord('Proposals', demoRecord, record).then(function () {
        state.banner = {
          tone: 'warn',
          text: 'Sample layout only. No Google Doc was created and nothing was put in Drive. The preview shows the proposal the Doc would contain.'
        };
        go('print', 'proposal', demoRecord.id || read.id);
      });
    }
    state.busy = 'Creating the Google Doc…';
    state.banner = null;
    paint(true);
    var fileId = '';
    return ensureProposalScopes().then(function () {
      return proposalsFolder();
    }).then(function (folderId) {
      var body = {
        name: Lib.proposalDocName(record),
        mimeType: 'application/vnd.google-apps.document'
      };
      if (folderId) body.parents = [folderId];
      return googleFetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        body: body
      });
    }).then(function (file) {
      fileId = file.id;
      var opening = Lib.proposalOpeningRequests(view);
      return googleFetch('https://docs.googleapis.com/v1/documents/' + encodeURIComponent(fileId) + ':batchUpdate', {
        method: 'POST',
        body: { requests: opening.requests }
      });
    }).then(function () {
      return googleFetch('https://docs.googleapis.com/v1/documents/' + encodeURIComponent(fileId));
    }).then(function (doc) {
      var fills = Lib.proposalFillRequests(doc, view.grid.rows, Lib.proposalClosingText(view));
      if (!fills.length) throw new Error('The quote table was not added to the Google Doc.');
      return googleFetch('https://docs.googleapis.com/v1/documents/' + encodeURIComponent(fileId) + ':batchUpdate', {
        method: 'POST',
        body: { requests: fills }
      });
    }).then(function () {
      return googleFetch('https://docs.googleapis.com/v1/documents/' + encodeURIComponent(fileId));
    }).then(function (doc) {
      var polish = Lib.proposalPolishRequests(doc);
      if (!polish.length) return null;
      return googleFetch('https://docs.googleapis.com/v1/documents/' + encodeURIComponent(fileId) + ':batchUpdate', {
        method: 'POST',
        body: { requests: polish }
      });
    }).then(function () {
      var url = 'https://docs.google.com/document/d/' + fileId + '/edit';
      var current = findRow('Proposals', read.id) || record;
      var next = Lib.writeProposal(Object.assign({}, Lib.readProposal(current), { docUrl: url }));
      return persistRecord('Proposals', next, current).then(function () { return url; });
    }).then(function (url) {
      state.busy = '';
      var where = driveFolderId()
        ? 'It is in the Proposals folder inside the company docs folder.'
        : 'It is in a Proposals folder in your Drive. Set driveFolderId in portal/config.js to file new Docs in the company folder.';
      state.banner = {
        tone: 'ok',
        text: 'Google Doc created. ' + where + ' The link is saved on this row. The Doc stays restricted until you choose Anyone with the link can view. This page does not email it.',
        href: url,
        hrefLabel: 'Open the Doc'
      };
      go('proposals', read.id);
    }).catch(function (err) {
      state.busy = '';
      var extra = fileId ? ' A Doc file may already be in Drive.' : '';
      state.banner = { tone: 'bad', text: friendly(err) + extra };
      paint(true);
    });
  }

  function proposalLinesBlock(text) {
    var wrap = el('div', { class: 'space-y-1' });
    String(text || 'Not specified.').split('\n').forEach(function (line) {
      wrap.appendChild(el('p', {}, [line]));
    });
    return wrap;
  }

  function proposalQuoteTable(grid) {
    var table = el('table');
    var head = el('thead', {}, [el('tr')]);
    grid.rows[0].forEach(function (cell, index) {
      head.firstChild.appendChild(el('th', { class: index ? 'num' : '' }, [cell]));
    });
    table.appendChild(head);
    var body = el('tbody');
    grid.rows.slice(1).forEach(function (row, index) {
      var isTotal = index === grid.rows.length - 2;
      var isSub = index === grid.rows.length - 3;
      var tr = el('tr', { class: isTotal ? 'proposal-total' : (isSub ? 'proposal-subtotal' : '') });
      row.forEach(function (cell, cellIndex) {
        tr.appendChild(el('td', { class: cellIndex ? 'num' : '' }, [cell]));
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    return table;
  }

  function renderProposalPrint() {
    var record = findRow('Proposals', state.printId);
    if (!record) return missingRecord('proposals', 'That proposal is not in the current list.');
    var view = Lib.proposalView(record);
    var page = el('div', { class: 'space-y-4' });
    var tools = el('div', { class: 'no-print flex flex-wrap gap-2' });
    tools.appendChild(button('Back', SECONDARY, function () { go('proposals', record.id); }));
    tools.appendChild(button('Print or save as PDF', PRIMARY, function () { window.print(); }));
    if (safeHttp(record.docUrl)) {
      tools.appendChild(el('a', {
        href: record.docUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: SECONDARY
      }, ['Open the Google Doc']));
    }
    page.appendChild(tools);
    page.appendChild(el('p', { class: 'no-print text-xs text-slate-400' }, [
      state.mode === 'demo' || record.sample
        ? 'Sample layout of the Google Doc. No Doc was created in Drive from this preview. Dollar amounts are fake.'
        : 'This is the same layout Create Google Doc writes into Drive, including the shield from the public website.'
    ]));
    var sheet = el('article', { class: 'proposal-sheet max-w-3xl rounded-3xl p-6 sm:p-10' });
    var brand = el('header', { class: 'text-center' });
    brand.appendChild(el('img', {
      src: '../assets/legacy-computing-shield.png',
      alt: 'Legacy Computing Services shield',
      width: '70',
      height: '78',
      class: 'mx-auto h-20 w-auto'
    }));
    brand.appendChild(el('p', { class: 'proposal-company' }, [Lib.PROPOSAL_BRAND.company]));
    brand.appendChild(el('p', { class: 'proposal-tagline' }, [Lib.PROPOSAL_BRAND.tagline]));
    brand.appendChild(el('p', { class: 'proposal-contact' }, [Lib.PROPOSAL_BRAND.contact]));
    sheet.appendChild(brand);
    sheet.appendChild(el('p', { class: 'proposal-kicker' }, ['Proposal']));
    sheet.appendChild(el('h1', { class: 'proposal-title' }, [view.title]));
    var prepared = el('section', { class: 'proposal-block' });
    prepared.appendChild(el('h2', {}, ['Prepared for']));
    prepared.appendChild(proposalLinesBlock(view.prospectName || 'Not specified.'));
    if (view.business) prepared.appendChild(proposalLinesBlock(view.business));
    var reach = [view.email, view.phone].filter(Boolean).join('  ·  ');
    if (reach) prepared.appendChild(proposalLinesBlock(reach));
    prepared.appendChild(proposalLinesBlock('Date: ' + (view.dateText || 'Not set')));
    prepared.appendChild(proposalLinesBlock('Valid until: ' + (view.validText || 'Not set')));
    sheet.appendChild(prepared);
    [
      ['OVERVIEW', view.overview],
      ['SCOPE & DELIVERABLES', view.scope],
      ['TIMELINE', view.timeline]
    ].forEach(function (section) {
      var block = el('section', { class: 'proposal-block' });
      block.appendChild(el('h2', {}, [section[0]]));
      block.appendChild(proposalLinesBlock(section[1] || 'Not specified.'));
      sheet.appendChild(block);
    });
    var quote = el('section', { class: 'proposal-block' });
    quote.appendChild(el('h2', {}, ['QUOTE']));
    quote.appendChild(proposalQuoteTable(view.grid));
    sheet.appendChild(quote);
    var terms = el('section', { class: 'proposal-block' });
    terms.appendChild(el('h2', {}, ['TERMS']));
    terms.appendChild(proposalLinesBlock(view.terms || 'No additional terms were added to this proposal.'));
    sheet.appendChild(terms);
    var accept = el('section', { class: 'proposal-block' });
    accept.appendChild(el('h2', {}, ['ACCEPTANCE']));
    accept.appendChild(el('p', {}, [
      'By signing below, ' + (view.prospectName || 'the client') + ' accepts this proposal and authorizes Legacy Computing Services LLC to begin the work described above.'
    ]));
    accept.appendChild(el('p', { class: 'proposal-sign' }, ['Client signature: ______________________________     Date: ______________']));
    accept.appendChild(el('p', { class: 'proposal-sign' }, ['Printed name: _________________________________']));
    accept.appendChild(el('p', { class: 'mt-6 font-bold' }, [Lib.PROPOSAL_BRAND.company]));
    accept.appendChild(el('p', {}, ['Bel Air, MD']));
    sheet.appendChild(accept);
    page.appendChild(sheet);
    return page;
  }

  function renderPrint() {
    if (state.printKind === 'proposal') return renderProposalPrint();
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
    state.viewer = null;
    state.sessionSpreadsheetId = '';
    state.createdSheet = null;
    state.banner = null;
    state.expired = false;
    state.busy = '';
    state.sheetsError = '';
    state.calendarError = '';
    state.proposalSheetReady = false;
    state.proposalSheetWorking = false;
    state.proposalSheetFailed = '';
    state.intakeDialog = null;
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
      requestDataAccess().catch(function () {});
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

  function requestDataAccess(options) {
    options = options || {};
    return new Promise(function (resolve, reject) {
      var client = google.accounts.oauth2.initTokenClient({
        client_id: Lib.clean(cfg().clientId),
        scope: DATA_SCOPES,
        include_granted_scopes: true,
        hd: Lib.allowedDomain(cfg()),
        prompt: options.prompt || '',
        callback: function (resp) {
          if (!resp || resp.error) {
            var denied = new Error('Google did not grant access to Sheets. The portal cannot open company records without it.');
            if (!options.quiet) {
              state.busy = '';
              state.banner = { tone: 'bad', text: denied.message };
              paint();
            }
            reject(denied);
            return;
          }
          var granted = resp.scope || '';
          if (granted.indexOf('https://www.googleapis.com/auth/spreadsheets') === -1) {
            var sheetsErr = new Error('Sheets access was not granted, so tickets, customers, quotes, and proposals cannot load.');
            if (!options.quiet) {
              state.busy = '';
              state.banner = { tone: 'bad', text: sheetsErr.message };
              paint();
            }
            reject(sheetsErr);
            return;
          }
          state.token = resp.access_token;
          state.grantedScope = granted;
          state.expiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
          state.expired = false;
          armExpiry(resp.expires_in);
          if (options.quiet) {
            resolve(resp);
            return;
          }
          state.mode = 'live';
          state.busy = '';
          loadAll().then(function () {
            state.banner = null;
            go('home');
            resolve(resp);
          });
        },
        error_callback: function (err) {
          if (options.quiet) {
            reject(new Error('The Google window did not finish. Allow pop-ups and try again.'));
            return;
          }
          onGisError(err);
          reject(err || new Error('Google sign-in did not finish.'));
        }
      });
      client.requestAccessToken();
    });
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
      return 'A Google API this portal needs is turned off in the Cloud project. Enable Sheets, Drive, Docs, and Calendar. Google said: ' + msg;
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

  function hasScope(url) {
    return (state.grantedScope || '').split(/\s+/).indexOf(url) !== -1;
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
        var width = Math.max(spec.columns.length, 26);
        return 'ranges=' + encodeURIComponent(spec.title + '!A1:' + Lib.colLetter(width));
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

  function sheetValuesUrl(range) {
    return 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId()) + '/values/' + encodeURIComponent(range) + '?valueInputOption=RAW';
  }

  function ensureIntakeColumn() {
    if (state.mode === 'demo') return Promise.resolve();
    var headers = (state.headers.Tickets || []).slice();
    var hasIntake = headers.some(function (cell) {
      return String(cell || '').trim().toLowerCase() === 'intake sent';
    });
    if (hasIntake) return Promise.resolve();
    var hasAny = headers.some(function (cell) { return String(cell || '').trim(); });
    if (!hasAny) {
      var full = Lib.columnsOf('Tickets').map(function (col) { return col.header; });
      var fullRange = 'Tickets!A1:' + Lib.colLetter(full.length) + '1';
      return googleFetch(sheetValuesUrl(fullRange), {
        method: 'PUT',
        body: { range: fullRange, majorDimension: 'ROWS', values: [full] }
      }).then(function () {
        state.headers.Tickets = full;
      });
    }
    var plan = Lib.headersToAppend(headers, [{ header: 'Intake Sent' }]);
    var start = Lib.colLetter(plan.startColumn);
    var end = Lib.colLetter(plan.startColumn + plan.headers.length - 1);
    var range = 'Tickets!' + start + '1:' + end + '1';
    return googleFetch(sheetValuesUrl(range), {
      method: 'PUT',
      body: { range: range, majorDimension: 'ROWS', values: [plan.headers] }
    }).then(function () {
      var next = headers.map(function (cell) { return String(cell == null ? '' : cell); });
      next = next.slice(0, plan.startColumn - 1);
      while (next.length < plan.startColumn - 1) next.push('');
      plan.headers.forEach(function (name) { next.push(name); });
      state.headers.Tickets = next;
    });
  }

  function writeIntakeCell(record) {
    var headers = headerRowFor('Tickets');
    var index = -1;
    headers.forEach(function (header, i) {
      if (String(header || '').trim().toLowerCase() === 'intake sent') index = i;
    });
    if (index === -1 || !record._row) return upsert('Tickets', record);
    var range = 'Tickets!' + Lib.colLetter(index + 1) + record._row;
    return googleFetch(sheetValuesUrl(range), {
      method: 'PUT',
      body: { range: range, majorDimension: 'ROWS', values: [[record.intakeSent]] }
    });
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
      'Do not rename these tabs: Tickets, Customers, Inquiries, Quotes, QuoteItems, Invoices, InvoiceItems, Proposals.',
      'Do not delete or rename the header row on those tabs. The portal reads the header names.',
      'The Tickets tab can gain an Intake Sent column at the end of the header row. Do not rename it. Other header cells stay as they are.',
      'The Proposals tab stores Sections and Line items as JSON. Customer ID and Job ID are filled when a proposal is accepted. Adding that tab does not change the other tabs.',
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
    if (title === 'Proposals') return Lib.CHOICES.proposalStatus;
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

  function writeMissingHeaders(title) {
    var parsed = state.parsed[title];
    var header = (parsed && parsed.headerRow) || [];
    var hasData = parsed && parsed.rows && parsed.rows.length;
    var hasAnyHeader = header.some(function (cell) { return String(cell || '').trim(); });
    var columns = Lib.columnsOf(title);
    if (!hasAnyHeader) {
      if (hasData) return Promise.resolve();
      var range = title + '!A1:' + Lib.colLetter(columns.length) + '1';
      return googleFetch(sheetValuesUrl(range), {
        method: 'PUT',
        body: { range: range, majorDimension: 'ROWS', values: [columns.map(function (col) { return col.header; })] }
      });
    }
    var plan = Lib.headersToAppend(header, columns);
    if (!plan.headers.length) return Promise.resolve();
    var start = Lib.colLetter(plan.startColumn);
    var end = Lib.colLetter(plan.startColumn + plan.headers.length - 1);
    var appendRange = title + '!' + start + '1:' + end + '1';
    return googleFetch(sheetValuesUrl(appendRange), {
      method: 'PUT',
      body: { range: appendRange, majorDimension: 'ROWS', values: [plan.headers] }
    });
  }

  function ensureSheet(title) {
    var id = spreadsheetId();
    if (!id) return Promise.reject(new Error('No spreadsheet ID is set in portal/config.js.'));
    var chain = Promise.resolve();
    if (state.sheetIds[title] == null) {
      chain = googleFetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + ':batchUpdate', {
        method: 'POST',
        body: {
          requests: [{ addSheet: { properties: { title: title, gridProperties: { frozenRowCount: 1 } } } }]
        }
      }).then(function () { return loadSheets(); });
    }
    return chain.then(function () {
      return writeMissingHeaders(title);
    }).then(function () {
      return loadSheets();
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
        writes = writes.then(function () { return writeMissingHeaders(spec.title); });
      });
      return writes.then(loadSheets);
    }).then(function () {
      state.busy = '';
      state.proposalSheetReady = true;
      state.proposalSheetFailed = '';
      state.banner = { tone: 'ok', text: 'Missing tabs were added. Missing header names were added without changing existing header cells or data rows.' };
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
      if (state.intakeDialog) {
        state.intakeDialog = null;
        paint(true);
        return;
      }
      if (state.viewer) {
        state.viewer = null;
        paint(true);
        return;
      }
      if (state.section === 'print') {
        go(state.printKind === 'invoice' ? 'invoices' : state.printKind === 'proposal' ? 'proposals' : 'quotes');
      }
      else if (state.editorId) go(state.section);
    });
    var calendarQuery = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
    var onCalendarMode = function () {
      var frame = document.getElementById('lcs-calendar-frame');
      if (!frame) return;
      var src = calendarEmbedSrc();
      if (src && frame.src !== src) frame.src = src;
    };
    if (calendarQuery && calendarQuery.addEventListener) calendarQuery.addEventListener('change', onCalendarMode);
    else if (calendarQuery && calendarQuery.addListener) calendarQuery.addListener(onCalendarMode);
    paint();
  }

  boot();
})();
