# Codex Saber Theme

This repository contains a theme for the official Codex Desktop app on macOS and Windows.

## Rules

- Support native macOS and Windows. Shared renderer/CDP code stays in `macos/` for compatibility; Windows launch/install code lives in `windows/`.
- Do not modify the official `.app`, `app.asar`, binaries, or code signature.
- Do not change API keys, providers, Base URLs, chats, or projects.
- Ask for confirmation before quitting or restarting a running Codex app.
- Use the bundled scripts and the signed Node.js runtime discovered by them. Windows may fall back to a signed official Node.js 22+ installation when the app does not bundle one; never download/execute an unverified runtime automatically.

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

## Repository development

To make this Mac run the engine directly from the current checkout:

```bash
cd macos
./scripts/use-repository-macos.sh
~/.codex/codex-saber-theme/scripts/apply-repository-theme-macos.sh
```

The first command preserves any existing local engine and creates a symbolic
link. Run the second command after changing repository CSS, scripts, or preset
assets. It must not close or restart Codex without explicit user confirmation.

Report whether tests, installation, theme activation, and verification passed. On failure, preserve backups and report the exact failing command.

## Distributable launchers and Windows

`macos/VERSION` is the authoritative version. Runtime, application metadata, and release builders must read it. Keep `macos/package.json`, README version displays, and the newest changelog entry consistent; run `macos/tests/version.test.mjs` before creating a release tag.

Build the standalone macOS app with `macos/scripts/build-launcher-macos.sh`; use `macos/scripts/build-client-release.sh` for its ZIP. The app must embed its engine for other users, resolve paths at runtime, and request confirmation before closing Codex. Build generated applications/archives under ignored `release/` directories; do not commit binaries.

On Windows, double-click `windows/Install Saber Theme.cmd`. It installs under `%LOCALAPPDATA%/CodexSaberTheme` and creates Desktop/Start menu shortcuts. No administrator access, WSL, or global execution-policy changes are required. Never force-kill a running app. Pause removes injected styling without editing app files or account/config data.

Run `windows/tests/runtime.Tests.ps1` in Windows PowerShell and portable Node tests. A macOS parser/mocked test does not establish Windows app compatibility; report untested Store launch/signature behavior explicitly.

Use `macos/scripts/diagnose-dream-skin-macos.sh` or Windows `-Action Diagnose` for read-only performance samples. Do not reload the user's app or force garbage collection during live diagnostics. The optional `macos/tests/browser-soak.test.mjs` may force GC only in its own isolated browser process/profile.
