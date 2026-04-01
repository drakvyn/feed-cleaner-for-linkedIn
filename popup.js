(function () {
  const enabledEl = document.getElementById("enabled");
  const keywordsEl = document.getElementById("keywords");
  const authorWhitelistEl = document.getElementById("author-whitelist");
  const errEl = document.getElementById("popup-error");
  const statsEl = document.getElementById("feed-stats");

  const ext =
    typeof globalThis.browser !== "undefined" && globalThis.browser.storage?.local
      ? globalThis.browser
      : globalThis.chrome;
  const isMozilla = ext === globalThis.browser;

  function showError(msg) {
    if (errEl) {
      errEl.hidden = false;
      errEl.textContent = msg;
    }
  }

  if (!enabledEl || !keywordsEl || !authorWhitelistEl) {
    showError("Popup UI failed to load.");
    return;
  }

  function storageLocalGet(keys) {
    if (isMozilla) return ext.storage.local.get(keys);
    return new Promise((resolve, reject) => {
      ext.storage.local.get(keys, (items) => {
        const err = ext.runtime?.lastError;
        if (err) reject(new Error(err.message));
        else resolve(items);
      });
    });
  }

  function storageLocalSet(obj) {
    if (isMozilla) return ext.storage.local.set(obj);
    return new Promise((resolve, reject) => {
      ext.storage.local.set(obj, () => {
        const err = ext.runtime?.lastError;
        if (err) reject(new Error(err.message));
        else resolve();
      });
    });
  }

  function renderStats(raw) {
    if (!statsEl) return;
    if (!raw || typeof raw.hidden !== "number" || typeof raw.roots !== "number") {
      statsEl.textContent = "Open the feed — stats appear after a scan.";
      return;
    }
    statsEl.textContent = `Last scan: ${raw.hidden} shielded · ${raw.roots} posts detected in feed`;
  }

  async function load() {
    try {
      const items = await storageLocalGet({
        filterEnabled: true,
        customKeywords: "",
        authorWhitelist: "",
        lnHideAiStats: null,
      });
      enabledEl.checked = items.filterEnabled !== false;
      keywordsEl.value = items.customKeywords || "";
      authorWhitelistEl.value = items.authorWhitelist || "";
      renderStats(items.lnHideAiStats);
    } catch (e) {
      showError(e.message || "Could not load settings.");
    }
  }

  function isLinkedInUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
      const { hostname } = new URL(url);
      return (
        hostname === "linkedin.com" ||
        hostname === "www.linkedin.com" ||
        hostname.endsWith(".linkedin.com")
      );
    } catch (_) {
      return false;
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function queryAllTabs() {
    if (isMozilla) return ext.tabs.query({});
    return new Promise((resolve) => ext.tabs.query({}, resolve));
  }

  async function sendToTab(tabId, msg) {
    if (isMozilla) {
      await ext.tabs.sendMessage(tabId, msg);
      return;
    }
    await new Promise((resolve, reject) => {
      ext.tabs.sendMessage(tabId, msg, () => {
        if (ext.runtime.lastError) reject();
        else resolve();
      });
    });
  }

  async function notifyLinkedInTabs(state) {
    const msg = {
      type: "ln-hide-ai-reload",
      filterEnabled: state.filterEnabled,
      customKeywords: state.customKeywords,
      authorWhitelist: state.authorWhitelist,
    };
    let allTabs;
    try {
      allTabs = await queryAllTabs();
    } catch (_) {
      return;
    }
    const linkedInTabs = (allTabs || []).filter((t) => isLinkedInUrl(t.url));
    const attempts = 8;
    const gapMs = 100;
    for (const tab of linkedInTabs) {
      for (let i = 0; i < attempts; i++) {
        try {
          await sendToTab(tab.id, msg);
          break;
        } catch (_) {
          if (i < attempts - 1) await sleep(gapMs);
        }
      }
    }
  }

  async function save() {
    try {
      const state = {
        filterEnabled: enabledEl.checked,
        customKeywords: keywordsEl.value.trim(),
        authorWhitelist: authorWhitelistEl.value.trim(),
      };
      await storageLocalSet({
        filterEnabled: state.filterEnabled,
        customKeywords: state.customKeywords,
        authorWhitelist: state.authorWhitelist,
      });
      await notifyLinkedInTabs(state);
    } catch (e) {
      showError(e.message || "Could not save settings.");
    }
  }

  function bindDebouncedTextarea(el) {
    el.addEventListener("input", () => {
      clearTimeout(el._t);
      el._t = setTimeout(save, 400);
    });
    el.addEventListener("blur", () => {
      clearTimeout(el._t);
      el._t = null;
      save();
    });
  }

  enabledEl.addEventListener("change", save);
  bindDebouncedTextarea(keywordsEl);
  bindDebouncedTextarea(authorWhitelistEl);

  load();
})();
