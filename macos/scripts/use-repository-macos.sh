#!/bin/bash

# Point the stable local engine path at this checkout for repository development.

set -euo pipefail
. "$(cd "$(dirname "$0")" && pwd -P)/common-macos.sh"

repository_root="$PROJECT_ROOT"
install_parent="$(/usr/bin/dirname "$INSTALL_ROOT")"

/bin/mkdir -p "$install_parent"

if [ -L "$INSTALL_ROOT" ]; then
  linked_root="$(cd "$INSTALL_ROOT" 2>/dev/null && pwd -P || true)"
  if [ "$linked_root" = "$repository_root" ]; then
    printf 'Codex Saber Theme already uses this repository: %s -> %s\n' \
      "$INSTALL_ROOT" "$repository_root"
    exit 0
  fi
fi

backup=""
if [ -e "$INSTALL_ROOT" ] || [ -L "$INSTALL_ROOT" ]; then
  timestamp="$(/bin/date '+%Y%m%d-%H%M%S')"
  backup="$INSTALL_ROOT.backup-$timestamp"
  [ ! -e "$backup" ] && [ ! -L "$backup" ] \
    || fail "Development-link backup already exists: $backup"
  /bin/mv "$INSTALL_ROOT" "$backup"
fi

if ! /bin/ln -s "$repository_root" "$INSTALL_ROOT"; then
  [ -n "$backup" ] && [ ! -e "$INSTALL_ROOT" ] && /bin/mv "$backup" "$INSTALL_ROOT"
  fail "Could not link the local engine to this repository."
fi

printf 'Codex Saber Theme now uses this repository:\n  %s -> %s\n' \
  "$INSTALL_ROOT" "$repository_root"
[ -z "$backup" ] || printf 'Previous local engine preserved at:\n  %s\n' "$backup"
printf 'Apply repository changes with:\n  %s/scripts/apply-repository-theme-macos.sh\n' "$INSTALL_ROOT"
