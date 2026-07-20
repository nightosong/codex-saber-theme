# Codex Saber Theme

This repository contains a complete macOS theme for the official Codex Desktop app.

## Rules

- Support macOS only.
- Do not modify the official `.app`, `app.asar`, binaries, or code signature.
- Do not change API keys, providers, Base URLs, chats, or projects.
- Ask for confirmation before quitting or restarting a running Codex app.
- Use the bundled scripts and the signed Node.js runtime discovered by them.

## Install or update

From the repository root:

```bash
cd macos
./tests/run-tests.sh
./scripts/install-dream-skin-macos.sh --no-launch
~/.codex/codex-saber-theme/scripts/switch-theme-macos.sh \
  --id preset-saber-ice-atelier \
  --no-apply
~/.codex/codex-saber-theme/scripts/start-dream-skin-macos.sh \
  --prompt-restart
~/.codex/codex-saber-theme/scripts/verify-dream-skin-macos.sh
```

If Codex is running and installation cannot continue safely, ask the user to approve closing it. Do not bypass the installer check.

## Restore

```bash
~/.codex/codex-saber-theme/scripts/restore-dream-skin-macos.sh \
  --restore-base-theme \
  --restart-codex
```

Report whether tests, installation, theme activation, and verification passed. On failure, preserve backups and report the exact failing command.
