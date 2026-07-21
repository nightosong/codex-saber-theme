#!/bin/bash

# Refresh the active Saber preset from this checkout and reload the injector.

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

THEME_ID="preset-saber-ice-atelier"
PORT=9341
while [ "$#" -gt 0 ]; do
  case "$1" in
    --id) THEME_ID="${2:-}"; shift 2 ;;
    --port) PORT="${2:-}"; shift 2 ;;
    *) fail "Unknown repository-apply argument: $1" ;;
  esac
done
case "$THEME_ID" in
  *[!A-Za-z0-9_-]*|'') fail "Theme id may contain only letters, numbers, underscores, and hyphens." ;;
esac
case "$PORT" in ''|*[!0-9]*) fail "Invalid port: $PORT" ;; esac
[ "$PORT" -ge 1024 ] && [ "$PORT" -le 65535 ] || fail "Port must be between 1024 and 65535."

[ -f "$PROJECT_ROOT/presets/$THEME_ID/theme.json" ] \
  || fail "Bundled repository theme not found: $THEME_ID"

discover_codex_app
require_macos_runtime
ensure_state_root
seed_bundled_presets
"$SCRIPT_DIR/switch-theme-macos.sh" --id "$THEME_ID" --no-apply

if [ -f "$STATE_PATH" ]; then
  saved_port="$(state_field port 2>/dev/null || true)"
  [ -z "$saved_port" ] || PORT="$saved_port"
fi

# start-dream-skin only restarts the injector when the verified CDP endpoint is
# already live. If Codex needs a full restart, it fails without closing the app.
"$SCRIPT_DIR/start-dream-skin-macos.sh" --port "$PORT"
printf 'Repository theme applied: %s\n' "$THEME_ID"
