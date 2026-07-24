#!/bin/bash

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
OUTPUT="${1:-$HOME/Desktop/Codex Saber Theme.zip}"
TMP="$(/usr/bin/mktemp -d /tmp/codex-dream-client.XXXXXX)"
CLIENT_ROOT="$TMP/Codex Saber Theme"
ENGINE="$CLIENT_ROOT/.codex-saber-theme"
trap '/bin/rm -rf "$TMP"' EXIT

"$ROOT/tests/run-tests.sh"
/bin/mkdir -p "$ENGINE"
/usr/bin/rsync -a \
  --exclude '.git/' \
  --exclude '.DS_Store' \
  --exclude 'release/' \
  --exclude 'runtime/' \
  "$ROOT/" "$ENGINE/"

/usr/bin/printf '%s\n' \
  '#!/bin/bash' \
  'set -euo pipefail' \
  'ROOT="$(cd "$(dirname "$0")" && pwd -P)"' \
  'exec "$ROOT/.codex-saber-theme/scripts/install-dream-skin-macos.sh"' \
  > "$CLIENT_ROOT/安装 Codex Saber Theme.command"

/usr/bin/printf '%s\n' \
  'Codex Saber Theme 0.0.1' \
  '' \
  '推荐方式：把这个完整 ZIP、你喜欢的图片和“给 Codex 的部署提示词.md”一起发给自己的 Codex。' \
  '' \
  '手动方式：双击“安装 Codex Saber Theme.command”。安装完成后，桌面会出现启动、定制、验证和恢复四个入口。' \
  '' \
  '不要只复制图片或 CSS。隐藏目录 .codex-saber-theme 是完整运行引擎，请勿删除。' \
  > "$CLIENT_ROOT/使用说明.txt"

/bin/cp "$ROOT/CLIENT_DEPLOY_PROMPT.md" "$CLIENT_ROOT/给 Codex 的部署提示词.md"
/bin/chmod 755 "$CLIENT_ROOT/安装 Codex Saber Theme.command"
/bin/chmod 755 "$ENGINE"/*.command "$ENGINE"/scripts/*.sh "$ENGINE"/tests/*.sh
/usr/bin/xattr -cr "$CLIENT_ROOT"
/usr/bin/find "$CLIENT_ROOT" -type f \( -name '.DS_Store' -o -name '._*' \) -delete
/bin/mkdir -p "$(dirname "$OUTPUT")"
/bin/rm -f "$OUTPUT"
COPYFILE_DISABLE=1 /usr/bin/ditto -c -k --keepParent --norsrc --noextattr "$CLIENT_ROOT" "$OUTPUT"
SHA256="$(/usr/bin/shasum -a 256 "$OUTPUT" | /usr/bin/awk '{print $1}')"
/usr/bin/printf 'Created %s\nSHA-256 %s\n' "$OUTPUT" "$SHA256"
