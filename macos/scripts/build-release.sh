#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
VERSION="$(/usr/bin/tr -d '[:space:]' < "$ROOT/VERSION")"
RELEASE_DIR="$ROOT/release"
ARCHIVE="$RELEASE_DIR/codex-saber-theme-v$VERSION.zip"
TMP="$(/usr/bin/mktemp -d /tmp/codex-dream-skin-release.XXXXXX)"
trap '/bin/rm -rf "$TMP"' EXIT

if [ "${1:-}" != "--skip-tests" ]; then "$ROOT/tests/run-tests.sh"; fi

/bin/mkdir -p "$TMP/codex-saber-theme" "$RELEASE_DIR"
/usr/bin/rsync -a \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'release/' \
  "$ROOT/" "$TMP/codex-saber-theme/"

# The macOS tree is also published as a standalone ZIP. Bundle prompt guides
# and their referenced images, then translate repository paths for this root.
"$ROOT/scripts/prepare-standalone-docs.sh" "$TMP/codex-saber-theme"
rewrite_standalone_links() {
  local file="$1"
  local temporary="${file}.standalone"
  /usr/bin/sed \
    -e 's#\.\./docs/#docs/#g' \
    -e 's#\.\./windows/#https://github.com/Fei-Away/Codex-Dream-Skin/tree/main/windows/#g' \
    "$file" > "$temporary"
  /bin/mv "$temporary" "$file"
}
rewrite_standalone_links "$TMP/codex-saber-theme/README.md"
PRESET_README="$TMP/codex-saber-theme/presets/README.md"
if [ -f "$PRESET_README" ]; then
  temporary="${PRESET_README}.standalone"
  /usr/bin/sed -e 's#\.\./\.\./docs/#../docs/#g' "$PRESET_README" > "$temporary"
  /bin/mv "$temporary" "$PRESET_README"
fi
/usr/bin/find "$TMP/codex-saber-theme" -type f \( -name '.DS_Store' -o -name '._*' \) -delete
/bin/chmod 755 "$TMP/codex-saber-theme"/*.command
/bin/chmod 755 "$TMP/codex-saber-theme"/scripts/*.sh "$TMP/codex-saber-theme"/tests/*.sh
/bin/rm -f "$ARCHIVE"
COPYFILE_DISABLE=1 /usr/bin/ditto -c -k --keepParent --norsrc --noextattr \
  "$TMP/codex-saber-theme" "$ARCHIVE"
SHA256="$(/usr/bin/shasum -a 256 "$ARCHIVE" | /usr/bin/awk '{print $1}')"
/usr/bin/printf '%s  %s\n' "$SHA256" "$(basename "$ARCHIVE")" > "$RELEASE_DIR/SHA256SUMS.txt"
/usr/bin/printf 'Created %s\nSHA-256 %s\n' "$ARCHIVE" "$SHA256"
