(() => {
  'use strict';

  document.documentElement.classList.add('js');
  const STORE = {
    theme: 'nar-w-dahab-theme',
    intro: 'nar-w-dahab-intro-v4-seen',
    transition: 'nar-w-dahab-page-transition-v2',
    cart: 'nar-w-dahab-cart-v1',
    reservations: 'nar-w-dahab-reservations-v1',
    orders: 'nar-w-dahab-orders-v1',
    messages: 'nar-w-dahab-messages-v1'
  };
  const session = {
    get(key) { try { return window.sessionStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { window.sessionStorage.setItem(key, value); } catch (_) {} },
    remove(key) { try { window.sessionStorage.removeItem(key); } catch (_) {} }
  };
  const local = {
    get(key) { try { return window.localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; } }
  };
  const arabicNumber = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 });
  const money = (value) => `${arabicNumber.format(Math.max(0, Math.round(Number(value) || 0)))} ج.م`;
  const toArabic = (value) => arabicNumber.format(Math.max(0, Math.round(Number(value) || 0)));

  function readArray(key) {
    try {
      const parsed = JSON.parse(local.get(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }
  function writeArray(key, value) { return local.set(key, JSON.stringify(value)); }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function makeReference(prefix, records) {
    let id = '';
    let tries = 0;
    do {
      let token;
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(4);
        window.crypto.getRandomValues(bytes);
        token = Array.from(bytes, (byte) => (byte % 36).toString(36)).join('').toUpperCase();
      } else token = Math.random().toString(36).slice(2, 8).toUpperCase();
      id = `${prefix}-${token}`;
      tries += 1;
    } while (records.some((record) => record.id === id) && tries < 8);
    return id;
  }
  function showToast(message) {
    const region = document.querySelector('.toast-region');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3500);
  }

  // Theme preference is shared by every page and saved in this browser.
  const storedTheme = local.get(STORE.theme);
  if (storedTheme === 'light' || storedTheme === 'dark') document.body.dataset.theme = storedTheme;
  function syncThemeControls() {
    const isLight = document.body.dataset.theme === 'light';
    document.querySelectorAll('.theme-toggle').forEach((button) => {
      const label = isLight ? 'الوضع الليلي' : 'الوضع النهاري';
      button.setAttribute('role', 'switch');
      button.setAttribute('aria-checked', String(isLight));
      button.setAttribute('aria-label', `التبديل إلى ${label}`);
      button.setAttribute('title', `التبديل إلى ${label}`);
      const text = button.querySelector('.theme-label');
      if (text) text.textContent = label;
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isLight ? '#f3efe6' : '#0b0a08';
  }
  document.querySelectorAll('.theme-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      document.body.dataset.theme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      local.set(STORE.theme, document.body.dataset.theme);
      syncThemeControls();
    });
  });
  syncThemeControls();

  // Cinematic intro: one appearance per session; the logo begins alone, then letters fall into place.
  function mountIntro() {
    const previewMode = new URLSearchParams(window.location.search).get('previewIntro') === '1';
    if (!previewMode && session.get(STORE.intro) === '1') return;
    session.set(STORE.intro, '1');

    const intro = document.createElement('div');
    intro.className = 'cinematic-intro';
    intro.setAttribute('role', 'dialog');
    intro.setAttribute('aria-modal', 'true');
    intro.setAttribute('aria-label', 'نار ودهب');
    intro.innerHTML = `
      <div class="intro-particles" aria-hidden="true"></div>
      <div class="intro-content">
        <div class="intro-emblem" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M32 8c2.3 7.2 12.1 12.4 12.1 25.2A12.1 12.1 0 1 1 20 33.2c0-4.7 2.1-8.3 5.4-12.3.5 5.2 3.1 7.5 3.1 7.5C28 20.5 30.4 14.1 32 8Z" fill="currentColor"/>
            <path d="M32 27.5c1.8 3 5.1 5.1 5.1 9.2a5.1 5.1 0 1 1-10.2 0c0-3 2.1-6.2 5.1-9.2Z" fill="#171109" opacity=".72"/>
          </svg>
        </div>
        <div class="intro-wordmark" role="img" aria-label="نار ودهب">
          <span class="intro-reveal-letters" aria-hidden="true"></span>
          <span class="intro-settled-word" aria-hidden="true">نار ودهب</span>
        </div>
      </div>`;
    document.body.appendChild(intro);

    const letterLayer = intro.querySelector('.intro-reveal-letters');
    const letters = Array.from('نار ودهب');
    letters.forEach((char, index) => {
      const letter = document.createElement('span');
      letter.className = char === ' ' ? 'intro-letter is-space' : 'intro-letter';
      letter.textContent = char === ' ' ? '\u00a0' : char;
      letter.style.setProperty('--glyph-delay', `${index * 0.16}s`);
      letterLayer.appendChild(letter);
    });

    // Soft, steady embers begin only after the logo has had a quiet moment on screen.
    const particles = intro.querySelector('.intro-particles');
    for (let index = 0; index < 14; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'intro-particle';
      particle.style.setProperty('--x', `${8 + ((index * 29) % 84)}%`);
      particle.style.setProperty('--size', `${2 + (index % 2)}px`);
      particle.style.setProperty('--delay', `${(index % 7) * 0.18}s`);
      particle.style.setProperty('--duration', `${4.8 + (index % 4) * 0.55}s`);
      particle.style.setProperty('--drift', `${((index % 5) - 2) * 13}px`);
      particles.appendChild(particle);
    }

    // Hold the emblem alone long enough to complete its turn before letters fall.
    window.setTimeout(() => intro.classList.add('is-revealing'), 2650);
    let closed = false;
    const closeIntro = () => {
      if (closed) return;
      closed = true;
      intro.classList.add('is-leaving');
      window.setTimeout(() => intro.remove(), 920);
    };
    // The word settles, then the curtain lifts after the full sequence.
    window.setTimeout(closeIntro, 6500);
  }
  const startIntroAfterLoad = () => {
    const start = () => window.requestAnimationFrame(mountIntro);
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(start, start);
    } else start();
  };
  if (document.readyState === 'complete') startIntroAfterLoad();
  else window.addEventListener('load', startIntroAfterLoad, { once: true });

  // Cross-page curtain: explicit state, a destination-scoped session token, and cleanup on every exit path.
  const curtain = document.querySelector('.page-curtain');
  const navToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.site-nav');
  let navigationInProgress = false;
  let navigationStarted = false;
  let incomingTransitionActive = false;
  let navigationTimer = 0;
  let navigationWatchdog = 0;
  let incomingTimer = 0;
  let leavingHandler = null;
  let enteringHandler = null;

  function normalizedPath(path) { return path.replace(/index\.html$/i, '').replace(/\/+$/, '/') || '/'; }
  function transitionTarget(url) { return `${normalizedPath(url.pathname)}${url.search || ''}`; }
  function closeNavigationMenu() {
    if (!mainNav?.classList.contains('is-open')) return;
    mainNav.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    navToggle?.setAttribute('aria-label', 'فتح القائمة');
  }
  function removeCurtainListeners() {
    if (!curtain) return;
    if (leavingHandler) curtain.removeEventListener('transitionend', leavingHandler);
    if (enteringHandler) curtain.removeEventListener('animationend', enteringHandler);
    leavingHandler = null;
    enteringHandler = null;
  }
  function hideCurtain() {
    if (incomingTimer) window.clearTimeout(incomingTimer);
    incomingTimer = 0;
    removeCurtainListeners();
    incomingTransitionActive = false;
    if (!curtain) return;
    curtain.classList.remove('is-leaving', 'is-entering');
    curtain.style.removeProperty('pointer-events');
    curtain.hidden = true;
  }
  function resetNavigationState({ clearPending = true, closeMenu = false } = {}) {
    if (navigationTimer) window.clearTimeout(navigationTimer);
    if (navigationWatchdog) window.clearTimeout(navigationWatchdog);
    navigationTimer = 0;
    navigationWatchdog = 0;
    navigationInProgress = false;
    navigationStarted = false;
    if (clearPending) session.remove(STORE.transition);
    hideCurtain();
    if (closeMenu) closeNavigationMenu();
  }
  function consumeIncomingTransition() {
    const raw = session.get(STORE.transition);
    session.remove(STORE.transition);
    if (!raw) return false;
    try {
      const pending = JSON.parse(raw);
      const age = Date.now() - Number(pending.at);
      return pending.to === transitionTarget(window.location) && age >= 0 && age < 15000;
    } catch (_) { return false; }
  }
  function finishIncomingTransition() {
    if (!incomingTransitionActive) return;
    hideCurtain();
  }
  function startIncomingTransition() {
    const shouldReveal = consumeIncomingTransition();
    if (!curtain) return;
    hideCurtain();
    if (!shouldReveal) return;
    curtain.hidden = false;
    incomingTransitionActive = true;
    enteringHandler = (event) => {
      if (event.target === curtain && event.animationName === 'curtain-reveal') finishIncomingTransition();
    };
    curtain.addEventListener('animationend', enteringHandler);
    curtain.classList.add('is-entering');
    incomingTimer = window.setTimeout(finishIncomingTransition, 1100);
  }
  function startPageNavigation(destination) {
    if (navigationInProgress || incomingTransitionActive) return;
    if (!curtain || !curtain.isConnected) {
      window.location.assign(destination.href);
      return;
    }
    navigationInProgress = true;
    navigationStarted = false;
    session.set(STORE.transition, JSON.stringify({ to: transitionTarget(destination), at: Date.now() }));
    curtain.hidden = false;
    curtain.classList.remove('is-entering', 'is-leaving');
    curtain.style.removeProperty('pointer-events');
    void curtain.offsetHeight;

    const navigate = () => {
      if (!navigationInProgress || navigationStarted) return;
      navigationStarted = true;
      if (navigationTimer) window.clearTimeout(navigationTimer);
      navigationTimer = 0;
      if (leavingHandler) curtain.removeEventListener('transitionend', leavingHandler);
      leavingHandler = null;
      navigationWatchdog = window.setTimeout(() => {
        if (navigationInProgress) resetNavigationState({ clearPending: true, closeMenu: true });
      }, 2500);
      try { window.location.assign(destination.href); }
      catch (_) { resetNavigationState({ clearPending: true, closeMenu: true }); }
    };

    leavingHandler = (event) => {
      if (event.target === curtain && event.propertyName === 'transform') navigate();
    };
    curtain.addEventListener('transitionend', leavingHandler);
    window.requestAnimationFrame(() => {
      if (!navigationInProgress) return;
      curtain.classList.add('is-leaving');
      navigationTimer = window.setTimeout(navigate, 760);
    });
  }

  startIncomingTransition();
  window.addEventListener('pagehide', () => {
    // Keep the token only when our scheduled forward navigation has actually started.
    const keepPending = navigationStarted;
    resetNavigationState({ clearPending: !keepPending, closeMenu: true });
  });
  window.addEventListener('popstate', () => resetNavigationState({ clearPending: true, closeMenu: true }));
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) resetNavigationState({ clearPending: true, closeMenu: true });
  });

  // Mobile menu and header scroll tint.
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!open));
      navToggle.setAttribute('aria-label', open ? 'فتح القائمة' : 'إغلاق القائمة');
      mainNav.classList.toggle('is-open', !open);
    });
  }
  const header = document.querySelector('.site-header');
  let headerFrame = 0;
  window.addEventListener('scroll', () => {
    if (headerFrame) return;
    headerFrame = window.requestAnimationFrame(() => {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
      headerFrame = 0;
    });
  }, { passive: true });
  if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);

  // Internal page links close the mobile menu first and then enter the guarded curtain state.
  document.addEventListener('click', (event) => {
    const social = event.target.closest('[data-social]');
    if (social) {
      event.preventDefault();
      showToast(`حساب ${social.dataset.social} سيُعلن عنه قريبًا.`);
      return;
    }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    if (mainNav?.contains(link)) closeNavigationMenu();
    const rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;
    let destination;
    try { destination = new URL(link.href, window.location.href); } catch (_) { return; }
    if (destination.origin !== window.location.origin || !/\.html?$/i.test(destination.pathname)) return;
    // Keep same-page anchors native; they should not start a full-page curtain cycle.
    if (transitionTarget(destination) === transitionTarget(window.location)) return;

    event.preventDefault();
    if (navigationInProgress || incomingTransitionActive) return;
    closeNavigationMenu();
    startPageNavigation(destination);
  });

  // Scroll reveals and restrained parallax.
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -30px 0px' });
    revealEls.forEach((element) => revealObserver.observe(element));
  } else revealEls.forEach((element) => element.classList.add('is-visible'));

  const parallaxAssets = Array.from(document.querySelectorAll('.parallax-asset'));
  if (parallaxAssets.length) {
    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      const viewport = window.innerHeight || 1;
      parallaxAssets.forEach((asset) => {
        const rect = asset.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > viewport + 100) return;
        const drift = Math.max(-14, Math.min(14, (viewport / 2 - (rect.top + rect.height / 2)) * .025));
        const scale = asset.classList.contains('hero-photo') ? 1.035 : 1.055;
        asset.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0) scale(${scale})`;
      });
    };
    const queue = () => { if (!frame) frame = window.requestAnimationFrame(updateParallax); };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    queue();
  }

  // Home statistics.
  const counters = Array.from(document.querySelectorAll('.stat-number[data-count]'));
  function animateCounter(node) {
    if (node.dataset.counted === 'true') return;
    node.dataset.counted = 'true';
    const end = Number(node.dataset.count || 0);
    const suffix = node.dataset.suffix || '';
    const start = performance.now();
    const duration = 1450;
    const draw = (now) => {
      const progress = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = `${toArabic(Math.round(end * eased))}${suffix}`;
      if (progress < 1) window.requestAnimationFrame(draw);
    };
    window.requestAnimationFrame(draw);
  }
  if (counters.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, instance) => entries.forEach((entry) => {
      if (entry.isIntersecting) { animateCounter(entry.target); instance.unobserve(entry.target); }
    }), { threshold: .6 });
    counters.forEach((counter) => observer.observe(counter));
  } else counters.forEach(animateCounter);

  // Guest-review slider.
  const reviews = [
    { quote: '«من أول رائحة الفحم حسّيت إنّي في بيت مصري أصيل. الأكل ممتاز، والخدمة فيها كرم حقيقي.»', name: 'مريم عادل', initial: 'م', location: 'القاهرة · زيارة عائلية' },
    { quote: '«تفاصيل المكان جميلة من غير تكلّف، والريش المشوي كان من ألذ الأطباق اللي جرّبناها.»', name: 'عمر فتحي', initial: 'ع', location: 'المعادي · عشاء مع الأصدقاء' },
    { quote: '«أحلى ختام كان الشاي والكنافة. حسّيت إن الوقت وقف شوية، ودي أمسية تستاهل تتكرر.»', name: 'ليلى حسن', initial: 'ل', location: 'الزمالك · أمسية هادئة' }
  ];
  const reviewCard = document.querySelector('.testimonial-card');
  if (reviewCard) {
    let active = 0;
    const showReview = (next) => {
      active = (next + reviews.length) % reviews.length;
      const review = reviews[active];
      reviewCard.classList.add('is-changing');
      window.setTimeout(() => {
        reviewCard.querySelector('[data-review-quote]').textContent = review.quote;
        reviewCard.querySelector('[data-review-name]').textContent = review.name;
        reviewCard.querySelector('[data-review-initial]').textContent = review.initial;
        reviewCard.querySelector('[data-review-location]').textContent = review.location;
        const counter = document.querySelector('[data-review-current]');
        if (counter) counter.textContent = String(active + 1).padStart(2, '0');
        reviewCard.classList.remove('is-changing');
      }, 180);
    };
    document.querySelector('[data-review-prev]')?.addEventListener('click', () => showReview(active - 1));
    document.querySelector('[data-review-next]')?.addEventListener('click', () => showReview(active + 1));
  }

  // Menu filtering.
  const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
  const menuCards = Array.from(document.querySelectorAll('.menu-card[data-category]'));
  if (filterButtons.length && menuCards.length) {
    const empty = document.querySelector('.menu-empty');
    filterButtons.forEach((button) => button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((other) => {
        const selected = other === button;
        other.classList.toggle('is-active', selected);
        other.setAttribute('aria-pressed', String(selected));
      });
      let matches = 0;
      menuCards.forEach((card, index) => {
        window.clearTimeout(card._filterTimer);
        const show = filter === 'all' || card.dataset.category === filter;
        if (show) {
          matches += 1;
          card.classList.remove('is-filtering-out');
          card.hidden = false;
          card.setAttribute('aria-hidden', 'false');
          card.classList.add('is-visible');
          card.classList.remove('is-filtering-in');
          void card.offsetWidth;
          card.classList.add('is-filtering-in');
          card._filterTimer = window.setTimeout(() => card.classList.remove('is-filtering-in'), 500 + index * 5);
        } else if (!card.hidden) {
          card.classList.add('is-filtering-out');
          card.setAttribute('aria-hidden', 'true');
          card._filterTimer = window.setTimeout(() => { card.hidden = true; card.classList.remove('is-filtering-out'); }, 230);
        }
      });
      if (empty) empty.hidden = matches > 0;
    }));
  }

  // Browser-local cart and live header count.
  function loadCart() {
    return readArray(STORE.cart).filter((item) => item && typeof item.id === 'string' && /^[a-z0-9-]{1,50}$/i.test(item.id))
      .map((item) => ({ id: item.id, name: String(item.name || '').slice(0, 90), price: Math.max(0, Number(item.price) || 0), qty: Math.max(1, Math.min(99, Math.floor(Number(item.qty) || 1))) }))
      .filter((item) => item.name && item.price > 0);
  }
  function renderCartBadges() {
    const count = loadCart().reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = toArabic(count);
      const link = badge.closest('.cart-header-link');
      if (link) link.setAttribute('aria-label', count ? `السلة، ${toArabic(count)} عناصر` : 'السلة فارغة');
    });
  }
  function persistCart(cart) {
    const ok = writeArray(STORE.cart, cart);
    renderCartBadges();
    renderCartPage();
    return ok;
  }
  function renderCartPage() {
    const itemsNode = document.querySelector('[data-cart-items]');
    if (!itemsNode) return;
    const cart = loadCart();
    const empty = document.querySelector('[data-cart-empty]');
    const summary = document.querySelector('[data-cart-summary]');
    const checkout = document.querySelector('[data-checkout-open]');
    const hasItems = cart.length > 0;
    if (empty) empty.hidden = hasItems;
    if (summary) summary.hidden = !hasItems;
    itemsNode.hidden = !hasItems;
    if (!hasItems) {
      itemsNode.replaceChildren();
      return;
    }
    itemsNode.innerHTML = cart.map((item) => `
      <article class="cart-row" data-cart-row="${escapeHtml(item.id)}">
        <div class="cart-item-main"><span class="cart-item-emblem" aria-hidden="true">✦</span><div class="cart-item-copy"><h3>${escapeHtml(item.name)}</h3><span>سعر القطعة · ${money(item.price)}</span></div></div>
        <div class="cart-item-actions">
          <div class="quantity-control" role="group" aria-label="كمية ${escapeHtml(item.name)}">
            <button type="button" class="quantity-btn" data-cart-action="decrease" data-product-id="${escapeHtml(item.id)}" aria-label="تقليل الكمية">−</button>
            <span class="quantity-value">${toArabic(item.qty)}</span>
            <button type="button" class="quantity-btn" data-cart-action="increase" data-product-id="${escapeHtml(item.id)}" aria-label="زيادة الكمية">+</button>
          </div>
          <strong class="cart-line-total">${money(item.price * item.qty)}</strong>
          <button type="button" class="cart-remove-btn" data-cart-action="remove" data-product-id="${escapeHtml(item.id)}">حذف</button>
        </div>
      </article>`).join('');
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const subtotal = document.querySelector('[data-cart-subtotal]');
    const totalNode = document.querySelector('[data-cart-total]');
    if (subtotal) subtotal.textContent = money(total);
    if (totalNode) totalNode.textContent = money(total);
    if (checkout) checkout.disabled = !hasItems;
  }
  renderCartBadges();
  renderCartPage();

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('[data-add-to-cart]');
    if (!addButton) return;
    const card = addButton.closest('.menu-card');
    if (!card) return;
    const id = card.dataset.productId || '';
    const price = Number(card.dataset.price || 0);
    const name = card.querySelector('.dish-title-row .dish-title')?.textContent.trim() || '';
    if (!id || !name || price <= 0) { showToast('تعذرت إضافة هذا الطبق. حاول مرة أخرى.'); return; }
    const cart = loadCart();
    const existing = cart.find((item) => item.id === id);
    if (existing) existing.qty = Math.min(99, existing.qty + 1);
    else cart.push({ id, name, price, qty: 1 });
    if (!persistCart(cart)) { showToast('تعذر حفظ السلة في هذا المتصفح.'); return; }
    addButton.classList.add('is-added');
    const label = addButton.querySelector('span');
    const original = 'أضف إلى السلة';
    if (label) label.textContent = 'أُضيفت للسلة';
    window.setTimeout(() => { addButton.classList.remove('is-added'); if (label) label.textContent = original; }, 1500);
    showToast(`أُضيف ${name} إلى سلتك.`);
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    if (!button) return;
    const id = button.dataset.productId;
    const action = button.dataset.cartAction;
    let cart = loadCart();
    const item = cart.find((entry) => entry.id === id);
    if (!item) return;
    if (action === 'increase') item.qty = Math.min(99, item.qty + 1);
    if (action === 'decrease') {
      if (item.qty <= 1) cart = cart.filter((entry) => entry.id !== id);
      else item.qty -= 1;
    }
    if (action === 'remove') cart = cart.filter((entry) => entry.id !== id);
    persistCart(cart);
  });

  const checkoutOpen = document.querySelector('[data-checkout-open]');
  const checkoutPanel = document.querySelector('[data-checkout-panel]');
  const cartLayout = document.querySelector('[data-cart-layout]');
  checkoutOpen?.addEventListener('click', () => {
    if (!loadCart().length) { showToast('أضف طبقًا إلى السلة أولًا.'); return; }
    if (checkoutPanel) {
      checkoutPanel.hidden = false;
      checkoutPanel.classList.add('is-visible');
      checkoutPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  const orderForm = document.querySelector('#order-form');
  if (orderForm) {
    const typeSelect = orderForm.querySelector('#order-type');
    const addressWrap = orderForm.querySelector('[data-delivery-address]');
    const address = orderForm.querySelector('#order-address');
    const orderError = orderForm.querySelector('[data-order-error]');
    const orderSuccess = document.querySelector('[data-order-success]');
    const toggleAddress = () => {
      const delivery = typeSelect?.value === 'delivery';
      if (addressWrap) addressWrap.hidden = !delivery;
      if (address) address.required = Boolean(delivery);
    };
    typeSelect?.addEventListener('change', toggleAddress);
    toggleAddress();
    orderForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const cart = loadCart();
      if (!cart.length) { if (orderError) { orderError.hidden = false; orderError.textContent = 'سلتك فارغة؛ أضف أطباقك قبل إتمام الطلب.'; } return; }
      if (!orderForm.checkValidity()) {
        if (orderError) { orderError.hidden = false; orderError.textContent = 'يرجى مراجعة الحقول المطلوبة لإتمام الطلب.'; }
        orderForm.querySelector(':invalid')?.focus();
        return;
      }
      if (orderError) orderError.hidden = true;
      const data = new FormData(orderForm);
      const orders = readArray(STORE.orders);
      const order = {
        id: makeReference('NWD', orders),
        name: String(data.get('name') || '').trim().slice(0, 70),
        phone: String(data.get('phone') || '').trim().slice(0, 20),
        type: String(data.get('type') || ''),
        address: String(data.get('address') || '').trim().slice(0, 220),
        time: String(data.get('time') || ''),
        notes: String(data.get('notes') || '').trim().slice(0, 300),
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
        status: 'saved',
        createdAt: new Date().toISOString()
      };
      if (!writeArray(STORE.orders, [order, ...orders])) { showToast('تعذر حفظ الطلب في هذا المتصفح.'); return; }
      if (cartLayout) cartLayout.hidden = true;
      orderForm.hidden = true;
      if (orderSuccess) {
        orderSuccess.hidden = false;
        const orderId = orderSuccess.querySelector('[data-order-id]');
        const summary = orderSuccess.querySelector('[data-order-summary]');
        if (orderId) orderId.textContent = order.id;
        if (summary) summary.textContent = `${order.type === 'delivery' ? 'توصيل إلى العنوان' : 'استلام من المطعم'} · ${order.time} · ${money(order.total)}`;
      }
      persistCart([]);
      renderActivity();
    });
  }

  // Reservations are kept locally so guests can review or cancel them later.
  const bookingForm = document.querySelector('#booking-form');
  if (bookingForm) {
    const dateInput = bookingForm.querySelector('#booking-date');
    if (dateInput) {
      const now = new Date();
      dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }
    const error = bookingForm.querySelector('[data-form-error]');
    const success = document.querySelector('#booking-success');
    bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!bookingForm.checkValidity()) {
        if (error) error.hidden = false;
        bookingForm.querySelector(':invalid')?.focus();
        return;
      }
      if (error) error.hidden = true;
      const data = new FormData(bookingForm);
      const reservations = readArray(STORE.reservations);
      const dateValue = String(data.get('date') || '');
      const dateObject = new Date(`${dateValue}T12:00:00`);
      const dateLabel = Number.isNaN(dateObject.getTime()) ? dateValue : new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(dateObject);
      const guestOption = bookingForm.querySelector('#guest-count option:checked');
      const reservation = {
        id: makeReference('NWD-R', reservations),
        name: String(data.get('name') || '').trim().slice(0, 70),
        phone: String(data.get('phone') || '').trim().slice(0, 20),
        guests: String(data.get('guests') || ''),
        guestsLabel: guestOption?.textContent.trim() || '',
        date: dateValue,
        dateLabel,
        time: String(data.get('time') || ''),
        notes: String(data.get('notes') || '').trim().slice(0, 300),
        status: 'saved',
        createdAt: new Date().toISOString()
      };
      if (!writeArray(STORE.reservations, [reservation, ...reservations])) { showToast('تعذر حفظ الحجز في هذا المتصفح.'); return; }
      const name = success?.querySelector('[data-success-name]');
      const details = success?.querySelector('[data-success-details]');
      const id = success?.querySelector('[data-booking-id]');
      if (name) name.textContent = reservation.name;
      if (details) details.textContent = `${reservation.dateLabel} · ${reservation.time} · ${reservation.guestsLabel}`;
      if (id) id.textContent = reservation.id;
      bookingForm.hidden = true;
      if (success) success.hidden = false;
      renderActivity();
    });
    document.querySelector('[data-booking-new]')?.addEventListener('click', () => {
      bookingForm.reset();
      if (error) error.hidden = true;
      if (success) success.hidden = true;
      bookingForm.hidden = false;
      bookingForm.querySelector('#guest-name')?.focus();
    });
  }

  function formatStoredDate(value) {
    if (!value) return '';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }
  function renderActivity() {
    const reservationsHost = document.querySelector('[data-reservations-list]');
    const ordersHost = document.querySelector('[data-orders-list]');
    if (!reservationsHost && !ordersHost) return;
    const reservations = readArray(STORE.reservations);
    const orders = readArray(STORE.orders);
    const reservationsEmpty = document.querySelector('[data-reservations-empty]');
    const ordersEmpty = document.querySelector('[data-orders-empty]');
    if (reservationsEmpty) reservationsEmpty.hidden = reservations.length > 0;
    if (ordersEmpty) ordersEmpty.hidden = orders.length > 0;
    if (reservationsHost) {
      reservationsHost.innerHTML = reservations.map((record) => {
        const cancelled = record.status === 'cancelled';
        const ref = escapeHtml(record.id || '');
        const guestText = escapeHtml(record.guestsLabel || `${record.guests || ''} أشخاص`);
        return `<article class="activity-card">
          <div class="activity-card-top"><div><span class="activity-type">حجز طاولة</span><h3>رقم الحجز <b>${ref}</b></h3></div><span class="activity-status ${cancelled ? 'is-cancelled' : 'is-saved'}">${cancelled ? 'ملغي' : 'محفوظ'}</span></div>
          <div class="activity-details"><span><small>التاريخ</small><b>${escapeHtml(record.dateLabel || formatStoredDate(record.date))}</b></span><span><small>الوقت</small><b>${escapeHtml(record.time || '')}</b></span><span><small>الضيوف</small><b>${guestText}</b></span></div>
          ${record.notes ? `<p class="activity-note">ملاحظات: ${escapeHtml(record.notes)}</p>` : ''}
          ${cancelled ? '' : `<button type="button" class="cancel-booking-btn" data-cancel-reservation="${ref}">إلغاء الحجز</button>`}
        </article>`;
      }).join('');
    }
    if (ordersHost) {
      ordersHost.innerHTML = orders.map((record) => {
        const itemsText = Array.isArray(record.items) ? record.items.map((item) => `${escapeHtml(item.name)} × ${toArabic(item.qty)}`).join('، ') : '';
        const typeLabel = record.type === 'delivery' ? 'توصيل' : 'استلام من المطعم';
        const statusLabel = record.status === 'cancelled' ? 'ملغي' : 'محفوظ';
        const statusClass = record.status === 'cancelled' ? 'is-cancelled' : 'is-saved';
        const created = record.createdAt ? new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(record.createdAt)) : '';
        return `<article class="activity-card">
          <div class="activity-card-top"><div><span class="activity-type">طلب طعام</span><h3>رقم الطلب <b>${escapeHtml(record.id || '')}</b></h3></div><span class="activity-status ${statusClass}">${statusLabel}</span></div>
          <p class="order-items-summary">${itemsText}</p>
          <div class="activity-details"><span><small>طريقة الاستلام</small><b>${typeLabel}</b></span><span><small>الوقت</small><b>${escapeHtml(record.time || '')}</b></span><span><small>الإجمالي</small><b>${money(record.total)}</b></span></div>
          ${record.address ? `<p class="activity-note">العنوان: ${escapeHtml(record.address)}</p>` : ''}
          ${created ? `<span class="activity-created">${escapeHtml(created)}</span>` : ''}
        </article>`;
      }).join('');
    }
  }
  renderActivity();

  document.addEventListener('click', (event) => {
    const cancelButton = event.target.closest('[data-cancel-reservation]');
    if (!cancelButton) return;
    const id = cancelButton.dataset.cancelReservation;
    const reservations = readArray(STORE.reservations);
    const target = reservations.find((record) => record.id === id);
    if (!target || target.status === 'cancelled') return;
    target.status = 'cancelled';
    target.cancelledAt = new Date().toISOString();
    if (!writeArray(STORE.reservations, reservations)) { showToast('تعذر تحديث الحجز.'); return; }
    renderActivity();
    showToast('تم إلغاء الحجز.');
  });

  // Contact messages are retained locally and receive a visible confirmation.
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    const error = contactForm.querySelector('[data-contact-error]');
    const success = document.querySelector('[data-contact-success]');
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!contactForm.checkValidity()) {
        if (error) error.hidden = false;
        contactForm.querySelector(':invalid')?.focus();
        return;
      }
      if (error) error.hidden = true;
      const data = new FormData(contactForm);
      const messages = readArray(STORE.messages);
      const message = { id: makeReference('MSG', messages), name: String(data.get('name') || '').trim().slice(0, 70), phone: String(data.get('phone') || '').trim().slice(0, 20), email: String(data.get('email') || '').trim().slice(0, 100), message: String(data.get('message') || '').trim().slice(0, 900), createdAt: new Date().toISOString() };
      if (!writeArray(STORE.messages, [message, ...messages])) { showToast('تعذر حفظ رسالتك. حاول مرة أخرى.'); return; }
      const name = success?.querySelector('[data-contact-success-name]');
      if (name) name.textContent = message.name;
      contactForm.hidden = true;
      if (success) success.hidden = false;
    });
    document.querySelector('[data-contact-new]')?.addEventListener('click', () => {
      contactForm.reset();
      if (error) error.hidden = true;
      if (success) success.hidden = true;
      contactForm.hidden = false;
      contactForm.querySelector('#contact-name')?.focus();
    });
  }

  // Keep localStorage changes from other tabs in sync with visible counts and lists.
  window.addEventListener('storage', (event) => {
    if ([STORE.cart, STORE.reservations, STORE.orders].includes(event.key)) {
      renderCartBadges();
      renderCartPage();
      renderActivity();
    }
  });

  // Ripple for interactive controls.
  document.addEventListener('pointerdown', (event) => {
    const target = event.target.closest('.btn, .slider-btn, .add-to-cart-btn, .quantity-btn');
    if (!target || event.button !== 0 || target.disabled) return;
    const rect = target.getBoundingClientRect();
    const diameter = Math.max(rect.width, rect.height) * 1.5;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - diameter / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - diameter / 2}px`;
    target.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 700);
  }, { passive: true });

  // Update the displayed copyright year.
  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(new Date().getFullYear());
  });
})();
