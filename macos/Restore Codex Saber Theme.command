#!/bin/bash
set -euo pipefail
INSTALLED="$HOME/.codex/codex-saber-theme/scripts/restore-dream-skin-macos.sh"
if [ ! -x "$INSTALLED" ]; then
  /usr/bin/osascript -e 'display alert "没有找到已安装的 Codex Saber Theme。" as warning' >/dev/null
  exit 1
fi
exec "$INSTALLED" --restore-base-theme --restart-codex
