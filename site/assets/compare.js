/* Riotous Audio — Product Compare (vanilla JS, no build step)
 * ==========================================================================
 * A client-side "compare up to 4 products" module for the static storefront.
 *
 *   - Toggle buttons on listing cards + product pages add/remove handles.
 *   - A sticky bar (chips + counter + Compare) tracks the current selection.
 *   - "Compare" opens a side-by-side spec table — either in a MODAL (drawer
 *     sibling) or, on /compare?skus=..., rendered inline as a shareable page.
 *   - Selection persists in localStorage ("ra_compare", max 4) across pages.
 *
 * Spec data is loaded once from /assets/ra-specs.json:
 *   { handle -> { handle, name, brand, series, type, price, image, url,
 *                 specGroups:[ { section, rows:[ [label,value], ... ] } ] } }
 *
 * Mirrors assets/cart.js conventions: IIFE + 'use strict', the el()/money()
 * helpers, the #ra-*-root mount pattern, and the readyState init guard.
 * It also calls into window.RA_CART for the in-table Add-to-Cart buttons.
 *
 * PROJECT RULE — NO SILENT FAILURES: every failure path surfaces a visible
 * message in the UI AND logs to console.error. Nothing fails quietly.
 * ==========================================================================
 */
(function () {
  'use strict';

  /* --- error logging (operator: capture errors + keep them visible). Read with RA_LOG.dump() --- */
  if (!window.RA_LOG) {
    (function () {
      var KEY = 'ra_error_log', MAX = 60;
      function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
      function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-MAX))); } catch (e) {} }
      function record(src, msg, detail) {
        var entry = { t: new Date().toISOString(), src: src, msg: String(msg == null ? '' : msg), detail: detail != null ? String(detail) : '', url: location.pathname };
        var a = load(); a.push(entry); save(a);
        try { console.error('[RA-LOG]', entry.t, src + ':', entry.msg, entry.detail); } catch (e) {}
        return entry;
      }
      window.RA_LOG = {
        record: record, errors: load,
        clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
        dump: function () { return load().map(function (e) { return e.t + ' [' + e.src + '] ' + e.msg + (e.detail ? ' :: ' + e.detail : '') + '  (' + e.url + ')'; }).join('\n'); }
      };
      window.addEventListener('error', function (e) { record('window', e.message, (e.filename || '') + ':' + (e.lineno || '')); });
      window.addEventListener('unhandledrejection', function (e) { record('promise', (e.reason && e.reason.message) || e.reason, ''); });
    })();
  }


  /* ---- constants -------------------------------------------------------- */
  var LS_KEY = 'ra_compare';
  var MAX = 4;
  var SPECS_URL = '/assets/ra-specs.json';
  var EMPTY = '—'; // em dash, used for missing cells
  var LABEL_OFF = 'Compare';
  var LABEL_ON = '✓ Comparing';

  /* ---- tiny DOM helpers (same shape as cart.js) ------------------------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') n.className = attrs[k];
        else if (k === 'text') n.textContent = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') {
          n.addEventListener(k.slice(2), attrs[k]);
        } else if (attrs[k] != null) {
          n.setAttribute(k, attrs[k]);
        }
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function money(amount, currency) {
    var num = Number(amount);
    if (isNaN(num)) return String(amount);
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency', currency: currency || 'USD'
      }).format(num);
    } catch (e) {
      return '$' + num.toFixed(2);
    }
  }

  /* ---- state (handles only; specs joined in at render time) ------------- */
  var state = { handles: [] };

  function readLS() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      // sanitise: strings only, de-duped, capped at MAX
      var out = [];
      arr.forEach(function (h) {
        if (typeof h === 'string' && h && out.indexOf(h) === -1) out.push(h);
      });
      return out.slice(0, MAX);
    } catch (e) {
      console.error('[RA-CMP] could not read saved comparison:', e);
      return [];
    }
  }

  function writeLS() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state.handles));
    } catch (e) {
      // Private mode etc. — selection just won't persist. Surface it.
      console.error('[RA-CMP] could not save comparison (storage blocked):', e);
    }
  }

  /* ---- spec data (lazy, cached promise) --------------------------------- */
  var specsPromise = null;
  var specsMap = null; // resolved cache for synchronous lookups after load

  function loadSpecs() {
    if (specsPromise) return specsPromise;
    specsPromise = fetch(SPECS_URL, { headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Specs request returned ' + res.status + ' ' +
            res.statusText + '.');
        }
        return res.json();
      })
      .then(function (json) {
        if (!json || typeof json !== 'object') {
          throw new Error('Specs file was not a valid object.');
        }
        specsMap = json;
        return json;
      })
      .catch(function (e) {
        // Reset so a later attempt can retry rather than caching the failure.
        specsPromise = null;
        console.error('[RA-CMP] failed to load product specs:', e);
        throw e;
      });
    return specsPromise;
  }

  // Synchronous lookup; null if specs not loaded yet or handle unknown.
  function specFor(handle) {
    if (specsMap && specsMap[handle]) return specsMap[handle];
    return null;
  }

  function stubSpec(handle) {
    return {
      handle: handle,
      name: handle,
      brand: '', series: '', type: '',
      price: null,
      image: '',
      url: '/product/' + handle + '/',
      specGroups: []
    };
  }

  /* ---- DOM references (built once) -------------------------------------- */
  var refs = {};
  var lastFocus = null; // restore focus when the modal closes

  function ensureRoot() {
    if (refs.root) return refs.root;
    var mount = document.getElementById('ra-cmp-root');
    if (!mount) {
      mount = el('div', { id: 'ra-cmp-root' });
      document.body.appendChild(mount);
    }
    refs.root = mount;
    return mount;
  }

  /* ---- sticky bar ------------------------------------------------------- */
  function ensureBar() {
    if (refs.bar) return refs.bar;
    var root = ensureRoot();

    var chips = el('div', { class: 'ra-cmp-chips' });

    var counter = el('span', {
      class: 'ra-cmp-count', 'aria-live': 'polite'
    });

    var clearBtn = el('button', {
      class: 'ra-cmp-clear', type: 'button',
      'aria-label': 'Clear all compared items',
      text: 'Clear',
      onclick: function () { clear(); }
    });

    var goBtn = el('button', {
      class: 'ra-cmp-go', type: 'button',
      'aria-label': 'Open comparison',
      text: 'Compare',
      onclick: function () { open(); }
    });

    var bar = el('div', {
      id: 'ra-cmp-bar', class: 'ra-cmp-bar',
      role: 'region', 'aria-label': 'Product comparison tray'
    }, [
      chips,
      el('div', { class: 'ra-cmp-bar-actions' }, [counter, clearBtn, goBtn])
    ]);
    bar.hidden = true;

    root.appendChild(bar);

    refs.bar = bar;
    refs.chips = chips;
    refs.count = counter;
    refs.clear = clearBtn;
    refs.go = goBtn;
    return bar;
  }

  function renderBar() {
    ensureBar();
    var n = state.handles.length;

    // Visibility: hidden at 0, shown otherwise (contract: [hidden] attribute).
    refs.bar.hidden = (n === 0);

    refs.count.textContent = n + ' / ' + MAX;

    // Compare button enabled only with 2+ selected.
    var canCompare = n >= 2;
    refs.go.disabled = !canCompare;
    if (canCompare) refs.go.removeAttribute('aria-disabled');
    else refs.go.setAttribute('aria-disabled', 'true');

    // Chips: thumb + short name + remove.
    refs.chips.innerHTML = '';
    state.handles.forEach(function (handle) {
      var spec = specFor(handle) || stubSpec(handle);
      var children = [];
      if (spec.image) {
        children.push(el('img', {
          class: 'ra-cmp-chip-img', src: spec.image, alt: '', loading: 'lazy'
        }));
      }
      children.push(el('span', {
        class: 'ra-cmp-chip-name', text: spec.name || handle
      }));
      children.push(el('button', {
        class: 'ra-cmp-chip-x', type: 'button',
        'aria-label': 'Remove ' + (spec.name || handle) + ' from comparison',
        html: '&times;',
        onclick: function () { remove(handle); }
      }));
      refs.chips.appendChild(el('div', { class: 'ra-cmp-chip' }, children));
    });
  }

  /* ---- toggle button reflection (across ALL toggles in the DOM) --------- */
  function reflectToggles() {
    var btns = document.querySelectorAll('.ra-cmp-toggle[data-ra-handle]');
    Array.prototype.forEach.call(btns, function (btn) {
      var handle = btn.getAttribute('data-ra-handle');
      var on = state.handles.indexOf(handle) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) btn.classList.add('is-active');
      else btn.classList.remove('is-active');
      // Only rewrite the label when the button owns its text. A styled
      // icon-button can opt out with data-ra-keeplabel.
      if (!btn.hasAttribute('data-ra-keeplabel')) {
        btn.textContent = on ? LABEL_ON : LABEL_OFF;
      }
      if (!btn.getAttribute('aria-label')) {
        btn.setAttribute('aria-label',
          on ? 'Remove from comparison' : 'Add to comparison');
      }
    });
  }

  /* ---- the one place that re-paints everything after a state change ------ */
  function syncUI() {
    renderBar();
    reflectToggles();
    // If a modal/page view is open, keep it live with the selection.
    if (refs.modalOpen) renderInto(refs.modalBody);
    if (refs.pageContainer) renderInto(refs.pageContainer);
  }

  /* ---- visible, transient message (NO SILENT FAILURES) ------------------ */
  var msgTimer = null;
  function flash(text, kind) {
    ensureBar();
    var box = refs.msg;
    if (!box) {
      box = el('div', {
        class: 'ra-cmp-msg', role: 'status', 'aria-live': 'polite'
      });
      refs.bar.appendChild(box);
      refs.msg = box;
    }
    box.textContent = text || '';
    box.setAttribute('data-kind', kind || 'info');
    box.style.display = text ? 'block' : 'none';
    // Make sure the bar is visible so the message is actually seen even at 0.
    if (text) refs.bar.hidden = false;
    if ((kind || '') === 'error' && window.RA_LOG) window.RA_LOG.record('compare', text);
    if (msgTimer) clearTimeout(msgTimer);
    if (text && (kind || '') !== 'error') {
      msgTimer = setTimeout(function () {
        if (refs.msg) {
          refs.msg.style.display = 'none';
          refs.msg.textContent = '';
        }
        // Re-apply the real visibility rule once the message clears.
        renderBar();
      }, 4000);
    }
  }

  /* ---- state mutations -------------------------------------------------- */
  function add(handle) {
    if (!handle) return false;
    if (state.handles.indexOf(handle) !== -1) return true; // already in
    if (state.handles.length >= MAX) {
      flash('Compare holds up to ' + MAX + ' items. Remove one to add another.',
        'error');
      return false;
    }
    state.handles.push(handle);
    writeLS();
    // Warm specs so the chip thumbnail/name can fill in shortly.
    loadSpecs().then(syncUI).catch(function () {/* already surfaced */});
    syncUI();
    syncCompareUrl();
    return true;
  }

  function remove(handle) {
    var i = state.handles.indexOf(handle);
    if (i === -1) return;
    state.handles.splice(i, 1);
    writeLS();
    syncUI();
    syncCompareUrl();
  }

  function toggle(handle) {
    if (!handle) return;
    if (state.handles.indexOf(handle) !== -1) remove(handle);
    else add(handle);
  }

  function clear() {
    if (!state.handles.length) return;
    state.handles = [];
    writeLS();
    syncUI();
    syncCompareUrl();
  }

  /* ---- shared spec-table builder (used by modal + page) ----------------- */

  // Ordered union of sections, and within each, an ordered union of row
  // labels. Preserves first-encounter order across the selected products.
  function buildMatrix(specs) {
    var sectionOrder = [];
    var sections = {}; // section -> { labelOrder:[], labels:{ label:true } }

    specs.forEach(function (sp) {
      (sp.specGroups || []).forEach(function (grp) {
        var section = grp.section || 'Specifications';
        if (!sections[section]) {
          sections[section] = { labelOrder: [], labels: {} };
          sectionOrder.push(section);
        }
        var bucket = sections[section];
        (grp.rows || []).forEach(function (row) {
          var label = row && row[0];
          if (label == null) return;
          if (!bucket.labels[label]) {
            bucket.labels[label] = true;
            bucket.labelOrder.push(label);
          }
        });
      });
    });

    return { sectionOrder: sectionOrder, sections: sections };
  }

  // Look up a value for (spec, section, label); returns null if absent.
  function valueAt(sp, section, label) {
    var groups = sp.specGroups || [];
    for (var i = 0; i < groups.length; i++) {
      var grp = groups[i];
      var s = grp.section || 'Specifications';
      if (s !== section) continue;
      var rows = grp.rows || [];
      for (var j = 0; j < rows.length; j++) {
        if (rows[j] && rows[j][0] === label) {
          return rows[j][1] != null ? rows[j][1] : null;
        }
      }
    }
    return null;
  }

  // A row is "differing" if not all cells are an identical value (missing,
  // i.e. null, counts as different from a present value).
  function rowIsDiff(cells) {
    var first = cells[0];
    for (var i = 1; i < cells.length; i++) {
      if (cells[i] !== first) return true;
    }
    return false;
  }

  // Add-to-Cart control for a product column (guards on window.RA_CART).
  function addCartControl(sp) {
    if (sp.price == null) {
      // No price -> route to contact instead of cart.
      return el('a', {
        class: 'btn btn-ghost ra-cmp-contact', href: '/contact/',
        text: 'Inquire to Order'
      });
    }
    var btn = el('button', {
      class: 'ra-addcart', type: 'button',
      'data-ra-handle': sp.handle,
      'aria-label': 'Add ' + (sp.name || sp.handle) + ' to cart',
      text: 'Add to Cart'
    });
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.RA_CART && typeof window.RA_CART.add === 'function') {
        window.RA_CART.add(sp.handle, btn);
      } else {
        console.error('[RA-CMP] RA_CART unavailable — cannot add "' +
          sp.handle + '" to cart.');
        flash('Sorry — the cart is unavailable right now. ' +
          'Please use "Inquire to Order".', 'error');
      }
    });
    return btn;
  }

  /* renderCompare(handles, container)
   * Renders the full comparison UI (header columns + grouped spec table +
   * "show differences only" control) into `container`. Pure DOM; no fetch.
   */
  function renderCompare(handles, container) {
    if (!container) return;
    container.innerHTML = '';

    var list = (handles || []).slice(0, MAX);

    if (list.length === 0) {
      container.appendChild(el('p', {
        class: 'ra-cmp-empty',
        text: 'No products selected to compare yet. ' +
          'Tap "Compare" on any product to start.'
      }));
      return;
    }

    var specs = list.map(function (h) {
      return specFor(h) || stubSpec(h);
    });

    // Cross-type note (allowed, just sparser).
    var types = {};
    specs.forEach(function (sp) { if (sp.type) types[sp.type] = true; });
    var typeKeys = Object.keys(types);

    // "Show differences only" control — a real checkbox + label (a11y).
    var diffId = 'ra-cmp-diff-' + Math.random().toString(36).slice(2, 8);
    var diffCheckbox = el('input', {
      type: 'checkbox', id: diffId, class: 'ra-cmp-difftoggle-input'
    });
    var diffControl = el('label', {
      class: 'ra-cmp-difftoggle', for: diffId
    }, [
      diffCheckbox,
      el('span', { text: 'Show differences only' })
    ]);

    var share = shareLink(list);

    var controls = el('div', { class: 'ra-cmp-controls' }, [
      diffControl,
      share
    ]);
    container.appendChild(controls);

    if (typeKeys.length > 1) {
      container.appendChild(el('p', {
        class: 'ra-cmp-typenote',
        text: 'You are comparing different product types (' +
          typeKeys.join(', ') + '), so some rows may be blank.'
      }));
    }

    /* ---- build the table ---- */
    var table = el('table', { class: 'ra-cmp-table' });

    // Header row: one product header cell per column (+ a corner label cell).
    var thead = el('thead');
    var headRow = el('tr');
    headRow.appendChild(el('th', {
      class: 'ra-cmp-corner', scope: 'col', text: ''
    }));

    specs.forEach(function (sp) {
      var col = [];
      var imgWrap = el('div', { class: 'ra-cmp-prodhead-img' }, [
        sp.image
          ? el('img', { src: sp.image, alt: sp.name || sp.handle, loading: 'lazy' })
          : el('div', { class: 'ra-cmp-prodhead-noimg', text: 'No image' })
      ]);
      col.push(imgWrap);

      var brandLine = [sp.brand, sp.series].filter(Boolean).join(' · ');
      if (brandLine) {
        col.push(el('div', { class: 'ra-cmp-prodhead-brand', text: brandLine }));
      }

      col.push(el('a', {
        class: 'ra-cmp-prodhead-name',
        href: sp.url || ('/product/' + sp.handle + '/'),
        text: sp.name || sp.handle
      }));

      col.push(el('div', {
        class: 'ra-cmp-prodhead-price',
        text: sp.price != null ? money(sp.price) : 'Contact'
      }));

      col.push(addCartControl(sp));

      // Per-column remove so the table can be pruned in place.
      col.push(el('button', {
        class: 'ra-cmp-prodhead-x', type: 'button',
        'aria-label': 'Remove ' + (sp.name || sp.handle) + ' from comparison',
        html: '&times;',
        onclick: (function (h) {
          return function () { remove(h); };
        })(sp.handle)
      }));

      headRow.appendChild(el('th', {
        class: 'ra-cmp-prodhead', scope: 'col'
      }, col));
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body: grouped by section, union of labels, diff classes.
    var tbody = el('tbody');
    var matrix = buildMatrix(specs);
    var colspan = specs.length + 1;
    var anyRows = false;

    matrix.sectionOrder.forEach(function (section) {
      // Section-group heading row spanning all columns.
      var secRow = el('tr', { class: 'ra-cmp-section', 'data-ra-section': section }, [
        el('th', {
          class: 'ra-cmp-section-cell', colspan: String(colspan),
          scope: 'colgroup', text: section
        })
      ]);
      tbody.appendChild(secRow);

      var bucket = matrix.sections[section];
      bucket.labelOrder.forEach(function (label) {
        anyRows = true;
        var cells = specs.map(function (sp) {
          return valueAt(sp, section, label); // null if missing
        });
        var diff = rowIsDiff(cells);

        var tr = el('tr', diff ? { class: 'ra-cmp-diff' } : { 'data-ra-nondiff': '1' });
        tr.appendChild(el('th', {
          class: 'ra-cmp-rowlabel', scope: 'row', text: label
        }));
        cells.forEach(function (v) {
          tr.appendChild(el('td', {
            class: 'ra-cmp-cell',
            text: (v != null && v !== '') ? String(v) : EMPTY
          }));
        });
        tbody.appendChild(tr);
      });
    });

    if (!anyRows) {
      tbody.appendChild(el('tr', {}, [
        el('td', {
          class: 'ra-cmp-cell ra-cmp-norows', colspan: String(colspan),
          text: 'No shared specifications are available for these products yet.'
        })
      ]));
    }

    table.appendChild(tbody);
    container.appendChild(table);

    // Wire the diff toggle: hide non-diff rows, plus any section whose rows
    // all end up hidden.
    diffCheckbox.addEventListener('change', function () {
      var on = diffCheckbox.checked;
      var nonDiff = tbody.querySelectorAll('tr[data-ra-nondiff]');
      Array.prototype.forEach.call(nonDiff, function (tr) {
        tr.style.display = on ? 'none' : '';
      });
      // Hide section headers with no visible rows beneath them.
      var secRows = tbody.querySelectorAll('tr[data-ra-section]');
      Array.prototype.forEach.call(secRows, function (secTr) {
        var visible = false;
        var sib = secTr.nextElementSibling;
        while (sib && !sib.hasAttribute('data-ra-section')) {
          if (sib.style.display !== 'none') { visible = true; break; }
          sib = sib.nextElementSibling;
        }
        secTr.style.display = (on && !visible) ? 'none' : '';
      });
    });
  }

  // Render the CURRENT selection into a container, ensuring specs are present
  // first (fetches if needed, shows failure visibly).
  function renderInto(container) {
    if (!container) return;
    if (specsMap) {
      renderCompare(state.handles, container);
      return;
    }
    container.innerHTML = '';
    container.appendChild(el('p', {
      class: 'ra-cmp-loading', text: 'Loading specifications…'
    }));
    loadSpecs().then(function () {
      renderCompare(state.handles, container);
    }).catch(function (e) {
      if (window.RA_LOG) window.RA_LOG.record('compare', 'specs load failed', e && e.message);
      container.innerHTML = '';
      container.appendChild(el('div', {
        class: 'ra-cmp-error', role: 'alert',
        text: 'Sorry — product specifications could not be loaded (' +
          e.message + '). Please refresh or try again later.'
      }));
    });
  }

  /* ---- shareable link --------------------------------------------------- */
  function shareLink(handles) {
    var href = '/compare?skus=' + encodeURIComponent(handles.join(','));
    return el('a', {
      class: 'ra-cmp-share', href: href,
      'aria-label': 'Shareable link to this comparison',
      text: 'Share this comparison'
    });
  }

  /* ---- MODAL view ------------------------------------------------------- */
  function buildModal() {
    if (refs.overlay) return;
    var root = ensureRoot();

    var overlay = el('div', {
      class: 'ra-cmp-overlay', 'aria-hidden': 'true',
      onclick: closeModal
    });

    var titleId = 'ra-cmp-modal-title';

    var closeBtn = el('button', {
      class: 'ra-cmp-x', type: 'button', 'aria-label': 'Close comparison',
      html: '&times;', onclick: closeModal
    });

    var heading = el('h2', {
      id: titleId, class: 'ra-cmp-modal-title', text: 'Compare Products'
    });

    var body = el('div', { class: 'ra-cmp-modal-body' });

    var modal = el('div', {
      class: 'ra-cmp-modal', role: 'dialog', 'aria-modal': 'true', onclick: function(e){ e.stopPropagation(); },
      'aria-labelledby': titleId, 'aria-hidden': 'true', tabindex: '-1'
    }, [
      el('div', { class: 'ra-cmp-modal-head' }, [heading, closeBtn]),
      body
    ]);

    overlay.appendChild(modal);
    root.appendChild(overlay);

    refs.overlay = overlay;
    refs.modal = modal;
    refs.modalBody = body;

    // Esc closes (only when the modal is the thing that's open).
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && refs.modalOpen) closeModal();
    });
  }

  function openModal() {
    buildModal();
    lastFocus = document.activeElement;
    refs.modalOpen = true;
    refs.overlay.classList.add('ra-open');
    refs.modal.classList.add('ra-open');
    refs.overlay.setAttribute('aria-hidden', 'false');
    refs.modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('ra-cmp-locked');
    renderInto(refs.modalBody);
    refs.modal.focus();
  }

  function closeModal() {
    if (!refs.modal) return;
    refs.modalOpen = false;
    refs.overlay.classList.remove('ra-open');
    refs.modal.classList.remove('ra-open');
    refs.overlay.setAttribute('aria-hidden', 'true');
    refs.modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ra-cmp-locked');
    // Restore focus to whatever opened the modal.
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    } else if (refs.go) {
      refs.go.focus();
    }
  }

  // open() — public "show the comparison" entry point. On the /compare page it
  // (re)renders inline; elsewhere it opens the modal.
  function open() {
    if (isComparePage()) {
      renderPage();
      return;
    }
    if (state.handles.length < 2) {
      flash('Pick at least 2 products to compare.', 'info');
      return;
    }
    openModal();
  }

  /* ---- SHAREABLE PAGE view (/compare?skus=...) -------------------------- */
  function isComparePage() {
    return location.pathname.indexOf('/compare') === 0;
  }

  function parseSkusFromUrl() {
    var out = [];
    try {
      var qs = new URLSearchParams(location.search);
      var raw = qs.get('skus');
      if (raw) {
        raw.split(',').forEach(function (h) {
          h = h.trim();
          if (h && out.indexOf(h) === -1) out.push(h);
        });
      }
    } catch (e) {
      console.error('[RA-CMP] could not parse ?skus= from URL:', e);
    }
    return out.slice(0, MAX);
  }

  function ensurePageContainer() {
    var c = document.getElementById('ra-cmp-page');
    if (!c) {
      c = el('div', { id: 'ra-cmp-page', class: 'ra-cmp-page' });
      var host = document.querySelector('main') || document.body;
      host.appendChild(c);
    }
    refs.pageContainer = c;
    return c;
  }

  // Keep localStorage and the URL in reasonable sync on the /compare page:
  // the URL is the source of truth on first load; thereafter user edits flow
  // back into both the URL (replaceState) and localStorage via syncUI().
  function renderPage() {
    var c = ensurePageContainer();

    var urlSkus = parseSkusFromUrl();
    if (urlSkus.length) {
      // Adopt the URL's selection (capped) as the working set.
      state.handles = urlSkus.slice(0, MAX);
      writeLS();
    }
    // else: fall back to whatever is already in localStorage.

    // Reflect the working set back into the URL so it stays shareable even if
    // it came from localStorage / was capped.
    syncCompareUrl();

    // Specs are needed immediately on this page.
    if (specsMap) {
      renderCompare(state.handles, c);
    } else {
      c.innerHTML = '';
      c.appendChild(el('h1', { class: 'ra-cmp-page-title', text: 'Compare' }));
      c.appendChild(el('p', {
        class: 'ra-cmp-loading', text: 'Loading specifications…'
      }));
      loadSpecs().then(function () {
        renderCompare(state.handles, c);
      }).catch(function (e) {
        c.innerHTML = '';
        c.appendChild(el('div', {
          class: 'ra-cmp-error', role: 'alert',
          text: 'Sorry — product specifications could not be loaded (' +
            e.message + '). Please refresh or try again later.'
        }));
      });
    }
  }

  function syncCompareUrl() {
    if (!isComparePage()) return;
    try {
      var want = state.handles.length
        ? '?skus=' + encodeURIComponent(state.handles.join(','))
        : '';
      if (location.search !== want) {
        history.replaceState(null, '', location.pathname + want);
      }
    } catch (e) {
      // Non-fatal — the in-table share link still has the right handles.
      console.error('[RA-CMP] could not sync compare URL:', e);
    }
  }

  /* ---- click delegation for toggles ------------------------------------- */
  function onDocClick(e) {
    var btn = (e.target && e.target.closest)
      ? e.target.closest('.ra-cmp-toggle[data-ra-handle]')
      : null;
    if (!btn) return;
    // Cards are links — never let the toggle navigate or bubble to the <a>.
    e.preventDefault();
    e.stopPropagation();
    toggle(btn.getAttribute('data-ra-handle'));
  }

  /* ---- cross-tab sync (keeps multiple open pages consistent) ------------ */
  function onStorage(e) {
    if (e.key !== LS_KEY) return;
    state.handles = readLS();
    syncUI();
    if (isComparePage()) syncCompareUrl();
  }

  /* ---- init ------------------------------------------------------------- */
  function init() {
    state.handles = readLS();
    ensureBar();

    // Delegated toggle clicks. stopPropagation in the bubble phase prevents
    // the parent card <a> from navigating.
    document.addEventListener('click', onDocClick);
    window.addEventListener('storage', onStorage);

    // Paint initial state.
    syncUI();

    // Warm specs so chips fill in (non-blocking); failure surfaced lazily.
    if (state.handles.length) {
      loadSpecs().then(syncUI).catch(function () {/* surfaced on open */});
    }

    // The /compare page needs specs immediately — render it now.
    if (isComparePage()) {
      renderPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---- public surface --------------------------------------------------- */
  window.RA_COMPARE = {
    toggle: toggle,
    add: add,
    remove: remove,
    clear: clear,
    open: open,
    state: state
  };
})();
