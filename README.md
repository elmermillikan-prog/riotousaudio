# Riotous Audio — riotousaudio.com

Source-of-truth for the **Riotous Audio** US dealer static site (ESB · Zapco · Harmony car audio).
Launched 2026-06-06 (ROMPS Idea #499). Seeded from the live VPS tree on 2026-06-07 — the site was
built/enriched **in place** across several sessions, so `site/` IS the authoritative current source,
not a regenerable build artifact.

## Layout
- `site/` — the deployable static site (HTML + assets). **This is what ships.** 155 product pages,
  series pages, `/compare`, `/downloads`, custom Storefront-API cart, favicon. Pure static, no build.
- `tools/` — Node build & enrichment generators (NOT served):
  - `enrich/` — `transform.js` + `data/*.json`: per-SKU spec enrichment injected into product pages.
  - `cart/` — custom Shopify Storefront-API cart (`assets/`, `wire-cart.js`) + README.
  - `esb/` — datasheet/image/systems scrapers + page generators.
- `brand/BRAND.md` — the "Gilded Quiet" design system. (Logo masters: tracked follow-up.)
- `scripts/deploy.sh` — backup + atomic-swap deploy of `site/` into the live nginx dir.
- `.github/workflows/deploy.yml` — on push to `main` (or manual), the on-box self-hosted runner
  (labels `self-hosted, ra`) runs `deploy.sh`.

## Hosting
Served by `romps-proxy` (nginx) on the ROMPS VPS as a static bind-mount at
`/root/riotousconsulting-cloud/dist/_riotousaudio/`. NOT on Hostinger like the other Riot sites.
TLS: Let's Encrypt (`/etc/letsencrypt/live/riotousaudio.com/`), host certbot auto-renew.

## Deploy
Push to `main` → runner deploys automatically. Manual fallback on the box:
`LIVE_DIR=/root/riotousconsulting-cloud/dist/_riotousaudio bash scripts/deploy.sh`

## Notes
- The cart uses a **public** Shopify Storefront token (client-side by design) in
  `site/assets/shop-config.js` — read/cart-only, Headless-scoped. Not a secret.
- Rollback: every deploy snapshots the prior live tree to `/root/_ra-backups/`.
