# Riotous Audio — Storefront-API Shopping Cart

A self-contained, vanilla-JS shopping cart for the static site **riotousaudio.com**,
backed by the Riot Garage Shopify store via the public **Storefront GraphQL API**.
No framework, no build step, no npm — just three static assets plus a one-shot
Node wiring script.

---

## Files in this bundle

| File | Purpose |
|------|---------|
| `assets/shop-config.js` | Sets `window.RA_SHOP` (domain, token placeholder, API version, collection handle). The token is the literal `__STOREFRONT_TOKEN__` and **must be replaced at deploy time**. |
| `assets/cart.js` | The whole cart: Storefront GraphQL calls, add-to-cart by handle, gold/ivory slide-in drawer, qty steppers, remove, subtotal, checkout redirect, header cart button, sold-out + error handling. |
| `assets/cart.css` | Cart-drawer + `.ra-addcart` / `.ra-contact-cta` / header-button styles, matched to the site's "Gilded Quiet" palette. |
| `wire-cart.js` | Pure-Node `fs` script. Idempotently injects the cart into every product page. Run **once** after copying the assets. |
| `README.md` | This file. |

---

## Deploy steps (run on the VPS)

> Everything here assumes the live tree is
> `/root/riotousconsulting-cloud/dist/_riotousaudio/` and this bundle is staged
> at `/root/_incoming/ra-cart/`.

**1. Inject the real Storefront token into `shop-config.js`.**
Replace the placeholder with the store's *public* Storefront API access token
(Shopify Admin → Settings → Apps and sales channels → Develop apps → your app →
API credentials → **Storefront API access token**). It is safe to ship in client
JS — that is what Storefront tokens are for.

```bash
# do this in the STAGED copy, before copying assets across
sed -i 's/__STOREFRONT_TOKEN__/PASTE_REAL_TOKEN_HERE/' /root/_incoming/ra-cart/assets/shop-config.js

# sanity-check the placeholder is gone (expect 0)
grep -c '__STOREFRONT_TOKEN__' /root/_incoming/ra-cart/assets/shop-config.js
```

**2. Copy the three assets into the live `/assets/`.**

```bash
cp /root/_incoming/ra-cart/assets/cart.css       /root/riotousconsulting-cloud/dist/_riotousaudio/assets/
cp /root/_incoming/ra-cart/assets/cart.js        /root/riotousconsulting-cloud/dist/_riotousaudio/assets/
cp /root/_incoming/ra-cart/assets/shop-config.js /root/riotousconsulting-cloud/dist/_riotousaudio/assets/
```

**3. Wire every product page** (injects links/scripts/buttons/drawer; idempotent).

```bash
# OPTIONAL dry run first — reports counts, writes nothing:
node /root/_incoming/ra-cart/wire-cart.js --dry-run

# real run against the live tree (default root is the live tree):
node /root/_incoming/ra-cart/wire-cart.js
```

Expected summary: **155 scanned / 153 wired / 2 contact-only / 0 errored**.
Re-running is safe — already-wired pages are skipped (`data-ra-cart="1"` stamp).

**4. Fix permissions** so nginx can serve the new files.

```bash
chmod -R a+rX /root/riotousconsulting-cloud/dist/_riotousaudio/assets \
              /root/riotousconsulting-cloud/dist/_riotousaudio/product
```

That's it — no service restart needed (static files served by `romps-proxy`).

### Rollback
The wiring is additive and stamped. To remove it from a page you would strip the
`data-ra-cart="1"` stamp, the three `/assets/cart.*` / `/assets/shop-config.js`
tags, the `ra-cart-button`, the `ra-addcart-wrap` block, and the `#ra-cart-root`
div. (Keep a backup of `product/` before step 3 if you want a trivial restore:
`cp -a product product.bak`.)

---

## How it works at runtime

1. `shop-config.js` defines `window.RA_SHOP`.
2. `cart.js` (deferred) reads it, and on each product page:
   - Binds the `[data-ra-handle]` Add-to-Cart button.
   - Does a **runtime** variant lookup by handle — no Shopify IDs are ever
     hardcoded:
     `product(handle){ title variants(first:1){ nodes{ id availableForSale price{amount currencyCode} } } }`
   - Creates/updates a cart with `cartCreate` / `cartLinesAdd`, persisting
     `cartId` in `localStorage` (`ra_cart_id`).
   - Renders the drawer (line items, ± qty steppers, remove, subtotal) and a
     **Checkout** button that navigates to the cart's `checkoutUrl`.
   - On load, restores a saved cart and pre-checks each button's availability so
     sold-out items show "Sold out" before any click.
3. The header cart button shows the live line-item count and opens the drawer.

**Endpoint:** `https://riotgarage.myshopify.com/api/2024-10/graphql.json`
**Auth header:** `X-Shopify-Storefront-Access-Token: <token>`

### No silent failures (project rule)
Every failure path shows a visible inline message in the drawer **and** calls
`console.error`. Covered cases: missing/incomplete config, un-replaced token
placeholder, Shopify HTTP errors, GraphQL `errors`, `userErrors`, product not
found, no variant, `availableForSale:false` (→ "Sold out"), missing
`checkoutUrl`, and a stale `cartId` (auto-recovers by creating a fresh cart).

### Accessibility (older site owner)
Large tap targets (Add/Checkout ≥ 56px, qty/close ≥ 44–48px), large readable
type, visible `:focus-visible` gold focus rings, `Esc`-to-close, an `aria-live`
status region, proper `role="dialog"`/`aria-modal`, and `aria-label`s
throughout.

---

## Discovery notes (how I determined things)

### Product-page location & count
Product pages live at:

```
/root/riotousconsulting-cloud/dist/_riotousaudio/product/<handle>/index.html
```

**Total product pages found: 155** (ESB 82, Harmony 23, Zapco 50 — by directory
prefix). Verified each directory contains exactly one `index.html`, and all 155
share an identical structure (one `.pd-info`, one `.pd-price`, one
`.pd-actions`, a `nav-cta` Contact link, `</head>`, plain `<body>`, `</body>`).

### Handle convention (verified)
The product **directory name IS the Shopify product handle**. Confirmed by
sampling across all three brands, e.g.:
`/product/ra-esb-1-10sd2/` → handle `ra-esb-1-10sd2`,
`/product/ra-zapco-st-500xm-iii/`, `/product/ra-harmony-hr-10-us/`.
The wire script derives `data-ra-handle` straight from the directory name, and
`cart.js` looks the variant up by that handle at runtime.

### DOM hook for the Add-to-Cart button
The price renders as:

```html
<div class="pd-info ...">
  ...
  <h1>1.10SD2</h1>
  <p class="lead">10"/250 mm DVC 2+2Ω Subwoofer</p>
  <div class="pd-price"><span class="now">$169.99</span>...</div>   <!-- HOOK -->
  ...
  <div class="pd-actions"> ...existing Inquire/More buttons... </div>
</div>
```

The wire script inserts the Add-to-Cart block **immediately after the
`.pd-price` block's closing `</div>`**, so the button sits directly under the
price, inside `.pd-info`. (The price block contains only `<span>` children on
every page, so the first `</div>` after it is reliably its true close.) The
header cart button is inserted right after the `<a class="nav-cta">Contact</a>`
anchor in the existing header.

### Gold / ivory hex values used ("Gilded Quiet" palette)
Pulled verbatim from `assets/site.css` `:root`:

| Token | Hex | Role |
|-------|-----|------|
| `--gold` | `#c9a86a` | primary gold (buttons, accents) |
| `--gold-bright` | `#e3c489` | hover / focus gold |
| `--gold-deep` | `#9c804a` | deep gold |
| `--ink` (ivory) | `#e9e6df` | primary ivory text |
| `--ink-soft` | `#b6b1a6` | secondary text |
| `--ink-faint` | `#6f6a60` | muted text |
| `--void` | `#0a0a0c` | base background |
| `--void-2` | `#101014` | drawer surface |
| `--void-3` | `#16161c` | inset surface |
| `--line` | `rgba(201,168,106,.18)` | gold hairline |
| `--line-soft` | `rgba(233,230,223,.08)` | ivory hairline |

Fonts: serif **Cormorant Garamond** (titles/prices), sans **Archivo** (UI).
`cart.css` consumes these via `var(--gold, #c9a86a)` etc., with literal hex
fallbacks so the cart still themes correctly even if loaded somewhere
`site.css`'s custom properties aren't present.

### Contact-for-pricing products
The two BMW products — `ra-esb-bmw-front-100` and `ra-esb-bmw-sub-1` — show
`<span class="now">Contact for pricing</span>` (no `$`). They get a **"Contact
for Pricing"** link to `/contact/` instead of Add-to-Cart. Detected two ways for
safety: (a) an explicit handle allow-list in `wire-cart.js`, and (b) the
`.pd-price .now` text containing no `$`. Both agree exactly on these two pages.

---

## Validation already performed (against a sandbox copy, not the live tree)

- `node --check` passes for `cart.js`, `shop-config.js`, and `wire-cart.js`.
- Dry-run against a copy of the live `product/` tree: 155 / 153 / 2 / 0.
- Real run against the copy, then a second run → **155 skipped** (idempotent).
- Tag-balance check on a wired page: `<div>`, `<button>`, `<script>` all balanced.
- **Byte-exact non-destructive proof:** stripping the known injected fragments
  from a wired page reproduces the original file *exactly* (only +642 bytes of
  additions; nothing removed or altered).

---

## Things a reviewer should check / assumptions

1. **Storefront token + scope.** I left the placeholder as instructed and made
   **zero** Shopify API calls. Before launch, confirm the token is a valid
   *Storefront* token with `unauthenticated_read_product_listings` and the cart
   scopes, and that the RA products are **published to the sales channel** the
   token belongs to (otherwise `product(handle:)` returns null → the UI will say
   "This product was not found in the store").
2. **Handle ↔ Shopify match.** I verified the directory name equals the Shopify
   *handle convention*, but did not query Shopify to confirm each of the 153
   handles actually resolves. Worth a quick spot-check of a few live handles
   once the token is in.
3. **Single variant assumption.** The cart adds `variants(first:1).nodes[0]`.
   RA products appear to be single-variant; if any product has multiple
   meaningful variants, the cart would always add the first. Confirm none need a
   variant picker.
4. **BMW list is exactly two.** If more "Contact for pricing" products are added
   later, either add their handles to `CONTACT_ONLY` in `wire-cart.js` or rely
   on the no-`$` price heuristic (which already catches them automatically).
5. **`apiVersion` 2024-10.** Set as specified. Bump in `shop-config.js` when you
   want a newer Storefront API version.
6. **Drawer overlay z-index 1000/1001.** Sits above the site's fixed header
   (z-index 50). Verify nothing else on the site uses a higher stacking context.
