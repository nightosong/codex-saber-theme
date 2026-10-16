#!/bin/bash

# Read-only samples: does not reload, reinject, force GC, or capture chat text.
set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"
DIAGNOSTIC_ARGS=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --samples|--interval-ms)
      [ "$#" -ge 2 ] || fail "Missing value for $1"
      DIAGNOSTIC_ARGS+=("$1" "$2"); shift 2 ;;
    *) fail "Unknown diagnostic argument: $1 (expected --samples or --interval-ms)" ;;
  esac
done
discover_codex_app
require_macos_runtime
PORT=9341
if [ -f "$STATE_PATH" ]; then PORT="$(state_field port)"; fi
verified_cdp_endpoint "$PORT" || fail "Port $PORT is not a verified Codex loopback CDP endpoint."
exec "$NODE" "$INJECTOR" --diagnose --port "$PORT" "${DIAGNOSTIC_ARGS[@]}"
