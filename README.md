<div align="center">

<br/>

### ✦ ·˖° **zenfeed ai · hide ai posts on linkedin · browser extension** °˖· ✦

<sub>☆ hide ai-related posts on linkedin · chromium mv3 · firefox · no tracking ☆</sub>

<br/>

<img src="assets/y2k-banner.gif" width="100%" alt="Y2K gradient banner" />

<br/>

| ✧ | status | ✧ |
|:---:|:---|:---:|
| build | `no webpack` | ✓ |
| vibes | `y2k compliant` | ✓ |

<br/>

<img src="assets/y2k-sparkles.gif" width="180" alt="sparkles" />

<br/>

</div>

---

## ▸ what it does

ZenFeed AI is a browser extension for LinkedIn that hides AI-related posts, AI-generated content and machine learning noise from your feed using a blur overlay with manual reveal.

keywords: linkedin filter; hide ai posts; ai content blocker; linkedin cleaner; machine learning filter; remove ai spam; feed customization

- **Matching:** built-in AI/ML-related keyword list + **extra keywords** (one phrase per line in the popup). Case-insensitive; Unicode “fancy” Latin is folded before checks (see below).
- **Author whitelist:** optional list of names or profile slugs (`/in/…`). If a post matches blocked keywords but the **author** matches a whitelist line, the card **stays visible**. Useful for keeping signal from trusted authors while filtering generic AI content.
- **State:** `storage.local` (`filterEnabled`, `customKeywords`, `authorWhitelist`, scan stats). After save, the popup uses **`tabs.sendMessage`** so open LinkedIn tabs pick up settings (**Chromium** + **Gecko**).
Designed to reduce AI spam, low-signal content and repetitive machine learning posts in LinkedIn feeds.

<div align="center">

<br/>

<img src="assets/app.png" width="340" alt="ZenFeed AI - extension popup" />

<sub>popup</sub>

<br/>

<img src="assets/screenshot.gif" width="680" alt="ZenFeed AI hiding AI posts on LinkedIn feed with blur overlay" />

<sub>feed</sub>

<br/>

</div>

---

## ▸ built-in keyword list

Matching is case-insensitive; Unicode “fancy” Latin (e.g. mathematical italics) is folded to ASCII before checks.  
Custom lines from the popup are **substring** matches (one phrase per line), except a line that is exactly `ai` or `ia`, which uses **whole-word** matching like the built-ins below.
This list targets common AI, LLM and generative AI terms frequently found in low-signal LinkedIn posts.

---

## ▸ why

LinkedIn feeds are increasingly saturated with repetitive AI content, generative AI posts and low-value machine learning discussions.

ZenFeed AI helps reduce noise and improve signal by giving users control over what appears in their feed.

### Whole words only

These do **not** match inside longer words (e.g. not `email`, `inicia`):

| Source | Tokens |
|:---|:---|
| `PHRASES` | `ai`, `ia` |
| `SHORT_PATTERNS` (regex `\b…\b`) | `ml`, `llm`, `llms`, `rag`, `agi` |

### Substring phrases (`PHRASES`)

If the post text contains any of these (after normalization), the card gets the **blur shield** until you click **see post** (or you turn the filter off):

```
artificial intelligence
inteligencia artificial
machine learning
aprendizaje automático
deep learning
large language model
language model
generative ai
generative artificial
gen ai
genai
chatgpt
chat gpt
gpt-4
gpt-3
gpt 4
gpt 3
gpt4
gpt3
openai
anthropic
claude
midjourney
dall-e
dall·e
stable diffusion
prompt engineering
ingeniería de prompts
copilot
github copilot
google gemini
gemini pro
google bard
neural network
neural networks
redes neuronales
fine-tuning
finetuning
fine tuning
retrieval augmented
rag pipeline
multimodal model
diffusion model
transformer model
whisper
embedding model
vector database
langchain
haystack
hugging face
mistral ai
cohere
perplexity ai
```

Canonical list lives in **`content.js`** (`PHRASES` + `SHORT_PATTERNS`).

---

## ▸ stack 〜 file map

| layer | files |
|:---|:---|
| chrome (UI) | `popup.html` · `popup.css` · `popup.js` |
| page | `content.js` · `content.css` |
| legacy MV2 | `manifest-firefox-v2.json` · `background.js` |
| ship icon | `icon.png` |
| qa | `npm run lint:firefox` · `npm run pack:temp` |

<details>
<summary><b>⋆ repo tree (expand) ⋆</b></summary>

```
manifest.json
manifest-firefox-v2.json
content.js / content.css
popup.html / popup.css / popup.js
background.js
icon.png
assets/app.png        ← popup screenshot (readme)
assets/screenshot.png ← feed screenshot (readme)
assets/*.gif          ← readme eye candy + swap in your own demos
LICENSE · CONTRIBUTING.md
```

</details>

---

<div align="center">

<img src="assets/y2k-terminal.gif" width="420" alt="drakvyn/feed-fleaner-for-linkedIn - decorative terminal aesthetic" />

</div>

---

## ▸ local dev

```bash
npm install
npm run lint:firefox
```

| browser | how |
|:---|:---|
| **Chrome** | `chrome://extensions` → Load unpacked → this folder (`manifest.json`) |
| **Firefox / Zen** | `npm run pack:temp` → load `.xpi` in `about:debugging` **or** fix Flatpak portal ([bug 1639530](https://bugzilla.mozilla.org/show_bug.cgi?id=1639530)) |

---

## ▸ permissions (honest list)

ZenFeed AI does not collect, store or transmit personal data.

- `storage` - filter toggle, custom keywords, author whitelist, last-scan stats  
- `tabs` - notify LinkedIn tabs after popup save  
- host `https://www.linkedin.com/*` · `https://linkedin.com/*` - inject content script

---

## ▸ versions & releases

- **Current release:** `1.3.1` - see **[CHANGELOG.md](CHANGELOG.md)** (notifications path fix; author whitelist; blur/stacking vs LinkedIn overlays; store-facing name **ZenFeed AI**).
- **SemVer** - `package.json`, `manifest.json`, and `manifest-firefox-v2.json` must share the same `version`. Check with `npm run verify:version`.
- **[RELEASING.md](RELEASING.md)** - bump, tag (`v1.3.1`), GitHub Release, stores.
- Pushing a tag **`v*.*.*`** runs **GitHub Actions**: lint, build, attach `web-ext-artifacts/*.zip` to the release.

---

## ▸ collab

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - PR + issue rules  
- **[LICENSE](LICENSE)** - MIT  

---

<div align="center">

```
·:*¨༺ ♱ ✧ ✦ ✧ ♱ ༻¨*:·
```

<br/>

**[jeanroa.dev](https://jeanroa.dev)** · **[support the project](https://buymeacoffee.com/jeanroa)** · **[github](https://github.com/drakvyn/zen-feed-ai)**

---

## ▸ tags

linkedin; ai filter; browser extension; productivity; feed cleaner; ai blocker; open source

<br/>

</div>
