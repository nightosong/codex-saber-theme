#!/bin/bash

# Build a relocatable, native AppleScript application. Consumers need no SDK.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
. "$ROOT/scripts/common-macos.sh"
OUTPUT="${1:-$ROOT/release/Saber Theme.app}"
MODE="${2:---embedded}"
case "$MODE" in --embedded|--installed) ;; *) printf 'Expected --embedded or --installed\n' >&2; exit 1 ;; esac
[ "$(/usr/bin/uname -s)" = Darwin ] || exit 1
[ ! -e "$OUTPUT" ] || { printf 'Output already exists: %s\n' "$OUTPUT" >&2; exit 1; }
TEMP="$(/usr/bin/mktemp -d /tmp/saber-launcher.XXXXXX)"
trap '/bin/rm -rf "$TEMP"' EXIT
/bin/mkdir -p "$(dirname "$OUTPUT")"
cat > "$TEMP/launcher.applescript" <<'APPLESCRIPT'
on run
  try
    set launcher to POSIX path of (path to resource "launch.sh")
    do shell script "/bin/bash " & quoted form of launcher
  on error messageText number errorNumber
    if errorNumber is not -128 then
      display alert "Saber Theme" message messageText as critical
    end if
  end try
end run
APPLESCRIPT
/usr/bin/osacompile -o "$TEMP/Saber Theme.app" "$TEMP/launcher.applescript"
RESOURCES="$TEMP/Saber Theme.app/Contents/Resources"
/bin/cp "$ROOT/scripts/launch-app-macos.sh" "$RESOURCES/launch.sh"
/usr/bin/uuidgen > "$RESOURCES/build-id"
if [ "$MODE" = --embedded ]; then
  /bin/mkdir -p "$RESOURCES/engine"
  /usr/bin/rsync -a --exclude 'release/' --exclude 'runtime/' --exclude '.DS_Store' \
    "$ROOT/" "$RESOURCES/engine/"
fi
/usr/libexec/PlistBuddy -c 'Add :CFBundleIdentifier string io.github.codex-saber-theme.launcher' "$TEMP/Saber Theme.app/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :LSUIElement bool true' "$TEMP/Saber Theme.app/Contents/Info.plist"
for key in CFBundleShortVersionString CFBundleVersion; do
  /usr/libexec/PlistBuddy -c "Delete :$key" "$TEMP/Saber Theme.app/Contents/Info.plist" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Add :$key string ${SKIN_VERSION%%-*}" "$TEMP/Saber Theme.app/Contents/Info.plist"
done
/usr/libexec/PlistBuddy -c "Add :SaberThemeVersion string $SKIN_VERSION" "$TEMP/Saber Theme.app/Contents/Info.plist"
SIGNING_IDENTITY="${SABER_CODESIGN_IDENTITY:--}"
sign_args=(--force --sign "$SIGNING_IDENTITY")
if [ "$SIGNING_IDENTITY" != - ]; then sign_args+=(--options runtime --timestamp); fi
/usr/bin/codesign "${sign_args[@]}" "$TEMP/Saber Theme.app" >/dev/null
/bin/mv "$TEMP/Saber Theme.app" "$OUTPUT"
printf 'Created %s (%s)\n' "$OUTPUT" "$MODE"
