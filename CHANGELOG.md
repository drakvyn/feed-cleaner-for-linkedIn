# Changelog

All notable changes follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.1] — 2026-04-09

### Fixed

- Do not apply feed blur shields on `/notifications/` (and keep `/messaging/` excluded). Clears any existing shields when navigating to these paths.

## [1.3.0] — 2026-03-31

### Added

- **Author whitelist** (popup): one name or `/in/` slug per line. If a post matches blocked keywords but the author matches a whitelist entry, the card stays visible (no blur).
- Author detection from profile links and common LinkedIn actor name regions; normalized like custom keywords.

### Fixed

- Blur overlay **stacking**: lower shield `z-index` + `isolation: isolate` on the anchor so the blur does not paint over LinkedIn messaging, post composer, and other overlays.
- Broader **exclusions** for messaging UI and share/composer shells so feed logic does not attach shields there.

### Changed

- Popup branding: **Feed cleaner for LinkedIn** (title); removed the old subtitle line; shorter hints under the textareas; numbered sections, separators, and tighter label/badge layout; **last scan** stats use a lighter text color for readability.
- Shield copy: overlay message is *“This post contains blocked content”* with **See post** (session reveal via stable post fingerprint).

### Removed

- In-page **word highlighting** experiment removed; legacy `<mark class="ln-hide-ai__hl">` nodes are stripped on scan so old installs stay clean.

## [1.1.0] — 2026-03-31

### Fixed

- LinkedIn’s newer feed UI (hashed classes): detect post roots via `div[role="listitem"]` + `componentkey` (`MAIN_FEED_RELEVANCE` / `FeedType_MAIN_FEED`), `data-testid` anchors, outer `componentkey` shells, comment-digest lines (ES/EN), shadow-DOM URN scan, and scroll-column chunk fallbacks.
- Text matching: fold Unicode “mathematical” Latin to ASCII; treat built-in `ai` / `ia` as **whole words** only (substring matches were hiding almost the entire feed); combine `innerText` + `textContent` for matching.

### Changed

- Content script: `document_end`, faster debounce / periodic rescan, `pageshow` bfcache refresh; popup saves custom keywords on textarea **blur** (avoids losing edits when the popup closes before debounce).
- Popup: keywords field fixed height, no resize handle, vertical scroll with themed scrollbar (Firefox `scrollbar-color` + WebKit pseudo-elements).

## [1.0.0] — 2026-03-31

### Added

- Initial public release: hide LinkedIn feed posts matching AI/ML keywords (built-in + custom).
- Popup UI (dark theme), `storage.local`, `tabs` messaging for Chrome MV3 and Firefox/Zen.
- `manifest-firefox-v2.json` for environments that need MV2.
- Docs: README, CONTRIBUTING, MIT license.

[Unreleased]: https://github.com/drakvyn/feed-fleaner-for-linkedIn/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/drakvyn/feed-fleaner-for-linkedIn/releases/tag/v1.3.1
[1.3.0]: https://github.com/drakvyn/feed-fleaner-for-linkedIn/releases/tag/v1.3.0
[1.1.0]: https://github.com/drakvyn/feed-fleaner-for-linkedIn/releases/tag/v1.1.0
[1.0.0]: https://github.com/drakvyn/feed-fleaner-for-linkedIn/releases/tag/v1.0.0
