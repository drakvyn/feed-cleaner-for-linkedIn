# Contributing

Thanks for helping improve this project. Please read this file before opening an issue or a pull request.

## Pull requests

1. **Scope** — One PR = one logical change. Avoid bundling unrelated refactors, formatting sweeps, or dependency bumps unless they are required for the feature or fix.
2. **Branch** — Work from an up-to-date `main`. Use a descriptive branch name, e.g. `fix/firefox-storage-race` or `feat/keyword-presets`.
3. **Commits** — Clear messages in English (imperative mood: `Fix popup width on Zen`, `Add keyword trim on save`). Squash noisy WIP commits before merge if asked.
4. **Description** — Explain *what* changed and *why*. Link related issues with `Fixes #123` or `Refs #456` when applicable.
5. **Quality** — Run `npm run lint:firefox` and fix reported errors. Load the extension unpacked in Chrome (MV3 `manifest.json`) and/or Firefox/Zen and sanity-check the popup + LinkedIn feed.
6. **Assets** — Do not commit build artifacts (`*.xpi`, `web-ext-artifacts/`), secrets, or large binaries unless explicitly requested.
7. **License** — By opening a PR, you agree your contributions are licensed under the same terms as this repository ([MIT](LICENSE)).

## Issues

### Before you open one

- Search existing **open and closed** issues for duplicates.
- Confirm the bug on the **latest** `main` with a clean extension reload.
- Note your **browser** (name + version), **OS**, and whether you use **Flatpak/Snap** (affects temp add-on loading).

### Bug reports

Include:

- **Expected** vs **actual** behaviour  
- **Steps to reproduce** (numbered, minimal)  
- **Manifest** you use (`manifest.json` vs `manifest-firefox-v2.json`)  
- **Console errors** (popup: right-click → Inspect; content: page devtools → filter by extension) if any  

Without reproduction steps, the issue may be closed until details are provided.

### Feature requests

Include:

- **Problem** you are solving (user story or pain point)  
- **Proposed behaviour** (concise)  
- **Trade-offs** you see (permissions, performance, LinkedIn DOM fragility)  

Feature requests that require new host permissions or broad access need extra justification for store review and user trust.

### What we may close

- Vague reports (“doesn’t work”) with no environment or repro  
- Duplicates of known LinkedIn DOM / Flatpak portal limitations (see README)  
- Requests that violate LinkedIn ToS or encourage scraping beyond normal extension behaviour  

## Code style

- Match existing patterns: plain JS, no build step for the runtime bundle.  
- Keep diffs focused; prefer small helper functions over large rewrites.  
- English for user-visible strings in the UI unless there is an existing i18n plan.

## Questions

For quick questions, open a **Discussion** on GitHub (if enabled) or an issue labeled **question** after checking the README.

---

Maintainers may edit these guidelines as the project evolves.

For cutting releases (tags, changelog, CI artifacts), see **[RELEASING.md](RELEASING.md)**.
