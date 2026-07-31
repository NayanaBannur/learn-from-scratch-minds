#!/usr/bin/env bash
# Rebuild the learn-from-scratch app so newly generated / edited topics under
# system/apps/learn-from-scratch/content/ show up in the running app.
#
# The service is served by `vite preview`, which reads the built dist/ from disk
# on each request, so a rebuild-in-place is picked up without restarting the
# service. After building, refresh the open tab so the user sees the new content.
#
# Usage: system/scripts/rebuild_learn_from_scratch.sh
set -euo pipefail

# This script lives at system/scripts/; the repo root is two levels up.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR="$REPO_ROOT/system/apps/learn-from-scratch"

cd "$APP_DIR"
npm run build

# Refresh the tab if it's open (best-effort; harmless if it isn't).
cd "$REPO_ROOT"
uv run python system/scripts/layout.py refresh service:learn-from-scratch || true
