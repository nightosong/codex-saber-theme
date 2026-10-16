#!/bin/bash

# Exercise first launch, relocation, idempotence, and failed updates without
# starting or stopping the real app, changing the user's HOME, or opening UI.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
TEMP="$(/usr/bin/mktemp -d /tmp/saber-app-tests.XXXXXX)"
trap '/bin/rm -rf "$TEMP"' EXIT
RESOURCES="$TEMP/Relocated Saber Theme/Contents/Resources"
TEST_HOME="$TEMP/home with spaces"
/bin/mkdir -p "$RESOURCES/engine/scripts" "$TEST_HOME"
/bin/cp "$ROOT/scripts/launch-app-macos.sh" "$RESOURCES/launch.sh"
printf 'build-one\n' > "$RESOURCES/build-id"
cat > "$RESOURCES/engine/scripts/common-macos.sh" <<'SH'
discover_codex_app() { :; }
require_macos_runtime() { :; }
codex_is_running() { return 1; }
stop_codex() { exit 99; }
SH
cat > "$RESOURCES/engine/scripts/install-dream-skin-macos.sh" <<'SH'
#!/bin/bash
set -euo pipefail
[ "$*" = '--no-launch --no-launchers' ]
printf 'install\n' >> "$HOME/install-count"
engine="$HOME/.codex/codex-saber-theme"
mkdir -p "$engine/scripts"
cat > "$engine/scripts/start-dream-skin-macos.sh" <<'START'
#!/bin/bash
set -euo pipefail
[ "$*" = '--prompt-restart' ]
printf 'start\n' >> "$HOME/start-count"
START
chmod +x "$engine/scripts/start-dream-skin-macos.sh"
SH
HOME="$TEST_HOME" /bin/bash "$RESOURCES/launch.sh"
HOME="$TEST_HOME" /bin/bash "$RESOURCES/launch.sh"
[ "$(/usr/bin/wc -l < "$TEST_HOME/install-count" | /usr/bin/tr -d ' ')" = 1 ]
[ "$(/usr/bin/wc -l < "$TEST_HOME/start-count" | /usr/bin/tr -d ' ')" = 2 ]
/usr/bin/cmp "$RESOURCES/build-id" "$TEST_HOME/.codex/codex-saber-theme/.launcher-build-id"
printf 'build-two\n' > "$RESOURCES/build-id"
printf '#!/bin/bash\nexit 42\n' > "$RESOURCES/engine/scripts/install-dream-skin-macos.sh"
if HOME="$TEST_HOME" /bin/bash "$RESOURCES/launch.sh"; then
  printf 'A failed app update must not launch the engine.\n' >&2
  exit 1
fi
[ "$(/bin/cat "$TEST_HOME/.codex/codex-saber-theme/.launcher-build-id")" = build-one ]
[ "$(/usr/bin/wc -l < "$TEST_HOME/start-count" | /usr/bin/tr -d ' ')" = 2 ]
printf 'PASS: app relocation, first install, repeat launch, and failed-update preservation.\n'
