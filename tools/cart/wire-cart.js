#!/usr/bin/env node
/* Riotous Audio — cart wiring script (pure Node, fs only, no deps)
 * ==========================================================================
 * Idempotently injects the Storefront cart into EVERY product page under the
 * live static tree. Run this AFTER copying assets/* into the live /assets/
 * and AFTER injecting the real Storefront token into shop-config.js.
 *
 *   node wire-cart.js [--dry-run] [--root <path>]
 *
 *   --dry-run   Parse and report what WOULD change; write nothing.
 *   --root P    Override the site root (defaults to the live tree below).
 *
 * What it injects per product page (skipping any page already stamped):
 *   1. <link rel="stylesheet" href="/assets/cart.css"> + shop-config.js +
 *      cart.js (deferred) — before </head>.
 *   2. A header cart button (count badge) — after the nav Contact link.
 *   3. An Add-to-Cart button carrying data-ra-handle="<dir-name>" — directly
 *      under the .pd-price block. The directory name IS the Shopify handle
 *      (verified: e.g. /product/ra-esb-1-10sd2/ -> handle ra-esb-1-10sd2).
 *   4. A single drawer mount node (#ra-cart-root) — before </body>.
 *   5. Stamps <body> with data-ra-cart="1" for idempotency.
 *
 * Contact-for-pricing products (no purchasable price) get a "Contact for
 * Pricing" link to /contact/ INSTEAD of an Add-to-Cart button. These are
 * detected two ways (belt and suspenders):
 *   (a) an explicit handle allow-list (the two known BMW products), and
 *   (b) the .pd-price .now text containing no "$" (e.g. "Contact for pricing").
 *
 * PROJECT RULE — NO SILENT FAILURES: any page that cannot be wired because an
 * expected anchor is missing is reported LOUDLY to stderr and counted; it is
 * never skipped silently.
 * ==========================================================================
 */
'use strict';

var fs = require('fs');
var path = require('path');

/* ---- args ------------------------------------------------------------- */
var argv = process.argv.slice(2);
var DRY_RUN = argv.indexOf('--dry-run') !== -1;
var rootIdx = argv.indexOf('--root');
var SITE_ROOT = (rootIdx !== -1 && argv[rootIdx + 1])
  ? argv[rootIdx + 1]
  : '/root/riotousconsulting-cloud/dist/_riotousaudio';
var PRODUCT_DIR = path.join(SITE_ROOT, 'product');

/* ---- contact-for-pricing handles (explicit allow-list) ---------------- */
var CONTACT_ONLY = {
  'ra-esb-bmw-front-100': true,
  'ra-esb-bmw-sub-1': true
};
var CONTACT_HREF = '/contact/';

/* ---- markers ---------------------------------------------------------- */
var STAMP_ATTR = 'data-ra-cart="1"';

/* ---- injected fragments ------------------------------------------------ */
function headTags() {
  return '\n<link rel="stylesheet" href="/assets/cart.css">' +
    '\n<script src="/assets/shop-config.js"></script>' +
    '\n<script src="/assets/cart.js" defer></script>\n';
}

function headerButton() {
  // Inline SVG bag icon so there is no extra asset dependency.
  return '<button class="ra-cart-button" id="ra-cart-button" type="button" ' +
    'aria-label="Open cart, 0 items">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" aria-hidden="true">' +
    '<path d="M6 7h12l-1 13H7L6 7z"/>' +
    '<path d="M9 7a3 3 0 0 1 6 0"/></svg>' +
    '<span class="ra-cart-count" data-empty="1">0</span></button>';
}

function addToCartBlock(handle) {
  return '\n<div class="ra-addcart-wrap">' +
    '<button class="ra-addcart" type="button" data-ra-handle="' + handle + '">' +
    'Add to Cart</button></div>\n';
}

function contactBlock() {
  return '\n<div class="ra-addcart-wrap">' +
    '<a class="ra-contact-cta" href="' + CONTACT_HREF + '">' +
    'Contact for Pricing</a></div>\n';
}

function drawerMount() {
  return '\n<div id="ra-cart-root"></div>\n';
}

/* ---- helpers ---------------------------------------------------------- */
function hasPrice(html) {
  // True if the .pd-price .now span contains a "$" (a real price).
  var m = html.match(/class="now"[^>]*>([^<]*)</);
  return !!(m && m[1].indexOf('$') !== -1);
}

/* Inject the add-to-cart / contact block immediately AFTER the .pd-price
 * block's closing </div>. The price block contains only <span> children
 * (verified across all 155 pages), so the first </div> after the opening
 * tag is its true close. Returns null if the anchor is not found. */
function injectAfterPrice(html, blockHtml) {
  var open = html.indexOf('class="pd-price"');
  if (open === -1) return null;
  var close = html.indexOf('</div>', open);
  if (close === -1) return null;
  var insertAt = close + '</div>'.length;
  return html.slice(0, insertAt) + blockHtml + html.slice(insertAt);
}

/* Insert the header cart button immediately after the nav Contact link
 * (the <a ... class="nav-cta">Contact</a> anchor). Falls back to inserting
 * before </nav> if the exact CTA anchor is not found. Returns null if no nav
 * close can be located at all. */
function injectHeaderButton(html) {
  var ctaRe = /(<a[^>]*class="nav-cta"[^>]*>[^<]*<\/a>)/;
  if (ctaRe.test(html)) {
    return html.replace(ctaRe, '$1' + headerButton());
  }
  var navClose = html.indexOf('</nav>');
  if (navClose === -1) return null;
  return html.slice(0, navClose) + headerButton() + html.slice(navClose);
}

/* ---- per-file wiring -------------------------------------------------- */
function wireFile(file, handle) {
  var html = fs.readFileSync(file, 'utf8');

  // Idempotency: already wired?
  if (html.indexOf(STAMP_ATTR) !== -1) {
    return { status: 'skipped' };
  }

  var problems = [];

  // 1) head tags
  if (html.indexOf('</head>') !== -1) {
    html = html.replace('</head>', headTags() + '</head>');
  } else {
    problems.push('no </head>');
  }

  // 2) header cart button
  var withHeader = injectHeaderButton(html);
  if (withHeader) html = withHeader;
  else problems.push('no nav/<nav> anchor for header button');

  // 3) add-to-cart OR contact-for-pricing block
  var isContactOnly = CONTACT_ONLY[handle] === true || !hasPrice(html);
  var block = isContactOnly ? contactBlock() : addToCartBlock(handle);
  var withButton = injectAfterPrice(html, block);
  if (withButton) html = withButton;
  else problems.push('no .pd-price anchor for add-to-cart button');

  // 4) drawer mount
  if (html.indexOf('</body>') !== -1) {
    html = html.replace('</body>', drawerMount() + '</body>');
  } else {
    problems.push('no </body>');
  }

  // 5) idempotency stamp on <body>
  if (/<body(\s|>)/.test(html)) {
    html = html.replace(/<body(\s[^>]*)?>/, function (m, attrs) {
      return '<body ' + STAMP_ATTR + (attrs || '') + '>';
    });
  } else {
    problems.push('no <body> tag to stamp');
  }

  // NO SILENT FAILURES: if any critical anchor was missing, do NOT write a
  // half-wired page — report it and leave the original untouched.
  if (problems.length) {
    return { status: 'error', problems: problems };
  }

  // Sanity: the file must have grown (we only ever add content). Guards
  // against an accidental truncation before we overwrite the original.
  var orig = fs.readFileSync(file, 'utf8');
  if (html.length <= orig.length) {
    return { status: 'error', problems: ['post-edit length not greater than original (refusing to write)'] };
  }

  if (!DRY_RUN) {
    fs.writeFileSync(file, html, 'utf8');
  }
  return { status: isContactOnly ? 'contact' : 'wired' };
}

/* ---- main ------------------------------------------------------------- */
function main() {
  if (!fs.existsSync(PRODUCT_DIR)) {
    console.error('[wire-cart] FATAL: product directory not found: ' +
      PRODUCT_DIR);
    process.exit(1);
  }

  var entries = fs.readdirSync(PRODUCT_DIR).filter(function (name) {
    try {
      return fs.statSync(path.join(PRODUCT_DIR, name)).isDirectory();
    } catch (e) { return false; }
  });

  var scanned = 0, wired = 0, skipped = 0, contact = 0, errored = 0;
  var errorPages = [];

  entries.forEach(function (handle) {
    var file = path.join(PRODUCT_DIR, handle, 'index.html');
    if (!fs.existsSync(file)) {
      // A product dir with no index.html is abnormal — surface it.
      errored++;
      errorPages.push(handle + ' (no index.html)');
      console.error('[wire-cart] ERROR: missing index.html in ' + handle);
      return;
    }
    scanned++;
    var res;
    try {
      res = wireFile(file, handle);
    } catch (e) {
      errored++;
      errorPages.push(handle + ' (' + e.message + ')');
      console.error('[wire-cart] ERROR wiring ' + handle + ': ' + e.message);
      return;
    }
    if (res.status === 'wired') wired++;
    else if (res.status === 'contact') contact++;
    else if (res.status === 'skipped') skipped++;
    else if (res.status === 'error') {
      errored++;
      errorPages.push(handle + ' [' + res.problems.join('; ') + ']');
      console.error('[wire-cart] ERROR wiring ' + handle + ': ' +
        res.problems.join('; '));
    }
  });

  /* ---- summary to stderr ---- */
  console.error('');
  console.error('========== wire-cart summary' +
    (DRY_RUN ? ' (DRY RUN — no files written)' : '') + ' ==========');
  console.error('  site root      : ' + SITE_ROOT);
  console.error('  pages scanned  : ' + scanned);
  console.error('  wired (cart)   : ' + wired);
  console.error('  contact-only   : ' + contact);
  console.error('  skipped (done) : ' + skipped);
  console.error('  errored        : ' + errored);
  if (errorPages.length) {
    console.error('  --- pages needing attention ---');
    errorPages.forEach(function (p) { console.error('    ! ' + p); });
  }
  console.error('=================================================');

  // Non-zero exit if anything errored, so a deploy wrapper can halt.
  if (errored > 0) process.exit(2);
}

main();
