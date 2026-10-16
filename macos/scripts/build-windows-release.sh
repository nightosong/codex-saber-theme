#!/bin/bash

# Cross-package the Windows launcher and shared engine; no Windows execution.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
. "$ROOT/scripts/common-macos.sh"
REPO="$(cd "$ROOT/.." && pwd -P)"
OUTPUT="${1:-$ROOT/release/codex-saber-theme-v$SKIN_VERSION-windows.zip}"
TEMP="$(/usr/bin/mktemp -d /tmp/saber-windows-release.XXXXXX)"
trap '/bin/rm -rf "$TEMP"' EXIT
PACKAGE="$TEMP/Saber Theme Windows"
/bin/mkdir -p "$PACKAGE/macos"
/bin/cp -R "$REPO/windows" "$PACKAGE/windows"
for directory in scripts assets presets; do /bin/cp -R "$ROOT/$directory" "$PACKAGE/macos/$directory"; done
/bin/cp "$ROOT/VERSION" "$ROOT/package.json" "$PACKAGE/macos/"
/bin/cp "$REPO/LICENSE" "$REPO/NOTICE.md" "$PACKAGE/"
/bin/cp "$REPO/windows/README.md" "$PACKAGE/README.md"
/bin/mkdir -p "$(dirname "$OUTPUT")"
COPYFILE_DISABLE=1 /usr/bin/ditto -c -k --keepParent --norsrc --noextattr "$PACKAGE" "$OUTPUT"
printf 'Created %s\n' "$OUTPUT"
/usr/bin/shasum -a 256 "$OUTPUT"
