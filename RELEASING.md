# Releasing

## Version rules (SemVer)

| bump | when |
|:---|:---|
| **MAJOR** | Breaking behaviour users rely on (e.g. permission model, storage keys, minimum browser). |
| **MINOR** | New feature, backwards compatible. |
| **PATCH** | Bug fixes, copy, small UI tweaks, keyword list updates. |

Extension stores expect `manifest.json` **`version`** to match what you ship — use **three segments** `X.Y.Z` (Chrome/Firefox).

## Before every release

1. **Align versions** — `package.json`, `manifest.json`, and `manifest-firefox-v2.json` must show the **same** `version`.

   ```bash
   npm run verify:version
   ```

2. **Changelog** — Add a section under `[Unreleased]`, then move it to a dated heading with the new version (see [Keep a Changelog](https://keepachangelog.com/)).

3. **Lint**

   ```bash
   npm ci
   npm run lint:firefox
   ```

4. **Build locally** (optional sanity check)

   ```bash
   npm run build:firefox
   ls web-ext-artifacts/
   ```

## Git tag + GitHub Release

1. Commit version + changelog on `main`.

2. Tag with a **`v` prefix** (required by the release workflow):

   ```bash
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin v1.0.1
   ```

3. **GitHub Actions** builds a zip with `web-ext` and attaches it to the release. Edit the release notes on GitHub (summary for users).

4. **Stores** (manual):
   - **Chrome Web Store** — upload new zip from `web-ext-artifacts/` (or zip the extension root excluding `node_modules`).
   - **addons.mozilla.org** — submit the same signed/source bundle per AMO flow.

## If versions drift

```bash
# Example: bump to 1.0.1 in all three files, then:
npm run verify:version
```

Never publish a tag whose `manifest.json` version differs from the tag name (e.g. tag `v1.0.2` with manifest `1.0.1`).
