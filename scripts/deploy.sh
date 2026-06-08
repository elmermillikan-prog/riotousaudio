#!/usr/bin/env bash
# Deploy site/ -> live VPS nginx dir with timestamped backup + atomic swap.
# Mirrors the original manual zip-drop, now versioned. Rollback = restore the backup dir.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/site"
LIVE_DIR="${LIVE_DIR:-/root/riotousconsulting-cloud/dist/_riotousaudio}"
BACKUP_DIR="${BACKUP_DIR:-/root/_ra-backups}"
TS="$(date -u +%Y%m%d-%H%M%S)"
[ -d "$SRC" ] || { echo "deploy: missing $SRC" >&2; exit 1; }
[ -f "$SRC/index.html" ] || { echo "deploy: $SRC/index.html absent — refusing (would wipe live)" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"
[ -d "$LIVE_DIR" ] && cp -a "$LIVE_DIR" "$BACKUP_DIR/_riotousaudio.predeploy.$TS"
STAGE="${LIVE_DIR}.new.$TS"
rm -rf "$STAGE"; cp -a "$SRC" "$STAGE"; chmod -R a+rX "$STAGE"
[ -d "$LIVE_DIR" ] && mv "$LIVE_DIR" "${LIVE_DIR}.old.$TS"
mv "$STAGE" "$LIVE_DIR"
rm -rf "${LIVE_DIR}.old.$TS"
echo "deploy OK ($TS): $SRC -> $LIVE_DIR ; backup $BACKUP_DIR/_riotousaudio.predeploy.$TS"
