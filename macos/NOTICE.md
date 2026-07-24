# Notices

Codex Saber Theme is an **unofficial** customization project and is **not affiliated with, endorsed by, or sponsored by OpenAI, TYPE-MOON, or the owners of the Fate franchise**.

## Software license

This fork references and builds on the upstream **Codex Dream Skin Studio**
project. The upstream project name is retained here for attribution only; users
do not need to install it separately.

The MIT License in `LICENSE` applies to the **software source code** in this
repository: scripts, CSS, injectors, tests, and documentation that describes
the software.

It does **not** grant rights to:

- OpenAI or Codex trademarks, product names, logos, or trade dress
- Official Codex / ChatGPT application binaries, `.app` bundles, or `app.asar`
- Any user-supplied images or third-party artwork you drop into a theme
- Character likenesses, franchise art, or celebrity imagery

## Runtime

This project does not redistribute Node.js. At runtime it validates and uses the Node.js executable already signed and bundled inside the user's official Codex desktop application.

## Saber theme artwork

Files under `presets/preset-saber-ice-atelier` that depict or reference Saber,
Rin, Archer, or other Fate-related characters are excluded from the MIT
software license. Their inclusion does not grant trademark, character,
likeness, or artwork rights. Redistribution and commercial use require an
independent rights review.

## Security model

Themes are applied through Chromium DevTools Protocol on **loopback only**. While a themed session is running, treat the local debugging port as sensitive: do not run untrusted local software that could attach to it. Use the Restore launcher to tear down the themed session and debugging port.
