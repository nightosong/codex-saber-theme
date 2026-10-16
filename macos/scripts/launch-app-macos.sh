#!/bin/bash

set -euo pipefail
RESOURCES="$(cd "$(dirname "$0")" && pwd -P)"
ENGINE="$HOME/.codex/codex-saber-theme"
EMBEDDED="$RESOURCES/engine"
if [ -d "$EMBEDDED/scripts" ]; then
  build_id="$(/bin/cat "$RESOURCES/build-id")"
  installed_id="$(/bin/cat "$ENGINE/.launcher-build-id" 2>/dev/null || true)"
  if [ "$build_id" != "$installed_id" ] || [ ! -x "$ENGINE/scripts/start-dream-skin-macos.sh" ]; then
    # The installer changes only theme files/config backups, but requires the
    # app closed to avoid racing its preference writes. Never bypass its check.
    (
      . "$EMBEDDED/scripts/common-macos.sh"
      discover_codex_app
      require_macos_runtime
      if codex_is_running; then
        /usr/bin/osascript -e 'display dialog "首次安装或更新 Saber Theme 需要关闭并重新打开 Codex。是否继续？" buttons {"取消", "关闭并继续"} default button "取消" with title "Saber Theme"' >/dev/null
        stop_codex true
      fi
    )
    /bin/bash "$EMBEDDED/scripts/install-dream-skin-macos.sh" --no-launch --no-launchers
    /usr/bin/printf '%s\n' "$build_id" > "$ENGINE/.launcher-build-id"
  fi
fi
[ -x "$ENGINE/scripts/start-dream-skin-macos.sh" ] || {
  printf 'Theme engine missing. Reinstall using the complete Saber Theme.app.\n' >&2
  exit 1
}
exec "$ENGINE/scripts/start-dream-skin-macos.sh" --prompt-restart
