# Notices

Codex Saber Theme is an unofficial customization project. It is not affiliated
with, endorsed by, or sponsored by OpenAI, TYPE-MOON, or the owners of the Fate
franchise.

## Software

This repository is based on the Dream Skin Studio project,
[Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).
The MIT License in `LICENSE` applies to the software source code, scripts, CSS,
tests, and original documentation in this repository.

## Artwork and third-party rights

The MIT License does not grant rights to:

- OpenAI, Codex, ChatGPT, TYPE-MOON, Fate, or related trademarks;
- official Codex or ChatGPT application binaries and assets;
- Saber, Rin, Archer, or other character names, likenesses, costumes, and art;
- user-supplied, AI-generated, or third-party images included in a theme pack.

Theme artwork under `macos/presets/preset-saber-ice-atelier` is distributed
separately from the software license. Inclusion in this repository is not a
representation that the artwork is cleared for commercial use or unrestricted
redistribution. Users and downstream distributors are responsible for
reviewing provenance and obtaining any required permissions.

The preview screenshots `docs/images/saber-home-preview.jpg` and
`docs/images/saber-task-review-preview.jpg` contain the themed interface and
are excluded from the software license as well.

## Security boundary

The project injects styles through Chromium DevTools Protocol on loopback. It
does not modify the official application bundle or code signature. While the
theme is running, do not allow untrusted local software to connect to the
debugging endpoint.
