#!/usr/bin/env bash
# Start command for the learn-from-scratch service (invoked by supervisord).
#
# Ensures node dependencies are present (node_modules is gitignored, so it is
# absent on a fresh container), builds the bundled single-file app, then serves
# it with `vite preview`. The app is served as a production build -- not the dev
# server -- because the system_interface reverse proxy stalls the browser's
# ES-module loader on the dev server's external module responses; a single-file
# bundle sidesteps that (see the app's vite.config.js).
set -euo pipefail

# This script lives at system/scripts/; the app lives at system/apps/.
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../apps/learn-from-scratch" && pwd)"

cd "$APP_DIR"

# Install deps if missing (fresh container) or if the lockfile is newer than the
# installed tree.
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  npm ci
fi

npm run build
exec npm run preview -- --host 127.0.0.1 --port 5173 --strictPort
