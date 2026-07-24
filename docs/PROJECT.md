# Codex Saber Theme Project Notes

Maintainer-facing notes for the Saber theme repository.

## Scope

Codex Saber Theme is a macOS theme pack and local injector for the official
Codex Desktop app.

- It keeps Codex's native layout, sidebar, icons, composer, and task surfaces.
- It injects theme CSS and decorative DOM through local loopback CDP.
- It does not modify the official app bundle, `app.asar`, code signature, API
  keys, providers, chats, or projects.
- It ships one built-in theme: `preset-saber-ice-atelier`.

## Repository Layout

```text
codex-saber-theme/
├── README.md
├── README.en.md
├── AGENTS.md
├── NOTICE.md
├── docs/
│   ├── PROJECT.md
│   ├── platforms.md
│   ├── saber-motion-generation-plan.md
│   └── images/
│       ├── saber-home-preview.jpg
│       └── saber-task-review-preview.jpg
└── macos/
    ├── assets/
    ├── presets/preset-saber-ice-atelier/
    ├── scripts/
    └── tests/
```

## Installed Paths

| Purpose | Path |
| --- | --- |
| Engine | `~/.codex/codex-saber-theme` |
| State, logs, and saved themes | `~/Library/Application Support/CodexDreamSkinStudio` |
| Desktop launchers | `~/Desktop/Codex Saber Theme*.command` |

The development command `macos/scripts/use-repository-macos.sh` links the
installed engine to the current checkout, so local theme edits can be tested
without copying files by hand.

## Maintenance Rules

- Keep bundled assets focused on Saber.
- Keep non-Saber experiments outside the repository until explicitly approved.
- Keep generated video or animation candidates out of the runtime preset until
  the user reviews and confirms them.
- Do not reintroduce old upstream demo presets, legacy platform assets,
  promotional graphics, or concept screenshots.
- Root README/NOTICE retain attribution to Dream Skin Studio; users do not need
  to install that project separately.

## Common Commands

| Action | Command |
| --- | --- |
| Run tests | `cd macos && ./tests/run-tests.sh` |
| Install/update | `cd macos && ./scripts/install-dream-skin-macos.sh --no-launch` |
| Use checkout locally | `cd macos && ./scripts/use-repository-macos.sh` |
| Apply checkout theme | `cd macos && ./scripts/apply-repository-theme-macos.sh` |
| Restore official look | `~/.codex/codex-saber-theme/scripts/restore-dream-skin-macos.sh --restore-base-theme --restart-codex` |

## Release Notes

Version is currently `0.0.1` and is mirrored in:

- `README.md`
- `README.en.md`
- `macos/VERSION`
- `macos/package.json`
- `macos/scripts/common-macos.sh`
- `macos/scripts/injector.mjs`
