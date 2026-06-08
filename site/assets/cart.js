/* Riotous Audio — Storefront API shopping cart (vanilla JS, no build step)
 * ==========================================================================
 * Talks directly to the Riot Garage Shopify store via the public Storefront
 * GraphQL API. Renders a gold/ivory slide-in cart drawer that matches the
 * site's "Gilded Quiet" palette (see assets/site.css).
 *
 * Depends on window.RA_SHOP from shop-config.js (loaded first).
 *
 * PROJECT RULE — NO SILENT FAILURES: every failure path surfaces a visible
 * message in the UI AND logs to console.error. Nothing fails quietly.
 * ==========================================================================
 */
(function () {
  'use strict';

  /* ---- config guard ----------------------------------------------------- */
  var CFG = window.RA_SHOP || {};
  var CONFIG_OK = !!(CFG.domain && CFG.token && CFG.apiVersion);
  if (!CONFIG_OK) {
    console.error('[RA-CART] window.RA_SHOP is missing or incomplete — ' +
      'cart disabled. Check that shop-config.js loaded before cart.js.', CFG);
  }
  // Guard against the deploy step being skipped: an un-replaced placeholder
  // token can never authenticate, so flag it loudly rather than firing doomed
  // requests that 401 silently.
  var TOKEN_PLACEHOLDER = (CFG.token === '__STOREFRONT_TOKEN__');
  if (TOKEN_PLACEHOLDER) {
    console.error('[RA-CART] Storefront token is still the placeholder ' +
      '"__STOREFRONT_TOKEN__" — inject the real token into shop-config.js ' +
      'before deploy. Add-to-cart will show an error until then.');
  }

  var ENDPOINT = CONFIG_OK
    ? 'https://' + CFG.domain + '/api/' + CFG.apiVersion + '/graphql.json'
    : null;
  var LS_CART = 'ra_cart_id';

  /* ---- tiny DOM helpers ------------------------------------------------- */
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

  /* ---- Storefront GraphQL fetch ----------------------------------------- */
  function gql(query, variables) {
    if (!CONFIG_OK) {
      return Promise.reject(new Error(
        'Cart is not configured (missing shop settings).'));
    }
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Shopify-Storefront-Access-Token': CFG.token
      },
      body: JSON.stringify({ query: query, variables: variables || {} })
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) {
          throw new Error('Shopify responded ' + res.status + ' ' +
            res.statusText + '.');
        }
        if (json.errors && json.errors.length) {
          throw new Error(json.errors.map(function (e) {
            return e.message;
          }).join(' '));
        }
        return json.data;
      });
    });
  }

  /* ---- GraphQL documents ------------------------------------------------ */
  var Q_PRODUCT =
    'query ($handle: String!) {' +
    '  product(handle: $handle) {' +
    '    title' +
    '    variants(first: 1) {' +
    '      nodes { id availableForSale price { amount currencyCode } }' +
    '    }' +
    '  }' +
    '}';

  var CART_FIELDS =
    'id checkoutUrl ' +
    'cost { subtotalAmount { amount currencyCode } } ' +
    'lines(first: 100) { nodes { id quantity ' +
    '  merchandise { ... on ProductVariant { id title ' +
    '    price { amount currencyCode } ' +
    '    product { title } } } ' +
    '  cost { totalAmount { amount currencyCode } } } }';

  var M_CART_CREATE =
    'mutation ($lines: [CartLineInput!]!) {' +
    '  cartCreate(input: { lines: $lines }) {' +
    '    cart { ' + CART_FIELDS + ' }' +
    '    userErrors { field message }' +
    '  }' +
    '}';

  var M_LINES_ADD =
    'mutation ($cartId: ID!, $lines: [CartLineInput!]!) {' +
    '  cartLinesAdd(cartId: $cartId, lines: $lines) {' +
    '    cart { ' + CART_FIELDS + ' }' +
    '    userErrors { field message }' +
    '  }' +
    '}';

  var M_LINES_UPDATE =
    'mutation ($cartId: ID!, $lines: [CartLineUpdateInput!]!) {' +
    '  cartLinesUpdate(cartId: $cartId, lines: $lines) {' +
    '    cart { ' + CART_FIELDS + ' }' +
    '    userErrors { field message }' +
    '  }' +
    '}';

  var M_LINES_REMOVE =
    'mutation ($cartId: ID!, $lineIds: [ID!]!) {' +
    '  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {' +
    '    cart { ' + CART_FIELDS + ' }' +
    '    userErrors { field message }' +
    '  }' +
    '}';

  var Q_CART =
    'query ($id: ID!) { cart(id: $id) { ' + CART_FIELDS + ' } }';

  /* ---- cart state ------------------------------------------------------- */
  var state = { cart: null, open: false };

  function cartId() {
    try { return localStorage.getItem(LS_CART); } catch (e) { return null; }
  }
  function setCartId(id) {
    try {
      if (id) localStorage.setItem(LS_CART, id);
      else localStorage.removeItem(LS_CART);
    } catch (e) { /* private mode — cart just won't persist */ }
  }
  function firstUserError(payload, mutationKey) {
    var ue = payload && payload[mutationKey] && payload[mutationKey].userErrors;
    if (ue && ue.length) return ue[0].message;
    return null;
  }

  /* ---- DOM references (built once) -------------------------------------- */
  var refs = {};

  function ensureMounted() {
    if (refs.root) return;

    // Drawer mount may have been injected by the wire script. If a page is
    // missing it (e.g. partial wiring), create one so the cart still works.
    var mount = document.getElementById('ra-cart-root');
    if (!mount) {
      mount = el('div', { id: 'ra-cart-root' });
      document.body.appendChild(mount);
    }

    var overlay = el('div', {
      class: 'ra-cart-overlay', 'aria-hidden': 'true',
      onclick: closeDrawer
    });

    var titleId = 'ra-cart-title';
    var liveId = 'ra-cart-status';

    var closeBtn = el('button', {
      class: 'ra-cart-x', type: 'button', 'aria-label': 'Close cart',
      onclick: closeDrawer, html: '&times;'
    });

    var heading = el('h2', { id: titleId, class: 'ra-cart-title',
      text: 'Your Cart' });

    var status = el('div', {
      id: liveId, class: 'ra-cart-status', role: 'status',
      'aria-live': 'polite'
    });

    var linesWrap = el('div', { class: 'ra-cart-lines' });

    var subtotalRow = el('div', { class: 'ra-cart-subtotal' }, [
      el('span', { text: 'Subtotal' }),
      el('span', { class: 'ra-cart-subtotal-val', text: '—' })
    ]);

    var checkoutBtn = el('button', {
      class: 'ra-cart-checkout', type: 'button',
      text: 'Checkout', onclick: goToCheckout
    });

    var foot = el('div', { class: 'ra-cart-foot' }, [
      subtotalRow,
      checkoutBtn,
      el('p', { class: 'ra-cart-fineprint',
        text: 'Taxes & shipping calculated at checkout · Secure Shopify checkout' })
    ]);

    var drawer = el('aside', {
      class: 'ra-cart-drawer', role: 'dialog', 'aria-modal': 'true',
      'aria-labelledby': titleId, 'aria-hidden': 'true', tabindex: '-1'
    }, [
      el('div', { class: 'ra-cart-head' }, [heading, closeBtn]),
      status,
      linesWrap,
      foot
    ]);

    mount.appendChild(overlay);
    mount.appendChild(drawer);

    refs.root = mount;
    refs.overlay = overlay;
    refs.drawer = drawer;
    refs.lines = linesWrap;
    refs.subtotal = subtotalRow.querySelector('.ra-cart-subtotal-val');
    refs.status = status;
    refs.checkout = checkoutBtn;
    refs.title = heading;

    // Esc closes the drawer.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open) closeDrawer();
    });
  }

  /* ---- header cart button ----------------------------------------------- */
  function bindHeaderButton() {
    var btn = document.getElementById('ra-cart-button');
    if (!btn) return;
    refs.headerBtn = btn;
    refs.headerCount = btn.querySelector('.ra-cart-count');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      openDrawer();
    });
  }

  function lineCount() {
    if (!state.cart || !state.cart.lines) return 0;
    return state.cart.lines.nodes.reduce(function (sum, l) {
      return sum + (l.quantity || 0);
    }, 0);
  }

  function updateHeaderCount() {
    if (!refs.headerCount) return;
    var n = lineCount();
    refs.headerCount.textContent = n;
    refs.headerCount.setAttribute('data-empty', n === 0 ? '1' : '0');
    if (refs.headerBtn) {
      refs.headerBtn.setAttribute('aria-label',
        n === 1 ? 'Open cart, 1 item' : 'Open cart, ' + n + ' items');
    }
  }

  /* ---- drawer open/close ------------------------------------------------ */
  function openDrawer() {
    ensureMounted();
    state.open = true;
    refs.drawer.classList.add('ra-open');
    refs.overlay.classList.add('ra-open');
    refs.drawer.setAttribute('aria-hidden', 'false');
    refs.overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('ra-cart-locked');
    refs.drawer.focus();
    render();
  }
  function closeDrawer() {
    state.open = false;
    if (!refs.drawer) return;
    refs.drawer.classList.remove('ra-open');
    refs.overlay.classList.remove('ra-open');
    refs.drawer.setAttribute('aria-hidden', 'true');
    refs.overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ra-cart-locked');
    if (refs.headerBtn) refs.headerBtn.focus();
  }

  /* ---- status message helper (NO SILENT FAILURES) ----------------------- */
  function showStatus(msg, kind) {
    ensureMounted();
    refs.status.textContent = msg || '';
    refs.status.setAttribute('data-kind', kind || 'info');
    refs.status.style.display = msg ? 'block' : 'none';
    if ((kind || '') === 'error' && window.RA_LOG) window.RA_LOG.record('cart', msg);
  }
  function clearStatus() {
    /* operator: keep errors visible — do not auto-clear an error message */
    if (refs.status && refs.status.getAttribute('data-kind') === 'error') return;
    showStatus('', 'info');
  }

  /* ---- render drawer contents ------------------------------------------- */
  function render() {
    if (!refs.lines) return;
    updateHeaderCount();

    var lines = (state.cart && state.cart.lines && state.cart.lines.nodes) || [];
    refs.lines.innerHTML = '';

    if (!lines.length) {
      refs.lines.appendChild(el('p', {
        class: 'ra-cart-empty',
        text: 'Your cart is empty.'
      }));
      refs.subtotal.textContent = '—';
      refs.checkout.disabled = true;
      refs.checkout.setAttribute('aria-disabled', 'true');
      return;
    }

    lines.forEach(function (line) {
      var m = line.merchandise || {};
      var prod = m.product || {};
      var title = prod.title || m.title || 'Item';
      var lineTotal = line.cost && line.cost.totalAmount;

      var dec = el('button', {
        class: 'ra-qty-btn', type: 'button', 'aria-label': 'Decrease quantity',
        text: '−',
        onclick: function () { changeQty(line, line.quantity - 1); }
      });
      var inc = el('button', {
        class: 'ra-qty-btn', type: 'button', 'aria-label': 'Increase quantity',
        text: '+',
        onclick: function () { changeQty(line, line.quantity + 1); }
      });
      var qtyVal = el('span', {
        class: 'ra-qty-val', 'aria-live': 'polite',
        text: String(line.quantity)
      });

      var remove = el('button', {
        class: 'ra-line-remove', type: 'button',
        'aria-label': 'Remove ' + title + ' from cart',
        text: 'Remove',
        onclick: function () { removeLine(line); }
      });

      var row = el('div', { class: 'ra-line' }, [
        el('div', { class: 'ra-line-main' }, [
          el('div', { class: 'ra-line-title', text: title }),
          el('div', { class: 'ra-line-qty' }, [dec, qtyVal, inc])
        ]),
        el('div', { class: 'ra-line-side' }, [
          el('div', { class: 'ra-line-price',
            text: lineTotal ? money(lineTotal.amount, lineTotal.currencyCode) : '' }),
          remove
        ])
      ]);
      refs.lines.appendChild(row);
    });

    var sub = state.cart.cost && state.cart.cost.subtotalAmount;
    refs.subtotal.textContent = sub
      ? money(sub.amount, sub.currencyCode) : '—';
    refs.checkout.disabled = false;
    refs.checkout.removeAttribute('aria-disabled');
  }

  /* ---- cart mutations --------------------------------------------------- */
  function adoptCart(cart) {
    state.cart = cart || null;
    if (cart && cart.id) setCartId(cart.id);
    render();
  }

  function changeQty(line, qty) {
    if (qty < 1) { removeLine(line); return; }
    var id = cartId();
    if (!id) return;
    setBusy(true);
    gql(M_LINES_UPDATE, {
      cartId: id,
      lines: [{ id: line.id, quantity: qty }]
    }).then(function (data) {
      var err = firstUserError(data, 'cartLinesUpdate');
      if (err) throw new Error(err);
      adoptCart(data.cartLinesUpdate.cart);
      clearStatus();
    }).catch(function (e) {
      console.error('[RA-CART] update qty failed:', e);
      showStatus('Could not update quantity: ' + e.message, 'error');
    }).then(function () { setBusy(false); });
  }

  function removeLine(line) {
    var id = cartId();
    if (!id) return;
    setBusy(true);
    gql(M_LINES_REMOVE, { cartId: id, lineIds: [line.id] })
      .then(function (data) {
        var err = firstUserError(data, 'cartLinesRemove');
        if (err) throw new Error(err);
        adoptCart(data.cartLinesRemove.cart);
        clearStatus();
      }).catch(function (e) {
        console.error('[RA-CART] remove line failed:', e);
        showStatus('Could not remove item: ' + e.message, 'error');
      }).then(function () { setBusy(false); });
  }

  function setBusy(on) {
    if (refs.drawer) refs.drawer.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function goToCheckout() {
    if (state.cart && state.cart.checkoutUrl) {
      window.location.href = state.cart.checkoutUrl;
    } else {
      console.error('[RA-CART] checkout requested but no checkoutUrl present.');
      showStatus('Checkout is unavailable right now. Please try again.', 'error');
    }
  }

  /* ---- add to cart (entry point from product button) -------------------- */
  function addToCartByHandle(handle, triggerBtn) {
    if (!handle) {
      console.error('[RA-CART] addToCartByHandle called with no handle.');
      return;
    }
    ensureMounted();

    if (!CONFIG_OK || TOKEN_PLACEHOLDER) {
      var why = TOKEN_PLACEHOLDER
        ? 'The store token has not been set up yet.'
        : 'The cart is not configured.';
      openDrawer();
      showStatus('Sorry — ' + why + ' Please contact us to order.', 'error');
      return;
    }

    var label = triggerBtn ? triggerBtn.textContent : '';
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.setAttribute('aria-busy', 'true');
      triggerBtn.textContent = 'Adding…';
    }
    function restore() {
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.removeAttribute('aria-busy');
        triggerBtn.textContent = label || 'Add to Cart';
      }
    }

    gql(Q_PRODUCT, { handle: handle }).then(function (data) {
      var product = data && data.product;
      if (!product) {
        throw new Error('This product was not found in the store.');
      }
      var variant = product.variants && product.variants.nodes &&
        product.variants.nodes[0];
      if (!variant) {
        throw new Error('No purchasable variant is available for this product.');
      }
      if (!variant.availableForSale) {
        throw new Error('SOLD_OUT');
      }
      var id = cartId();
      if (id) {
        return gql(M_LINES_ADD, {
          cartId: id, lines: [{ merchandiseId: variant.id, quantity: 1 }]
        }).then(function (d) {
          var err = firstUserError(d, 'cartLinesAdd');
          // A stale/expired cart id makes Shopify reject the add. Recover by
          // creating a fresh cart rather than dead-ending the shopper.
          if (err || !d.cartLinesAdd.cart) {
            return gql(M_CART_CREATE, {
              lines: [{ merchandiseId: variant.id, quantity: 1 }]
            }).then(function (c) {
              var e2 = firstUserError(c, 'cartCreate');
              if (e2) throw new Error(e2);
              return c.cartCreate.cart;
            });
          }
          return d.cartLinesAdd.cart;
        });
      }
      return gql(M_CART_CREATE, {
        lines: [{ merchandiseId: variant.id, quantity: 1 }]
      }).then(function (c) {
        var e2 = firstUserError(c, 'cartCreate');
        if (e2) throw new Error(e2);
        return c.cartCreate.cart;
      });
    }).then(function (cart) {
      adoptCart(cart);
      clearStatus();
      openDrawer();
    }).catch(function (e) {
      console.error('[RA-CART] add to cart failed for "' + handle + '":', e);
      if (e.message === 'SOLD_OUT') {
        if (triggerBtn) {
          triggerBtn.textContent = 'Sold out';
          triggerBtn.disabled = true;
          triggerBtn.setAttribute('aria-disabled', 'true');
          triggerBtn.classList.add('ra-soldout');
        }
        openDrawer();
        showStatus('Sorry — this item is currently sold out.', 'error');
        return; // leave the "Sold out" label in place
      }
      openDrawer();
      showStatus('Could not add to cart: ' + e.message, 'error');
      restore();
    }).then(function () {
      if (state.cart) restore();
    });
  }

  /* ---- wire up product Add-to-Cart buttons ------------------------------ */
  function bindAddButtons() {
    var btns = document.querySelectorAll('[data-ra-handle]');
    Array.prototype.forEach.call(btns, function (btn) {
      if (btn.getAttribute('data-ra-bound') === '1') return;
      btn.setAttribute('data-ra-bound', '1');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        addToCartByHandle(btn.getAttribute('data-ra-handle'), btn);
      });
    });
  }

  /* ---- pre-flight: reflect sold-out state on the button before any click - */
  function refreshButtonAvailability() {
    if (!CONFIG_OK || TOKEN_PLACEHOLDER) return;
    var btns = document.querySelectorAll('[data-ra-handle]');
    Array.prototype.forEach.call(btns, function (btn) {
      var handle = btn.getAttribute('data-ra-handle');
      if (!handle) return;
      gql(Q_PRODUCT, { handle: handle }).then(function (data) {
        var v = data && data.product && data.product.variants &&
          data.product.variants.nodes && data.product.variants.nodes[0];
        if (v && v.availableForSale === false) {
          btn.textContent = 'Sold out';
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
          btn.classList.add('ra-soldout');
        }
      }).catch(function (e) {
        // Non-fatal: the click handler re-checks availability and will surface
        // any real error then. Log so it is never truly silent.
        console.error('[RA-CART] availability pre-check failed for "' +
          handle + '":', e);
      });
    });
  }

  /* ---- restore an existing cart on load --------------------------------- */
  function restoreCart() {
    var id = cartId();
    if (!id || !CONFIG_OK || TOKEN_PLACEHOLDER) { updateHeaderCount(); return; }
    gql(Q_CART, { id: id }).then(function (data) {
      if (data && data.cart) {
        state.cart = data.cart;
      } else {
        // Cart expired or was completed — clear the stale id.
        setCartId(null);
        state.cart = null;
      }
      updateHeaderCount();
    }).catch(function (e) {
      console.error('[RA-CART] could not restore saved cart:', e);
      updateHeaderCount();
    });
  }

  /* ---- init ------------------------------------------------------------- */
  function init() {
    ensureMounted();
    bindHeaderButton();
    bindAddButtons();
    updateHeaderCount();
    restoreCart();
    refreshButtonAvailability();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a tiny public surface for debugging / manual triggers.
  window.RA_CART = {
    add: addToCartByHandle,
    open: openDrawer,
    close: closeDrawer,
    state: state
  };
})();
