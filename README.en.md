# Codex Saber Theme

Native launchers are now available: macOS release ZIPs include a self-contained `Saber Theme.app`; Windows users can double-click `windows/Install Saber Theme.cmd` to create Desktop and Start menu shortcuts. The shared engine remains under `macos/` for compatibility. Windows Store launch and visual behavior still need real-device acceptance testing; see [Windows instructions](windows/README.md).

The default launcher injects once and exits. A full page reload or new window may need another launch. Image transfer is separated from resident script source, rotation pauses while hidden, and transition/preload resources are cleaned up. See [performance validation](docs/performance/README.md) for scope and reproduction commands.

[中文](./README.md)

A Codex theme repository with macOS and Windows launchers, designed to be installed and maintained directly by AI / Codex.

The repository includes the complete theme engine and Saber assets. No separate theme tool is required, and the official Codex application files are never modified.

Current version: `0.1.0` · [Download release](https://github.com/nightosong/codex-saber-theme/releases/tag/v0.1.0)

## Preview

### Home

![Codex Saber Theme home preview](docs/images/saber-home-preview.jpg)

### Chat

![Codex Saber Theme chat preview](docs/images/saber-chat-preview.jpg)

### Background rotation

![Codex Saber Theme background variants 01-06](docs/images/saber-background-variants-01-06.jpg)

![Codex Saber Theme background variants 07-12](docs/images/saber-background-variants-07-12.jpg)

## Use

Open this repository in Codex and send:

```text
Read AGENTS.md in the repository root, install and enable Codex Saber Theme, then verify that it works. Do not modify the official Codex application files. Ask for my confirmation before restarting Codex.
```

Codex will follow [`AGENTS.md`](./AGENTS.md) to test, install, activate, and verify the theme.

## Requirements

- macOS, or native Windows (real-device acceptance pending)
- Official Codex Desktop installed
- Codex launched at least once

The engine is installed at `~/.codex/codex-saber-theme` on macOS or `%LOCALAPPDATA%\CodexSaberTheme` on Windows. Existing themes and backups are preserved.

## Restore

Ask Codex:

```text
Follow AGENTS.md to restore the official Codex appearance.
```

## Source and license

This project builds on the theme engine from [Dream Skin Studio (Fei-Away/Codex-Dream-Skin)](https://github.com/Fei-Away/Codex-Dream-Skin).

Software code is provided under the [MIT License](./LICENSE). Saber, Rin, Archer, related character designs, and third-party artwork are outside the software license. See [NOTICE.md](./NOTICE.md).

Development, troubleshooting, and manual commands are documented in [`macos/README.md`](./macos/README.md).
