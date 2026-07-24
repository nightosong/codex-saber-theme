# Bundled Preset

This directory contains the bundled runtime theme for Codex Saber Theme.

## Saber Ice Atelier

`preset-saber-ice-atelier/` is the only built-in preset shipped by this
repository. It contains the complete Saber theme pack:

- `theme.json`: theme metadata, palette, layout hints, and optional art slots
- `background.jpg`: main Saber background
- `card-*.webp`: home suggestion card art
- `sidebar-emblem.png`: sidebar decoration
- `environment-card-canopy.png`: home environment card art
- `file-panel-archer.png`: file panel art
- `review-panel-rin.png`: review panel art

Install and repository-apply scripts seed this preset into
`~/Library/Application Support/CodexDreamSkinStudio/themes/` with the same id:

```bash
~/.codex/codex-saber-theme/scripts/switch-theme-macos.sh --id preset-saber-ice-atelier
```

## Maintenance Rules

- Keep this repository focused on Saber assets. Do not add unrelated preset
  packs, promotional graphics, concept screenshots, or upstream demo themes.
- Keep every file referenced by `theme.json` in the same preset directory.
- Keep the main image no larger than 16 MB and below `16384px` per side.
- Do not enable `animatedOverlay` unless the generated loop has been reviewed
  and confirmed for this theme.
- User-created themes should use `custom-*` ids and live in the local state
  directory, not in this bundled preset folder.
