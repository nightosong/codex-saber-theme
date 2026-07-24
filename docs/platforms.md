# macOS Runtime Notes

Codex Saber Theme currently supports macOS only. It themes the official Codex
Desktop app by starting Codex with a local loopback CDP endpoint and injecting
CSS plus small decorative DOM nodes into verified `app://` renderer targets.

It does not modify the official `.app`, `app.asar`, binaries, signatures, API
keys, providers, chats, or projects.

## Paths

| Purpose | Path |
| --- | --- |
| Installed engine | `~/.codex/codex-saber-theme` |
| State, logs, and saved themes | `~/Library/Application Support/CodexDreamSkinStudio` |
| Active theme pack | `~/Library/Application Support/CodexDreamSkinStudio/theme` |
| Saved bundled Saber preset | `~/Library/Application Support/CodexDreamSkinStudio/themes/preset-saber-ice-atelier` |
| Codex config backup | `~/Library/Application Support/CodexDreamSkinStudio/theme-backup.json` |

## Bundled Theme

The repository ships one built-in preset:

```text
macos/presets/preset-saber-ice-atelier/
```

Install and repository-apply scripts seed that preset into the local saved
theme library. Older upstream demo preset ids are pruned during seeding, while
user-created `custom-*` themes are kept.

## Image Rules

- Runtime theme images must be non-empty and no larger than 16 MB.
- Image dimensions must stay below `16384px` per side and 50 megapixels.
- Custom source images may be up to 50 MB before macOS converts them for use.
- Background artwork should be pure edge-to-edge art, without UI chrome,
  readable text, logos, watermarks, buttons, cards, or screenshots.

## Local Development

To make the installed engine point at this checkout:

```bash
cd macos
./scripts/use-repository-macos.sh
./scripts/apply-repository-theme-macos.sh
```

After editing CSS, scripts, or Saber preset assets, rerun
`./scripts/apply-repository-theme-macos.sh` from `macos/` to refresh the local
theme. If Codex needs a full restart, the script fails and asks for explicit
confirmation instead of closing the app silently.
