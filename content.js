(function () {
  const browserAPI =
    typeof globalThis.browser !== "undefined" && globalThis.browser.storage
      ? globalThis.browser
      : globalThis.chrome;

  const PHRASES = [
    "ai",
    "ia",
    "artificial intelligence",
    "inteligencia artificial",
    "machine learning",
    "aprendizaje automático",
    "deep learning",
    "large language model",
    "language model",
    "generative ai",
    "generative artificial",
    "gen ai",
    "genai",
    "chatgpt",
    "chat gpt",
    "gpt-4",
    "gpt-3",
    "gpt 4",
    "gpt 3",
    "gpt4",
    "gpt3",
    "openai",
    "anthropic",
    "claude",
    "midjourney",
    "dall-e",
    "dall·e",
    "stable diffusion",
    "prompt engineering",
    "ingeniería de prompts",
    "copilot",
    "github copilot",
    "google gemini",
    "gemini pro",
    "google bard",
    "neural network",
    "neural networks",
    "redes neuronales",
    "fine-tuning",
    "finetuning",
    "fine tuning",
    "retrieval augmented",
    "rag pipeline",
    "multimodal model",
    "diffusion model",
    "transformer model",
    "whisper",
    "embedding model",
    "vector database",
    "langchain",
    "haystack",
    "hugging face",
    "mistral ai",
    "cohere",
    "perplexity ai",
  ];

  const SHORT_PATTERNS = [
    /\bai\b/i,
    /\bia\b/i,
    /\bml\b/i,
    /\bllm\b/i,
    /\bllms\b/i,
    /\brag\b/i,
    /\bagi\b/i,
  ];

  let enabled = true;
  let customPhrases = [];
  let authorWhitelistPhrases = [];
  let lastStorageSig = null;

  /**
   * LinkedIn posts often use Unicode “mathematical” / sans-serif italic letters (same look as
   * normal text) so substrings like "ai" / "inteligencia artificial" never match in raw UTF-16.
   */
  function foldMathAndFullwidthLatin(str) {
    const upperLowerStarts = [
      [0x1d400, 0x1d41a],
      [0x1d434, 0x1d44e],
      [0x1d468, 0x1d482],
      [0x1d5a0, 0x1d5ba],
      [0x1d5d4, 0x1d5ee],
      [0x1d608, 0x1d622],
      [0x1d63c, 0x1d656],
    ];
    function mapMath(cp) {
      for (const [u0, l0] of upperLowerStarts) {
        if (cp >= u0 && cp < u0 + 26) return 0x41 + (cp - u0);
        if (cp >= l0 && cp < l0 + 26) return 0x61 + (cp - l0);
      }
      return null;
    }
    let out = "";
    for (let i = 0; i < str.length; ) {
      const cp = str.codePointAt(i);
      i += cp > 0xffff ? 2 : 1;
      let ascii = mapMath(cp);
      if (ascii == null && cp >= 0xff21 && cp <= 0xff3a) ascii = 0x41 + (cp - 0xff21);
      if (ascii == null && cp >= 0xff41 && cp <= 0xff5a) ascii = 0x61 + (cp - 0xff41);
      out += ascii != null ? String.fromCharCode(ascii) : String.fromCodePoint(cp);
    }
    return out;
  }

  function normalizeText(s) {
    const folded = foldMathAndFullwidthLatin((s || "").normalize("NFKC"));
    return folded.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function phraseMatches(p, lower, prepared) {
    if (!p) return false;
    if (p === "ai" || p === "ia") {
      return new RegExp(`\\b${p}\\b`, "iu").test(prepared);
    }
    return lower.includes(p);
  }

  function matchesPostText(raw) {
    const prepared = foldMathAndFullwidthLatin((raw || "").normalize("NFKC"));
    const lower = prepared.toLowerCase().replace(/\s+/g, " ").trim();
    if (!lower) return false;

    for (const p of PHRASES) {
      if (phraseMatches(p, lower, prepared)) return true;
    }
    for (const p of customPhrases) {
      if (phraseMatches(p, lower, prepared)) return true;
    }
    for (const re of SHORT_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(prepared)) return true;
    }
    return false;
  }

  function parseCustomKeywords(text) {
    if (!text || typeof text !== "string") return [];
    return text
      .split("\n")
      .map((line) => normalizeText(line))
      .filter(Boolean);
  }

  function slugNormVariants(rawSlug) {
    const out = new Set();
    try {
      const dec = decodeURIComponent(String(rawSlug).replace(/\+/g, " "));
      out.add(normalizeText(dec));
      out.add(normalizeText(dec.replace(/-/g, " ")));
    } catch (_) {}
    return out;
  }

  function collectAuthorIdentityNorms(root) {
    const norms = new Set();
    if (!root?.querySelector) return norms;
    try {
      root.querySelectorAll('a[href*="/in/"]').forEach((a) => {
        const href = a.getAttribute("href") || a.href || "";
        const m = href.match(/\/in\/([^/?#]+)/i);
        if (!m) return;
        const seg = m[1];
        if (!seg || /^(ACoA|ACw)/i.test(seg)) return;
        slugNormVariants(seg).forEach((n) => {
          if (n) norms.add(n);
        });
      });
      const nameSels = [
        ".update-components-actor__name",
        '[class*="update-components-actor__name"]',
        ".update-components-actor__title",
      ];
      for (const sel of nameSels) {
        root.querySelectorAll(sel).forEach((el) => {
          const t = normalizeText(el.innerText || "");
          if (t.length > 1 && t.length < 160) norms.add(t);
        });
      }
    } catch (_) {}
    return norms;
  }

  function authorMatchesWhitelist(root) {
    if (!authorWhitelistPhrases.length) return false;
    const ids = collectAuthorIdentityNorms(root);
    if (!ids.size) return false;
    const idArr = [...ids];
    for (const w of authorWhitelistPhrases) {
      if (!w || w.length < 2) continue;
      for (const n of idArr) {
        if (n === w) return true;
        if (w.length >= 3 && (n.includes(w) || w.includes(n))) return true;
      }
    }
    return false;
  }

  /** Remove legacy highlight marks from older extension versions. */
  function stripLegacyHighlightMarks() {
    try {
      document.querySelectorAll("mark.ln-hide-ai__hl").forEach((mark) => {
        const p = mark.parentNode;
        if (!p) return;
        while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
        p.removeChild(mark);
      });
    } catch (_) {}
  }

  function getFeedScope() {
    // LinkedIn’s feed column is often outside <main> (shell/nav vs content). Scanning only
    // main yields zero cards and hides nothing on /feed/.
    return document;
  }

  /**
   * One BFS over document + open shadow roots; runs every selector once per light subtree root
   * (cheaper than calling querySelectorAllDeep per selector).
   */
  function querySelectorsAllDeep(root, selectors) {
    const outs = selectors.map(() => []);
    if (!selectors.length) return outs;
    const base = root === document ? document.documentElement : root;
    const queue = [];
    if (base?.querySelectorAll) queue.push(base);
    if (base?.shadowRoot) queue.push(base.shadowRoot);
    while (queue.length) {
      const node = queue.shift();
      if (!node?.querySelectorAll) continue;
      for (let s = 0; s < selectors.length; s++) {
        try {
          node.querySelectorAll(selectors[s]).forEach((el) => outs[s].push(el));
        } catch (_) {}
      }
      node.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) queue.push(el.shadowRoot);
      });
    }
    return outs;
  }

  function querySelectorAllDeep(root, selector) {
    return querySelectorsAllDeep(root, [selector])[0];
  }

  let digestScanCounter = 0;

  /** New LinkedIn UI: hashed CSS; real posts are role=listitem + componentkey *MAIN_FEED*. */
  function isMainFeedListItem(el) {
    if (!el?.matches?.('div[role="listitem"]')) return false;
    const ck = el.getAttribute("componentkey") || "";
    const ckl = ck.toLowerCase();
    return (
      ckl.includes("main_feed_relevance") ||
      ckl.includes("feedtype_main_feed") ||
      /feedtype_.*main_feed/i.test(ck) ||
      (ckl.includes("feedtype") && ckl.includes("sponsored"))
    );
  }

  /** True when at least one main-feed listitem exists in the light DOM (skip expensive deep BFS). */
  function hasLightMainFeedListItems() {
    try {
      const nodes = document.querySelectorAll('div[role="listitem"]');
      for (let i = 0; i < nodes.length; i++) {
        if (isMainFeedListItem(nodes[i])) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function closestMainFeedPostRoot(el) {
    let n = el;
    for (let i = 0; i < 45 && n && n.nodeType === 1; i++) {
      if (isMainFeedListItem(n)) return n;
      n = n.parentElement;
    }
    return null;
  }

  function isFeedCardComponentKey(ck) {
    const ckl = (ck || "").toLowerCase();
    return (
      ckl.includes("main_feed_relevance") ||
      ckl.includes("feedtype_main_feed") ||
      /feedtype_.*main_feed/i.test(ck || "")
    );
  }

  /** Outer wrapper (sometimes no role=listitem) for “X comentó esto” + post + comments. */
  function closestFeedCardShell(el) {
    let n = el;
    for (let i = 0; i < 55 && n && n.nodeType === 1; i++) {
      if (n.tagName === "DIV" && isFeedCardComponentKey(n.getAttribute("componentkey"))) return n;
      n = n.parentElement;
    }
    return null;
  }

  const DIGEST_LINE_MARKERS = [
    "han comentado esto",
    "han reaccionado a esto",
    "comentó esto",
    "reaccionó a esto",
    "commented on this",
    "reacted to this",
    "liked this",
    "reposted this",
  ];

  /** Prefer the full update card so innerText includes body copy (organic + promoted). */
  function bestRootFor(el) {
    if (!el || !el.closest) return el;
    const graph = closestMainFeedPostRoot(el);
    if (graph) return graph;
    const shell = closestFeedCardShell(el);
    if (shell) return shell;
    return (
      el.closest("div.feed-shared-update-v2") ||
      el.closest('div[class*="occludable-update"]') ||
      el.closest("div.feed-shared-card") ||
      el.closest('div[class*="feed-shared-card"]') ||
      el.closest('div[class*="fie-impression-container"]') ||
      el.closest("article") ||
      el
    );
  }

  /** One outer root per post so we do not only hide an inner chunk and leave an empty shell. */
  function keepOutermostOnly(roots) {
    const arr = roots.filter(Boolean);
    return arr.filter((r) => !arr.some((o) => o !== r && o.contains(r)));
  }

  /**
   * LinkedIn messaging UI — must never get feed shields.
   * Do not use one giant `closest(selectors)` list: one invalid selector makes the whole call throw
   * and the catch used to treat everything as “not messaging”.
   * Also walk through shadow roots: `closest` from inside shadow does not reach the light-DOM bubble.
   */
  function messagingShellMarksElement(el) {
    if (!(el instanceof Element)) return false;
    try {
      if (el.hasAttribute("data-msg-overlay-conversation-bubble-open")) return true;
      const vn = el.getAttribute("data-view-name") || "";
      if (vn === "message-overlay-conversation-bubble-item") return true;
      if (vn.includes("message-overlay") || vn.includes("msg-overlay")) return true;
      if (vn === "message-list-item") return true;
      const role = el.getAttribute("role") || "";
      const ar = el.getAttribute("aria-label") || "";
      if (role === "dialog" && /\b(mensajes|messages|messaging|mensaje)\b/i.test(ar)) return true;
      const cls = el.getAttribute("class") || "";
      if (cls.includes("msg-convo-wrapper")) return true;
      if (cls.includes("msg-overlay-conversation-bubble")) return true;
      if (cls.includes("msg-overlay-list-bubble")) return true;
      if (cls.includes("msg-overlay-bubble")) return true;
      if (cls.includes("msg-s-message-list-container")) return true;
      if (cls.includes("msg-s-message-list")) return true;
      if (cls.includes("msg-thread-container")) return true;
      if (cls.includes("msg-thread")) return true;
      if (cls.includes("msg-form")) return true;
      if (cls.includes("msg-s-event-listitem")) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function isInsideLinkedInMessagingShell(node) {
    let cur = node;
    if (cur?.nodeType === Node.TEXT_NODE || cur?.nodeType === Node.COMMENT_NODE) {
      cur = cur.parentElement;
    }
    if (!cur) return false;
    for (let depth = 0; depth < 200 && cur; depth++) {
      if (cur.nodeType === Node.ELEMENT_NODE && messagingShellMarksElement(cur)) return true;
      if (cur.parentNode) {
        cur = cur.parentNode;
        continue;
      }
      const rn = cur.getRootNode?.();
      if (rn instanceof ShadowRoot && rn.host) {
        cur = rn.host;
        continue;
      }
      break;
    }
    return false;
  }

  /** Post / share composer, modals — same stacking concern as messaging; never shield these trees. */
  function composerShellMarksElement(el) {
    if (!(el instanceof Element)) return false;
    try {
      const vn = (el.getAttribute("data-view-name") || "").toLowerCase();
      if (vn.includes("share-box") || vn.includes("sharebox")) return true;
      if (vn.includes("feed-share") || vn.includes("start-a-post") || vn.includes("create-post"))
        return true;
      if (vn.includes("composer") && (vn.includes("post") || vn.includes("share") || vn.includes("feed")))
        return true;
      const cls = el.getAttribute("class") || "";
      if (cls.includes("share-box-feed-entry") || cls.includes("share-box-feed")) return true;
      if (cls.includes("share-creation-state") || cls.includes("share-unified")) return true;
      const tid = (el.getAttribute("data-testid") || "").toLowerCase();
      if (tid.includes("share-box") || tid.includes("share-box-")) return true;
      const role = el.getAttribute("role") || "";
      const ar = el.getAttribute("aria-label") || "";
      if (
        role === "dialog" &&
        /\b(post|publication|publicar|share|compartir|composer|crear|write|escribir)\b/i.test(ar)
      )
        return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function isInsideLinkedInComposerShell(node) {
    let cur = node;
    if (cur?.nodeType === Node.TEXT_NODE || cur?.nodeType === Node.COMMENT_NODE) {
      cur = cur.parentElement;
    }
    if (!cur) return false;
    for (let depth = 0; depth < 200 && cur; depth++) {
      if (cur.nodeType === Node.ELEMENT_NODE && composerShellMarksElement(cur)) return true;
      if (cur.parentNode) {
        cur = cur.parentNode;
        continue;
      }
      const rn = cur.getRootNode?.();
      if (rn instanceof ShadowRoot && rn.host) {
        cur = rn.host;
        continue;
      }
      break;
    }
    return false;
  }

  function isFeedShieldExcludedShell(node) {
    return isInsideLinkedInMessagingShell(node) || isInsideLinkedInComposerShell(node);
  }

  /** Big layout node that wraps an open conversation bubble (feed column must not be shielded as one block). */
  function subtreeContainsOpenMessageOverlay(root) {
    if (!root?.querySelector) return false;
    try {
      if (messagingShellMarksElement(root)) return true;
      return Boolean(root.querySelector("[data-msg-overlay-conversation-bubble-open]"));
    } catch (_) {
      return false;
    }
  }

  function subtreeContainsComposerOverlay(root) {
    if (!root?.querySelector) return false;
    try {
      if (composerShellMarksElement(root)) return true;
      return Boolean(
        root.querySelector(
          "[data-view-name*='share-box'], [data-view-name*='shareBox'], [class*='share-box-feed'], [class*='share-creation-state']"
        )
      );
    } catch (_) {
      return false;
    }
  }

  function subtreeContainsFeedShieldExcludedOverlay(root) {
    return subtreeContainsOpenMessageOverlay(root) || subtreeContainsComposerOverlay(root);
  }

  function isLinkedInNonFeedPath() {
    try {
      const path = location.pathname || "";
      return /^\/(messaging|notifications)(\/|$)/.test(path);
    } catch (_) {
      return false;
    }
  }

  const FEED_SCROLL_SELECTORS = [
    ".scaffold-finite-scroll__content",
    "[class*='scaffold-finite-scroll__content']",
    "main .scaffold-layout__list",
    "[class*='scaffold-layout__list']",
    "[class*='feed-container']",
    "[role='feed']",
  ];

  function isLikelySinglePostOccludable(el) {
    if (!el?.querySelectorAll) return false;
    let n = 0;
    el.querySelectorAll('div[class*="feed-shared-update-v2"]').forEach((d) => {
      if (/\bfeed-shared-update-v2\b/.test(d.className || "")) n += 1;
    });
    return n <= 1;
  }

  /** LinkedIn virtual feed: one slot per direct child of the scroll column. */
  function addFeedColumnChunkRoots(set) {
    if (isLinkedInNonFeedPath()) return;
    const seen = new Set();
    const considerContainer = (container) => {
      if (!container || seen.has(container)) return;
      if (isFeedShieldExcludedShell(container)) return;
      seen.add(container);
      Array.from(container.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        if (isFeedShieldExcludedShell(child)) return;
        const tag = child.tagName;
        if (tag !== "DIV" && tag !== "LI" && tag !== "SECTION" && tag !== "ARTICLE") return;
        const len = (child.innerText || "").replace(/\s+/g, " ").trim().length;
        if (len < 20) return;
        set.add(child);
      });
    };

    FEED_SCROLL_SELECTORS.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((c) => considerContainer(c));
      } catch (_) {}
    });
    if (!hasLightMainFeedListItems()) {
      try {
        querySelectorAllDeep(document.documentElement, ".scaffold-finite-scroll__content").forEach((c) =>
          considerContainer(c)
        );
      } catch (_) {}
    }
  }

  function addGraphQlFeedPostRoots(set) {
    const visit = (el) => {
      if (isFeedShieldExcludedShell(el)) return;
      if (isMainFeedListItem(el)) set.add(el);
    };
    try {
      document.querySelectorAll('div[role="listitem"]').forEach(visit);
    } catch (_) {}

    const boxSel = '[data-testid="expandable-text-box"]';
    const fromBox = (box) => {
      if (isFeedShieldExcludedShell(box)) return;
      const li = closestMainFeedPostRoot(box);
      if (li && !isFeedShieldExcludedShell(li)) set.add(li);
      else {
        const shell = closestFeedCardShell(box);
        if (shell && !isFeedShieldExcludedShell(shell)) set.add(shell);
      }
    };
    try {
      document.querySelectorAll(boxSel).forEach(fromBox);
    } catch (_) {}

    const fromTestId = (el) => {
      if (isFeedShieldExcludedShell(el)) return;
      const li = el.closest?.('div[role="listitem"]');
      if (li && isMainFeedListItem(li) && !isFeedShieldExcludedShell(li)) set.add(li);
      else {
        const shell = closestFeedCardShell(el);
        if (shell && !isFeedShieldExcludedShell(shell)) set.add(shell);
      }
    };
    try {
      document.querySelectorAll('[data-testid*="FeedType_MAIN_FEED"]').forEach(fromTestId);
    } catch (_) {}

    if (!hasLightMainFeedListItems()) {
      const deepSels = [
        'div[role="listitem"]',
        '[data-testid="expandable-text-box"]',
        '[data-testid*="FeedType_MAIN_FEED"]',
      ];
      try {
        const [deepLi, deepBox, deepTid] = querySelectorsAllDeep(document.documentElement, deepSels);
        deepLi.forEach(visit);
        deepBox.forEach(fromBox);
        deepTid.forEach(fromTestId);
      } catch (_) {}
    }

    digestScanCounter += 1;
    const runDigest =
      !hasLightMainFeedListItems() || digestScanCounter % 4 === 0;
    if (runDigest) {
      try {
        document.querySelectorAll("p").forEach((p) => {
          if (isFeedShieldExcludedShell(p)) return;
          const it = (p.innerText || "").trim();
          if (it.length > 260) return;
          const il = it.toLowerCase();
          if (!DIGEST_LINE_MARKERS.some((m) => il.includes(m))) return;
          const li = closestMainFeedPostRoot(p);
          if (li && !isFeedShieldExcludedShell(li)) set.add(li);
          else {
            const shell = closestFeedCardShell(p);
            if (shell && !isFeedShieldExcludedShell(shell)) set.add(shell);
          }
        });
      } catch (_) {}
    }
  }

  function getPostRoots() {
    const set = new Set();
    if (isLinkedInNonFeedPath()) {
      return new Set();
    }
    const scope = getFeedScope();
    const rootEl = scope === document ? document.documentElement : scope;

    addGraphQlFeedPostRoots(set);
    addFeedColumnChunkRoots(set);

    const cardSelector = "div.feed-shared-update-v2";
    let cards = Array.from(scope.querySelectorAll(cardSelector));
    if (cards.length === 0) {
      cards = querySelectorAllDeep(rootEl, cardSelector);
    }
    cards.forEach((el) => {
      if (!isFeedShieldExcludedShell(el)) set.add(el);
    });
    if (set.size === 0) {
      scope.querySelectorAll('div[class*="feed-shared-update-v2"]').forEach((el) => {
        if (/\bfeed-shared-update-v2\b/.test(el.className || "")) {
          if (!isFeedShieldExcludedShell(el)) set.add(el);
        }
      });
    }

    const urnSelectors = [
      '[data-urn*="urn:li:activity"]',
      '[data-urn*="sponsored"]',
      '[data-urn*="ugcPost"]',
      '[data-id*="urn:li:activity"]',
      '[data-id*="sponsored"]',
    ];
    const addFromUrn = (el) => {
      if (isFeedShieldExcludedShell(el)) return;
      const r = bestRootFor(el);
      if (r && !isFeedShieldExcludedShell(r)) set.add(r);
    };
    for (const sel of urnSelectors) {
      try {
        scope.querySelectorAll(sel).forEach(addFromUrn);
      } catch (_) {}
    }
    if (!hasLightMainFeedListItems()) {
      try {
        querySelectorsAllDeep(rootEl, urnSelectors).forEach((arr) =>
          arr.forEach(addFromUrn)
        );
      } catch (_) {}
    }

    scope.querySelectorAll('div[class*="occludable-update"]').forEach((el) => {
      if (isFeedShieldExcludedShell(el)) return;
      const t = (el.innerText || "").length;
      if (t < 30) return;
      if (!isLikelySinglePostOccludable(el)) return;
      set.add(el);
    });

    scope.querySelectorAll('[data-view-name="feed-full-update"]').forEach((el) => {
      if (isFeedShieldExcludedShell(el)) return;
      const wrap =
        el.closest('div[class*="occludable-update"]') ||
        el.closest("div.feed-shared-update-v2") ||
        el;
      if (wrap && !isFeedShieldExcludedShell(wrap)) set.add(wrap);
    });

    scope.querySelectorAll('div[class*="fie-impression-container"]').forEach((el) => {
      if (isFeedShieldExcludedShell(el)) return;
      const wrap = bestRootFor(el);
      if (wrap && !isFeedShieldExcludedShell(wrap)) set.add(wrap);
    });

    const merged = keepOutermostOnly([...set]).filter(
      (r) => !isFeedShieldExcludedShell(r) && !subtreeContainsFeedShieldExcludedOverlay(r)
    );
    return new Set(merged);
  }

  let cachedRoots = null;
  let lastRootsScanAt = 0;
  let lastRootsPath = "";
  const ROOTS_CACHE_MS = 1000;

  function invalidateRootsCache() {
    cachedRoots = null;
    lastRootsScanAt = 0;
    lastRootsPath = "";
  }

  function getCachedRoots() {
    const now = Date.now();
    const path = (() => {
      try {
        return location.pathname || "";
      } catch (_) {
        return "";
      }
    })();
    if (path !== lastRootsPath) {
      lastRootsPath = path;
      cachedRoots = null;
    }
    if (!cachedRoots || now - lastRootsScanAt > ROOTS_CACHE_MS) {
      cachedRoots = getPostRoots();
      lastRootsScanAt = now;
    }
    return cachedRoots;
  }

  let lastStatsSentAt = 0;
  let lastStatsKey = "";
  function reportScanStats(shielded, rootsTotal) {
    const now = Date.now();
    const key = `${shielded}\0${rootsTotal}`;
    if (key === lastStatsKey && now - lastStatsSentAt < 2500) return;
    lastStatsKey = key;
    lastStatsSentAt = now;
    try {
      browserAPI.storage.local.set({
        lnHideAiStats: {
          hidden: shielded,
          roots: rootsTotal,
          at: now,
        },
      });
    } catch (_) {}
  }

  const MAX_MATCH_CHARS = 50000;

  function getRootTextForMatch(root) {
    const a = root.innerText || "";
    const b = root.textContent || "";
    const slice = (s) => (s.length > MAX_MATCH_CHARS ? s.slice(0, MAX_MATCH_CHARS) : s);
    if (!b || b === a) return slice(a);
    return slice(a + "\n" + b);
  }

  const CLS_SHIELDED = "ln-hide-ai--shielded";
  const CLS_REVEALED = "ln-hide-ai--revealed";
  const CLS_ANCHOR = "ln-hide-ai--anchor";
  const DATA_REVEALED = "data-ln-hide-ai-revealed";

  /** Survives LinkedIn re-renders and extra roots (parent/child) for the same card. */
  const revealedFingerprints = new Set();

  function getRevealFingerprint(root) {
    if (!root?.querySelector) return null;
    try {
      const urnEl = root.querySelector(
        '[data-urn*="urn:li:activity"], [data-id*="urn:li:activity"], [data-urn*="sponsored"], [data-id*="sponsored"]'
      );
      const urn = urnEl?.getAttribute("data-urn") || urnEl?.getAttribute("data-id");
      if (urn && String(urn).length > 12) return `u:${String(urn).slice(0, 240)}`;

      const tidEl = root.querySelector("[data-testid*='FeedType_MAIN_FEED']");
      const tid = tidEl?.getAttribute("data-testid");
      if (tid && tid.length > 12) return `t:${tid.slice(0, 240)}`;

      const ck =
        root.getAttribute("componentkey") ||
        root.querySelector("[componentkey]")?.getAttribute("componentkey");
      if (ck && ck.length > 15) return `c:${ck.slice(0, 240)}`;

      const act = root.querySelector(
        'a[href*="activity-"], a[href*="feed/update"], a[href*="/posts/"]'
      );
      const href = act?.href;
      if (href && href.includes("linkedin.com")) return `h:${href.split("?")[0].slice(-200)}`;
    } catch (_) {}
    return null;
  }

  function isRevealedForRoot(root) {
    if (root.getAttribute(DATA_REVEALED) === "1") return true;
    const fp = getRevealFingerprint(root);
    return Boolean(fp && revealedFingerprints.has(fp));
  }

  function revealPost(root) {
    const fp = getRevealFingerprint(root);
    if (fp) revealedFingerprints.add(fp);

    let all;
    try {
      all = [...getPostRoots()];
    } catch (_) {
      all = [root];
    }
    const related = all.filter((r) => r === root || root.contains(r) || r.contains(root));
    const targets = related.length ? related : [root];

    for (const r of targets) {
      r.setAttribute(DATA_REVEALED, "1");
      r.classList.remove(CLS_SHIELDED);
      r.classList.add(CLS_REVEALED);
      removeShield(r, { keepRevealed: true });
    }
  }

  function pickShieldAnchor(root) {
    try {
      if (root.nodeType !== 1) return root;
      const st = globalThis.getComputedStyle(root);
      if (st.display !== "contents") return root;
      let el = root.firstElementChild;
      while (el) {
        const d = globalThis.getComputedStyle(el).display;
        if (d !== "contents") return el;
        el = el.firstElementChild;
      }
    } catch (_) {}
    return root;
  }

  function removeShield(root, { keepRevealed = false } = {}) {
    const sh = root.querySelector(".ln-hide-ai__shield");
    if (sh?.parentElement) {
      sh.parentElement.classList.remove(CLS_ANCHOR);
      sh.remove();
    }
    root.classList.remove(CLS_SHIELDED, CLS_ANCHOR);
    if (!keepRevealed) {
      root.classList.remove(CLS_REVEALED);
      root.removeAttribute(DATA_REVEALED);
    }
  }

  function ensureShield(root) {
    if (isFeedShieldExcludedShell(root) || subtreeContainsFeedShieldExcludedOverlay(root)) return;
    let sh = root.querySelector(".ln-hide-ai__shield");
    if (sh) return;
    const anchor = pickShieldAnchor(root);
    sh = document.createElement("div");
    sh.className = "ln-hide-ai__shield";
    sh.setAttribute("role", "presentation");
    const msg = document.createElement("p");
    msg.className = "ln-hide-ai__msg";
    msg.textContent = "This post contains blocked content";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ln-hide-ai__btn";
    btn.textContent = "See post";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      revealPost(root);
    });
    sh.append(msg, btn);
    anchor.appendChild(sh);
    try {
      const pos = globalThis.getComputedStyle(anchor).position;
      if (pos === "static" || pos === "") anchor.classList.add(CLS_ANCHOR);
    } catch (_) {
      anchor.classList.add(CLS_ANCHOR);
    }
  }

  function stripShieldsInsideMessagingUi() {
    try {
      document.querySelectorAll(".ln-hide-ai__shield").forEach((sh) => {
        if (!isFeedShieldExcludedShell(sh)) return;
        let cur = sh;
        for (let i = 0; i < 90 && cur; i++) {
          if (cur.nodeType === Node.ELEMENT_NODE) {
            if (cur.classList?.contains(CLS_SHIELDED) || cur.classList?.contains(CLS_REVEALED)) {
              removeShield(cur);
              cur.classList.remove(CLS_SHIELDED, CLS_REVEALED, CLS_ANCHOR);
              cur.removeAttribute(DATA_REVEALED);
              break;
            }
          }
          if (cur.parentNode) {
            cur = cur.parentNode;
            continue;
          }
          const rn = cur.getRootNode?.();
          if (rn instanceof ShadowRoot && rn.host) {
            cur = rn.host;
            continue;
          }
          break;
        }
        sh.remove();
      });
    } catch (_) {}
  }

  function applyVisibility() {
    if (isLinkedInNonFeedPath()) {
      showAllPosts();
      reportScanStats(0, 0);
      return;
    }
    stripShieldsInsideMessagingUi();
    stripLegacyHighlightMarks();
    const roots = getCachedRoots();
    let hiddenCount = 0;
    roots.forEach((root) => {
      if (isFeedShieldExcludedShell(root) || subtreeContainsFeedShieldExcludedOverlay(root)) {
        removeShield(root);
        root.classList.remove(CLS_SHIELDED, CLS_REVEALED, CLS_ANCHOR);
        root.removeAttribute(DATA_REVEALED);
        return;
      }
      if (!enabled) {
        removeShield(root);
        return;
      }
      const text = getRootTextForMatch(root);
      const blocked = matchesPostText(text);
      const whitelisted = blocked && authorMatchesWhitelist(root);
      if (blocked && !whitelisted) {
        if (isRevealedForRoot(root)) {
          root.setAttribute(DATA_REVEALED, "1");
          root.classList.remove(CLS_SHIELDED);
          root.classList.add(CLS_REVEALED);
          removeShield(root, { keepRevealed: true });
          return;
        }
        hiddenCount++;
        root.classList.add(CLS_SHIELDED);
        root.classList.remove(CLS_REVEALED);
        ensureShield(root);
      } else {
        const fp = getRevealFingerprint(root);
        if (fp) revealedFingerprints.delete(fp);
        removeShield(root);
      }
    });
    reportScanStats(enabled ? hiddenCount : 0, roots.size);
  }

  function showAllPosts() {
    invalidateRootsCache();
    revealedFingerprints.clear();
    document.querySelectorAll(".ln-hide-ai__shield").forEach((sh) => {
      sh.parentElement?.classList.remove(CLS_ANCHOR);
      sh.remove();
    });
    document
      .querySelectorAll(`.${CLS_SHIELDED}, .${CLS_REVEALED}, .${CLS_ANCHOR}, [${DATA_REVEALED}]`)
      .forEach((el) => {
        el.classList.remove(CLS_SHIELDED, CLS_REVEALED, CLS_ANCHOR);
        el.removeAttribute(DATA_REVEALED);
      });
  }

  let debounceId = null;
  function scheduleScan() {
    if (debounceId) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      debounceId = null;
      applyVisibility();
    }, 220);
  }

  function storageLocalGet(keys) {
    if (typeof globalThis.browser !== "undefined" && globalThis.browser.storage?.local) {
      return globalThis.browser.storage.local.get(keys);
    }
    return new Promise((resolve) => {
      globalThis.chrome.storage.local.get(keys, resolve);
    });
  }

  function applySettings(filterEnabledRaw, keywordsText, authorWhitelistText) {
    invalidateRootsCache();
    enabled = filterEnabledRaw !== false;
    customPhrases = parseCustomKeywords(keywordsText || "");
    authorWhitelistPhrases = parseCustomKeywords(authorWhitelistText || "");
    lastStorageSig = JSON.stringify([
      filterEnabledRaw,
      keywordsText || "",
      authorWhitelistText || "",
    ]);
    if (!enabled) showAllPosts();
    applyVisibility();
  }

  async function refreshFromStorage() {
    const items = await storageLocalGet({
      filterEnabled: true,
      customKeywords: "",
      authorWhitelist: "",
    });
    const sig = JSON.stringify([
      items.filterEnabled,
      items.customKeywords || "",
      items.authorWhitelist || "",
    ]);
    if (sig === lastStorageSig) return;
    applySettings(items.filterEnabled, items.customKeywords, items.authorWhitelist);
  }

  async function loadSettings() {
    try {
      await refreshFromStorage();
    } catch (_) {
      applyVisibility();
    }
  }

  browserAPI.storage.onChanged.addListener((changes) => {
    if (!changes.filterEnabled && !changes.customKeywords && !changes.authorWhitelist) return;
    refreshFromStorage().catch(() => {});
  });

  browserAPI.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "ln-hide-ai-reload" && "filterEnabled" in msg) {
      applySettings(msg.filterEnabled, msg.customKeywords ?? "", msg.authorWhitelist ?? "");
    }
  });

  let domObserver = null;
  let rescanIntervalId = null;
  function startDomWatch() {
    if (domObserver || document.hidden) return;
    domObserver = new MutationObserver(() => {
      invalidateRootsCache();
      scheduleScan();
    });
    domObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  function stopDomWatch() {
    domObserver?.disconnect();
    domObserver = null;
  }
  function startPeriodicRescan() {
    if (rescanIntervalId || document.hidden) return;
    rescanIntervalId = setInterval(() => {
      if (!document.hidden) applyVisibility();
    }, 2800);
  }
  function stopPeriodicRescan() {
    if (rescanIntervalId) {
      clearInterval(rescanIntervalId);
      rescanIntervalId = null;
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopDomWatch();
      stopPeriodicRescan();
    } else {
      startDomWatch();
      startPeriodicRescan();
      refreshFromStorage().catch(() => {});
      scheduleScan();
    }
  });

  loadSettings();
  applyVisibility();
  scheduleScan();
  startDomWatch();
  startPeriodicRescan();
  [120, 700, 2000].forEach((ms) => {
    setTimeout(() => {
      applyVisibility();
    }, ms);
  });

  // Restored from bfcache in-memory settings can be stale vs storage.
  window.addEventListener("pageshow", (ev) => {
    if (!ev.persisted) return;
    lastStorageSig = null;
    invalidateRootsCache();
    loadSettings();
    scheduleScan();
    startDomWatch();
    startPeriodicRescan();
  });
})();
