/* Legacy Computing Services — router, estimators, and contact mailto.
   Pattern follows the CHUSBC site: switchView + routeFromHash. No backend. */
(function () {
  'use strict';

  const D = window.LCS_DATA;
  const VIEWS = ['home', 'services', 'estimator', 'about', 'contact'];
  const EMAIL = D.company.email;

  function icon(path, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' + path + '</svg>';
  }
  const ICONS = {
    shield: icon('<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>', 20),
    sliders: icon('<path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>', 20),
    pin: icon('<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>', 20),
    check: icon('<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>', 20),
    globe: icon('<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>', 24),
    cpu: icon('<path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>', 24),
    wrench: icon('<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>', 24)
  };

  let activeTierId = null;
  let toastTimer = null;

  function cloneTpl(id) {
    return document.getElementById(id).content.firstElementChild.cloneNode(true);
  }

  function slot(root, name, text) {
    const el = root.querySelector('[data-slot="' + name + '"]');
    if (el) el.textContent = text == null ? '' : String(text);
    return el;
  }

  function dig(obj, path) {
    return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
  }

  function categories() {
    return D.estimator.categories;
  }

  function allTiers() {
    const rows = [];
    categories().forEach((cat) => {
      cat.tiers.forEach((tier) => {
        rows.push(Object.assign({ categoryId: cat.id, categoryLabel: cat.label }, tier));
      });
    });
    return rows;
  }

  function findTier(id) {
    return allTiers().find((tier) => tier.id === id) || null;
  }

  function categoryById(id) {
    return categories().find((cat) => cat.id === id) || null;
  }

  function startTier(cat) {
    return (cat.tiers.find((tier) => tier.startHere) || cat.tiers[0]);
  }

  function resolveEstimator(sub) {
    if (sub) {
      const tier = findTier(sub);
      if (tier) return tier;
      const cat = categoryById(sub);
      if (cat) return Object.assign({ categoryId: cat.id, categoryLabel: cat.label }, startTier(cat));
    }
    const web = categoryById('web');
    return Object.assign({ categoryId: web.id, categoryLabel: web.label }, startTier(web));
  }

  function rangeText(tier) {
    return String(tier.budgetHint || '').split('•')[0].trim();
  }

  function bindText() {
    document.querySelectorAll('[data-text]').forEach((el) => {
      const value = dig(D, el.dataset.text);
      if (typeof value === 'string') el.textContent = value;
    });
  }

  function fillChecks(list, items) {
    list.replaceChildren();
    items.forEach((item) => {
      const li = cloneTpl('tpl-check');
      slot(li, 'text', item);
      list.appendChild(li);
    });
  }

  function renderPillars() {
    const list = document.getElementById('hero-pillars');
    list.replaceChildren();
    D.pillars.forEach((pillar) => {
      const row = cloneTpl('tpl-pillar');
      slot(row, 'code', pillar.code);
      const label = slot(row, 'label', pillar.label);
      if (label) label.setAttribute('data-tone', pillar.tone);
      list.appendChild(row);
    });
  }

  function renderHighlights() {
    const list = document.getElementById('home-highlights');
    list.replaceChildren();
    D.highlights.forEach((item) => {
      const btn = cloneTpl('tpl-highlight');
      slot(btn, 'title', item.title);
      slot(btn, 'detail', item.detail);
      const icon = btn.querySelector('[data-slot="icon"]');
      icon.setAttribute('data-tone', item.tone);
      icon.innerHTML = ICONS[item.icon] || '';
      btn.addEventListener('click', () => switchView(item.view));
      list.appendChild(btn);
    });
  }

  function renderServices() {
    const list = document.getElementById('services-grid');
    list.replaceChildren();
    D.services.forEach((service) => {
      const card = cloneTpl('tpl-service');
      card.setAttribute('data-tone', service.tone);
      slot(card, 'kicker', service.kicker);
      slot(card, 'title', service.title);
      slot(card, 'summary', service.summary);
      slot(card, 'inspect', service.inspectLabel);
      slot(card, 'estimate', service.estimateLabel);
      const icon = card.querySelector('[data-slot="icon"]');
      icon.innerHTML = ICONS[service.icon] || '';
      fillChecks(card.querySelector('[data-slot="bullets"]'), service.bullets);
      card.querySelector('[data-action="inspect"]').addEventListener('click', () => openServiceModal(service.id));
      card.querySelector('[data-action="estimate"]').addEventListener('click', () => switchView('estimator', service.estimatorPreset));
      list.appendChild(card);
    });
  }

  function renderAbout() {
    const principles = document.getElementById('principles-grid');
    principles.replaceChildren();
    D.principles.forEach((item) => {
      const card = cloneTpl('tpl-principle');
      const n = slot(card, 'n', item.n);
      if (n) n.setAttribute('data-tone', item.tone);
      slot(card, 'title', item.title);
      slot(card, 'body', item.body);
      principles.appendChild(card);
    });

    const steps = document.getElementById('process-list');
    steps.replaceChildren();
    D.process.forEach((step) => {
      const row = cloneTpl('tpl-process');
      const n = slot(row, 'n', step.n);
      if (n) n.setAttribute('data-tone', step.tone);
      slot(row, 'title', step.title);
      slot(row, 'detail', step.detail);
      steps.appendChild(row);
    });

    renderTowns(document.getElementById('about-towns'));
    renderTowns(document.getElementById('footer-towns'));
  }

  function renderTowns(list) {
    if (!list) return;
    list.replaceChildren();
    D.serviceArea.towns.forEach((town) => {
      const chip = cloneTpl('tpl-town');
      chip.textContent = town;
      list.appendChild(chip);
    });
  }

  function renderContactOptions() {
    const select = document.getElementById('serviceCategory');
    const current = select.value;
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a service';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    D.contactServices.forEach((service) => {
      const option = document.createElement('option');
      option.value = service.value;
      option.textContent = service.label;
      select.appendChild(option);
    });
    if (current && Array.from(select.options).some((option) => option.value === current)) {
      select.value = current;
    }
  }

  function checkContent() {
    const values = allTiers().map((tier) => tier.formValue);
    const unique = new Set(values);
    if (unique.size !== values.length) console.error('Estimator tiers share a contact form value.');
    allTiers().forEach((tier) => {
      if (!D.contactServices.some((service) => service.value === tier.formValue)) {
        console.error('No contact option for tier ' + tier.id);
      }
    });
  }

  function renderEstimator() {
    const tier = findTier(activeTierId) || resolveEstimator(null);
    activeTierId = tier.id;
    const cat = categoryById(tier.categoryId);

    const tabs = document.getElementById('estimator-tabs');
    tabs.replaceChildren();
    categories().forEach((item) => {
      const btn = cloneTpl('tpl-cat');
      btn.textContent = item.label;
      btn.classList.toggle('is-selected', item.id === cat.id);
      btn.setAttribute('aria-pressed', item.id === cat.id ? 'true' : 'false');
      btn.addEventListener('click', () => switchView('estimator', startTier(item).id));
      tabs.appendChild(btn);
    });

    document.getElementById('estimator-not-sure').textContent = cat.notSure;

    const list = document.getElementById('estimator-tiers');
    list.replaceChildren();
    cat.tiers.forEach((item) => {
      const btn = cloneTpl('tpl-tier');
      const selected = item.id === tier.id;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      slot(btn, 'name', item.name);
      slot(btn, 'price', item.price);
      slot(btn, 'range', 'Range ' + rangeText(item));
      slot(btn, 'fit', item.shortDesc);
      const badge = btn.querySelector('[data-slot="start"]');
      if (badge) badge.classList.toggle('hidden', !item.startHere);
      btn.addEventListener('click', () => switchView('estimator', item.id));
      list.appendChild(btn);
    });

    document.getElementById('est-badge').textContent = tier.categoryLabel;
    document.getElementById('est-title').textContent = tier.name;
    const who = tier.fit || tier.shortDesc;
    document.getElementById('est-fit').textContent = who;
    document.getElementById('est-price').textContent = tier.price;
    document.getElementById('est-range').textContent = rangeText(tier);
    document.getElementById('est-turnaround').textContent = tier.turnaround;
    const note = document.getElementById('est-note');
    const showNote = tier.note && tier.note !== who;
    note.textContent = showNote ? tier.note : '';
    note.classList.toggle('hidden', !showNote);
    document.getElementById('load-form-btn').onclick = function () {
      switchView('contact', activeTierId);
    };
    const start = document.getElementById('est-start');
    start.classList.toggle('hidden', !tier.startHere);
    fillChecks(document.getElementById('est-deliverables'), tier.deliverables);
  }

  function applyTierToForm(tier) {
    const select = document.getElementById('serviceCategory');
    if (Array.from(select.options).some((option) => option.value === tier.formValue)) {
      select.value = tier.formValue;
    }
    document.getElementById('budgetTimeline').value = tier.budgetHint;
    const details = document.getElementById('projectDetails');
    const current = details.value.trim();
    if (!current || current.indexOf('Interested in:') === 0) {
      details.value = 'Interested in: ' + tier.name + ' (' + tier.price + ').\nKey goals / specs: ';
    }
  }

  function showForm() {
    document.getElementById('consultationForm').classList.remove('hidden');
    document.getElementById('formSuccessState').classList.add('hidden');
  }

  function currentKey() {
    const raw = (location.hash || '').replace(/^#/, '');
    return raw || 'home';
  }

  function targetKey(viewName, sub) {
    if (viewName === 'home' && !sub) return 'home';
    return viewName + (sub ? '/' + sub : '');
  }

  function switchView(viewName, subParam, opts) {
    opts = opts || {};
    if (VIEWS.indexOf(viewName) === -1) {
      viewName = 'home';
      subParam = null;
    }

    let sub = subParam || null;
    if (viewName === 'estimator') {
      const tier = resolveEstimator(sub);
      sub = tier.id;
      activeTierId = tier.id;
    }

    const nextKey = targetKey(viewName, sub);
    const section = document.getElementById('view-' + viewName);
    const already = section && !section.classList.contains('hidden');

    document.querySelectorAll('.view-section').forEach((sec) => sec.classList.add('hidden'));
    section.classList.remove('hidden');
    document.documentElement.removeAttribute('data-boot');

    document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach((btn) => {
      const on = btn.dataset.nav === viewName;
      btn.classList.toggle('is-current', on);
      if (on) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    if (viewName === 'estimator') renderEstimator();
    if (viewName === 'contact') {
      showForm();
      const tier = sub ? findTier(sub) : null;
      if (tier) applyTierToForm(tier);
    }

    closeMobileMenu();
    closeServiceModal();

    if (!already && !opts.keepScroll) {
      window.scrollTo({ top: 0, behavior: opts.instant ? 'auto' : 'smooth' });
    }

    if (!opts.fromHash && currentKey() !== nextKey) {
      location.hash = nextKey;
    } else if (viewName === 'estimator' && location.hash !== '#estimator/' + activeTierId) {
      history.replaceState(null, '', '#estimator/' + activeTierId);
    }
  }

  function routeFromHash(instant) {
    const raw = (location.hash || '').replace(/^#/, '');
    if (!raw || raw === 'home') {
      switchView('home', null, { fromHash: true, instant: instant });
      return;
    }
    const slash = raw.indexOf('/');
    const viewName = slash === -1 ? raw : raw.slice(0, slash);
    const sub = slash === -1 ? null : raw.slice(slash + 1);
    switchView(viewName, sub, { fromHash: true, instant: instant });
  }

  function toggleMobileMenu() {
    const drawer = document.getElementById('mobile-drawer');
    const open = drawer.classList.contains('hidden');
    drawer.classList.toggle('hidden', !open);
    document.getElementById('mobile-menu-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
    document.getElementById('icon-menu').classList.toggle('hidden', open);
    document.getElementById('icon-close').classList.toggle('hidden', !open);
  }

  function closeMobileMenu() {
    const drawer = document.getElementById('mobile-drawer');
    if (!drawer || drawer.classList.contains('hidden')) return;
    drawer.classList.add('hidden');
    const btn = document.getElementById('mobile-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.getElementById('icon-menu').classList.remove('hidden');
    document.getElementById('icon-close').classList.add('hidden');
  }

  function openServiceModal(id) {
    const service = D.services.find((item) => item.id === id);
    if (!service) return;
    const data = service.modal;
    document.getElementById('modalEyebrow').textContent = data.eyebrow;
    document.getElementById('modalTitle').textContent = data.title;
    document.getElementById('modalSummary').textContent = data.summary;
    document.getElementById('modalTurnaround').textContent = data.turnaround;
    fillChecks(document.getElementById('modalList'), data.standards);
    const cta = document.getElementById('modalCtaBtn');
    cta.onclick = () => {
      closeServiceModal();
      switchView('estimator', service.estimatorPreset);
    };
    const backdrop = document.getElementById('serviceModalBackdrop');
    backdrop.classList.remove('hidden');
    backdrop.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    cta.focus();
  }

  function closeServiceModal() {
    const backdrop = document.getElementById('serviceModalBackdrop');
    if (!backdrop) return;
    backdrop.classList.add('hidden');
    backdrop.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');
  }

  function mailto(subject, lines) {
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.filter(Boolean).join('\n'));
  }

  function openMailClient(href) {
    window.location.href = href;
  }

  function handleContactSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('clientName').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const service = document.getElementById('serviceCategory').value;
    const budget = document.getElementById('budgetTimeline').value.trim();
    const details = document.getElementById('projectDetails').value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const error = document.getElementById('formErrorBox');

    if (!name || !emailValid || !service || !details) {
      error.classList.remove('hidden');
      return;
    }
    error.classList.add('hidden');

    const subject = 'Consultation Request: ' + service + ' — ' + name;
    const href = mailto(subject, [
      'Name: ' + name,
      'Email: ' + email,
      'Phone: ' + (phone || 'Not provided'),
      'Service: ' + service,
      'Budget/Timeline: ' + (budget || 'Flexible'),
      '',
      'Project Details:',
      details,
      '',
      'Prepared from the Legacy Computing Services website. Nothing is delivered until you press Send.'
    ]);

    document.getElementById('confirmedClientName').textContent = name;
    document.getElementById('confirmedServiceName').textContent = service;
    document.getElementById('mailtoAgain').href = href;
    document.getElementById('consultationForm').classList.add('hidden');
    document.getElementById('formSuccessState').classList.remove('hidden');
    showToast('Opening your email app', 'Press Send to deliver your ' + service + ' request to ' + EMAIL + '. Nothing has been sent yet.');
    window.openMailClient(href);
  }

  function resetConsultationForm() {
    showForm();
    document.getElementById('projectDetails').focus();
  }

  function copyCompanyEmail() {
    const email = EMAIL;
    const clipboard = navigator.clipboard;
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      showToast('Couldn’t copy the address', 'Copy ' + email + ' manually. This browser did not provide clipboard access.', true);
      return;
    }
    clipboard.writeText(email).then(() => {
      showToast('Email copied', email + ' is on your clipboard.');
    }).catch(() => {
      showToast('Couldn’t copy the address', 'Copy ' + email + ' manually. Clipboard access was denied.', true);
    });
  }

  function showToast(title, message, isError) {
    const banner = document.getElementById('toastBanner');
    const icon = document.getElementById('toastIcon');
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMessage').textContent = message;
    icon.classList.toggle('is-error', !!isError);
    banner.classList.remove('translate-y-24', 'opacity-0');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      banner.classList.add('translate-y-24', 'opacity-0');
    }, 6000);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeServiceModal();
    closeMobileMenu();
  });

  function init() {
    bindText();
    renderPillars();
    renderHighlights();
    renderServices();
    renderAbout();
    renderContactOptions();
    checkContent();
    const year = document.getElementById('currentYear');
    if (year) year.textContent = String(new Date().getFullYear());
    const mail = document.getElementById('directEmailText');
    if (mail) mail.textContent = EMAIL;
    routeFromHash(true);
    window.addEventListener('hashchange', () => routeFromHash(false));
  }

  Object.assign(window, {
    switchView: switchView,
    toggleMobileMenu: toggleMobileMenu,
    openServiceModal: openServiceModal,
    closeServiceModal: closeServiceModal,
    handleContactSubmit: handleContactSubmit,
    resetConsultationForm: resetConsultationForm,
    copyCompanyEmail: copyCompanyEmail,
    openMailClient: openMailClient
  });

  init();
})();
