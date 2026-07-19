// ==UserScript==
// @name         Discord Widget Configurator (Portal Edition)
// @namespace    https://github.com/ItzMeShadow999
// @version      1.6.2
// @description  One-click Discord profile widget configurator built natively into the Developer Portal UI with accurate ambient dark gradients and adjusted layout constraints.
// @author       Shadow
// @match        https://discord.com/developers/*
// @icon         https://i.pinimg.com/736x/9c/fb/a9/9cfba9b4cc1d06fbe0f00263cbc926de.jpg
// @grant        GM_xmlhttpRequest
// @connect      discord.com
// @license         MIT
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  // ==========================================
  // PART 1: PRIVILEGED BACKGROUND BRIDGE
  // ==========================================
  const BOT_UA = "DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)";

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== location.origin) return;
    const d = e.data;
    if (!d || d.__dwc !== true || d.type !== "finalize") return;

    GM_xmlhttpRequest({
      method: "PATCH",
      url: `https://discord.com/api/v9/applications/${d.appId}/users/${d.userId}/identities/0/profile`,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bot " + d.botToken,
        "User-Agent": BOT_UA
      },
      data: JSON.stringify({ data: { dynamic: [] } }),
      onload: function (res) {
        window.postMessage({
          __dwc: true,
          type: "finalizeResult",
          id: d.id,
          ok: res.status >= 200 && res.status < 300,
          status: res.status,
          body: res.responseText
        }, location.origin);
      },
      onerror: function (err) {
        window.postMessage({
          __dwc: true,
          type: "finalizeResult",
          id: d.id,
          ok: false,
          status: 0,
          body: "GM_xmlhttpRequest failed to connect."
        }, location.origin);
      }
    });
  });

  // ==========================================
  // PART 2: MAIN PAGE INJECTION (WORLD: MAIN)
  // ==========================================
  function injectedMainWorldScript() {
    if (!location.hostname.endsWith("discord.com")) return;
    if (window.__discordWidgetCreatorLoaded) return;
    window.__discordWidgetCreatorLoaded = true;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let lastApp = null;
    const WIDGET_EXPERIMENT = "2026-03-widget-config-editor";

    const UI = (function () {
      const PREFIX = "dwc-portal";
      let logEl, startBtn, fallbackWrap, fallbackText, statusEl, jsonEl, targetEl, panelEl, launcherEl;
      let running = false;

      function injectStyles() {
        if (document.getElementById(`${PREFIX}-styles`)) return;
        const css = `
          /* Custom Discord Scrollbars */
          .${PREFIX}-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
          .${PREFIX}-scroll::-webkit-scrollbar-track { background: #2e3035; border-radius: 4px; }
          .${PREFIX}-scroll::-webkit-scrollbar-thumb { background: #1a1b1e; border-radius: 4px; }
          .${PREFIX}-scroll::-webkit-scrollbar-thumb:hover { background: #111214; }

/* Global Reset & Interface Launcher (Hardcoded to sit next to New Application) */
          .${PREFIX}-nav-btn {
            background: #5865f2; color: #fff; border: none; border-radius: 4px;
            padding: 10px 16px; font-family: "gg sans", "Noto Sans", system-ui, sans-serif;
            font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.15s ease;
            position: fixed; 
            top: 75px; 
            right: 215px; 
            z-index: 9999; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          }
          .${PREFIX}-nav-btn:hover { background: #4752c4; }
          .${PREFIX}-nav-btn:active { background: #3c45a5; }

          /* Master Dashboard Full-Screen Viewport */
          #${PREFIX}-wrapper {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: #111214; color: #f2f3f5; z-index: 2147483646;
            font-family: "gg sans", "Noto Sans", system-ui, sans-serif; display: none;
          }
          #${PREFIX}-wrapper.${PREFIX}-open { display: flex; }

          /* Premium Left Sidebar Layout */
          #${PREFIX}-sidebar {
            width: 240px; background: #1e1f22; display: flex; flex-direction: column; 
            padding: 24px 12px; box-sizing: border-box; border-right: 1px solid #1c1d20;
          }
          .${PREFIX}-brand {
            font-size: 12px; font-weight: 700; color: #949ba4; letter-spacing: 0.5px;
            text-transform: uppercase; margin-bottom: 20px; padding-left: 8px;
          }
          .${PREFIX}-nav-item {
            padding: 8px 12px; border-radius: 4px; color: #949ba4; cursor: pointer;
            font-weight: 500; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;
            transition: background 0.15s ease, color 0.15s ease;
          }
          .${PREFIX}-nav-item:hover { background: #35373c; color: #dbdee1; }
          .${PREFIX}-nav-item.${PREFIX}-active { background: #404249; color: #fff; }

          /* Right Main Work Content Frame with image_64c5fc.png Ambient Glow Gradient */
          #${PREFIX}-container {
            flex: 1; display: flex; flex-direction: column; 
            background: radial-gradient(circle at 85% 0%, #1d1f3d 0%, #111214 55%);
            overflow: hidden;
          }
          #${PREFIX}-header {
            padding: 20px 40px; background: transparent; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex; justify-content: space-between; align-items: center;
          }
          #${PREFIX}-header h1 { font-size: 18px; font-weight: 600; color: #fff; margin: 0; }
          .${PREFIX}-close-btn {
            background: #4e5058; border: none; color: #fff;
            padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;
            transition: background 0.15s ease;
          }
          .${PREFIX}-close-btn:hover { background: #6d6f78; }

          /* Inner Body Content Styling */
          #${PREFIX}-content { 
            padding: 40px; box-sizing: border-box; max-width: 1100px; width: 100%; 
            margin: 0 auto; overflow-y: auto; flex: 1; 
          }
          .${PREFIX}-section-card {
            background: rgba(43, 45, 49, 0.75); border-radius: 8px; padding: 24px; margin-bottom: 24px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(4px);
          }
          .${PREFIX}-card-title { font-size: 14px; font-weight: 700; color: #949ba4; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 16px; }
          
          /* System Guard Alert Banner */
          #${PREFIX}-note {
            background: rgba(240, 178, 50, 0.1); border-left: 4px solid #f0b232;
            color: #f2f3f5; border-radius: 4px; padding: 14px 16px; font-size: 14px; margin-bottom: 24px; line-height: 1.4;
          }

          /* Code Block Terminal & Workspace */
          #${PREFIX}-log {
            height: 180px; overflow-y: auto; padding: 14px; border-radius: 4px;
            font-family: "Consolas", "Courier New", monospace; font-size: 13px; background: #1e1f22; 
            border: 1px solid #111214; margin-bottom: 16px; line-height: 1.5;
          }
          #${PREFIX}-json {
            width: 100%; height: 130px; box-sizing: border-box; resize: vertical; background: #1e1f22;
            color: #f2f3f5; border: 1px solid #111214; border-radius: 4px; padding: 14px;
            font-family: "Consolas", "Courier New", monospace; font-size: 13px; margin-bottom: 16px; line-height: 1.4;
          }
          #${PREFIX}-json:focus, #${PREFIX}-target:focus {
            outline: none; border-color: #5865f2;
          }

          /* Input / Flex Infrastructure Fields */
          .${PREFIX}-control-row { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
          #${PREFIX}-target {
            background: #1e1f22; color: #dbdee1; border: 1px solid #111214; border-radius: 4px;
            padding: 10px 14px; font-size: 14px; min-width: 280px; max-width: 100%; cursor: pointer;
          }
          
          /* Native Styled Discord Buttons */
          .${PREFIX}-btn {
            background: #4e5058; color: #fff; border: none; border-radius: 4px;
            padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.1s ease;
          }
          .${PREFIX}-btn:hover { background: #6d6f78; }
          .${PREFIX}-btn:active { background: #80848e; }
          .${PREFIX}-btn:disabled { opacity: 0.4; cursor: not-allowed; }
          
          .${PREFIX}-btn-primary { background: #23a55a; }
          .${PREFIX}-btn-primary:hover { background: #1a7a42; }
          .${PREFIX}-btn-primary:active { background: #156235; }
          
          .${PREFIX}-btn-blurple { background: #5865f2; }
          .${PREFIX}-btn-blurple:hover { background: #4752c4; }
          .${PREFIX}-btn-blurple:active { background: #3c45a5; }

          /* Sync Fallback Diagnostic Card */
          #${PREFIX}-fallback {
            display: none; background: rgba(242, 63, 67, 0.1); border-left: 4px solid #f23f43;
            border-radius: 4px; padding: 18px; margin-top: 16px;
          }
          #${PREFIX}-fallback.${PREFIX}-open { display: block; }
          #${PREFIX}-fallback-text {
            width: 100%; height: 65px; background: #1e1f22; color: #f2f3f5; border: 1px solid #111214;
            border-radius: 4px; padding: 10px; font-family: "Consolas", monospace; font-size: 12px; margin-top: 10px; resize: none;
          }
        `;
        const style = document.createElement("style");
        style.id = `${PREFIX}-styles`;
        style.textContent = css;
        document.head.appendChild(style);
      }

      function build() {
        injectStyles();

        launcherEl = document.createElement("button");
        launcherEl.className = `${PREFIX}-nav-btn`;
        launcherEl.textContent = "Widget Panel";
        launcherEl.addEventListener("click", () => panelEl.classList.add(`${PREFIX}-open`));
        document.body.appendChild(launcherEl);

        panelEl = document.createElement("div");
        panelEl.id = `${PREFIX}-wrapper`;
        panelEl.innerHTML = `
          <div id="${PREFIX}-sidebar">
            <div class="${PREFIX}-brand">Widget Engine</div>
            <div class="${PREFIX}-nav-item ${PREFIX}-active">⚙️ Configuration Matrix</div>
          </div>
          <div id="${PREFIX}-container">
            <div id="${PREFIX}-header">
              <h1>Discord Profile Widget Configurator</h1>
              <button class="${PREFIX}-close-btn" id="${PREFIX}-close">Close App</button>
            </div>
            <div id="${PREFIX}-content" class="${PREFIX}-scroll">
              <div id="${PREFIX}-note">🛡️ <strong>Automated System Core Active:</strong> Complete any required application authorization checkpoints or verification checks natively inside the Developer Portal view scope if requested .</div>
              
              <div class="${PREFIX}-section-card">
                <div class="${PREFIX}-card-title">Console Diagnostics Log</div>
                <div id="${PREFIX}-log" class="${PREFIX}-scroll"></div>
                <div class="${PREFIX}-control-row">
                  <button class="${PREFIX}-btn ${PREFIX}-btn-primary" id="${PREFIX}-start">▶ Run Full Setup</button>
                  <button class="${PREFIX}-btn" id="${PREFIX}-clear">Clear Terminal Logs</button>
                  <button class="${PREFIX}-btn" id="${PREFIX}-tab" title="Force inject 'Widget' navigation link back into Sidebar">Enable Sidebar Tab</button>
                  <span id="${PREFIX}-status" style="margin-left: auto; font-size: 13px; color: #949ba4; font-weight: 500;">Engine Status: <span style="color:#23a55a;">● Idle</span></span>
                </div>
              </div>

              <div class="${PREFIX}-section-card">
                <div class="${PREFIX}-card-title">Data Blueprint Object Repository</div>
                <textarea id="${PREFIX}-json" placeholder='Paste shared widget data objects here or click "Export Structure" to scan active frames .'></textarea>
                <div class="${PREFIX}-control-row">
                  <select id="${PREFIX}-target">
                    <option value="new" disabled selected style="color: #80848e;">🔒 Create a new app (Coming Soon! Please create an app manually and then load your apps here to import!)</option>
                  </select>
                  <button class="${PREFIX}-btn" id="${PREFIX}-load">⟳ Query App Registry</button>
                </div>
                <div class="${PREFIX}-control-row" style="margin-bottom: 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; margin-top: 4px;">
                  <button class="${PREFIX}-btn ${PREFIX}-btn-blurple" id="${PREFIX}-export">⬇ Export Structure</button>
                  <button class="${PREFIX}-btn" id="${PREFIX}-import">⬆ Import Structure</button>
                  <button class="${PREFIX}-btn" id="${PREFIX}-refresh">↻ Hot-Reload Configuration</button>
                </div>
              </div>

              <div id="${PREFIX}-fallback">
                <p style="margin: 0 0 8px 0; font-weight: 700; color: #f23f43;">⚠️ Identity Integration Sync Blocked</p>
                <span style="font-size: 13px; color: #dbdee1;">Execute the dynamic backend pipeline package from an elevated terminal session (PowerShell for Windows Shell environments) to bypass sync limits :</span>
                <textarea id="${PREFIX}-fallback-text" readonly></textarea>
                <button class="${PREFIX}-btn" id="${PREFIX}-copy" style="margin-top: 12px; background: #f23f43;">Copy Payload Command </button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(panelEl);

        logEl = panelEl.querySelector(`#${PREFIX}-log`);
        startBtn = panelEl.querySelector(`#${PREFIX}-start`);
        statusEl = panelEl.querySelector(`#${PREFIX}-status`);
        jsonEl = panelEl.querySelector(`#${PREFIX}-json`);
        targetEl = panelEl.querySelector(`#${PREFIX}-target`);
        fallbackWrap = panelEl.querySelector(`#${PREFIX}-fallback`);
        fallbackText = panelEl.querySelector(`#${PREFIX}-fallback-text`);

        panelEl.querySelector(`#${PREFIX}-close`).addEventListener("click", () => panelEl.classList.remove(`${PREFIX}-open`));
        panelEl.querySelector(`#${PREFIX}-clear`).addEventListener("click", () => { logEl.innerHTML = ""; fallbackWrap.classList.remove(`${PREFIX}-open`); });
        panelEl.querySelector(`#${PREFIX}-copy`).addEventListener("click", () => copyFallback());

        log("Ready to build. Create a dynamic configuration layout profile .", "info");
      }

      function log(msg, level = "info") {
        const line = document.createElement("div");
        const colors = { info: "#949ba4", step: "#5865f2", success: "#23a55a", warn: "#f0b232", error: "#f23f43" };
        line.style.color = colors[level] || colors.info;
        line.style.padding = "3px 0";
        line.innerHTML = `<span style="color: #4e5058; margin-right: 8px;">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
        if (logEl) { logEl.appendChild(line); logEl.scrollTop = logEl.scrollHeight; }
      }

      function setStatus(text, color = "#23a55a") { if (statusEl) statusEl.innerHTML = `Engine Status: <span style="color: ${color};">● ${text}</span>`; }
      function setRunning(state) {
        running = state;
        if (startBtn) { startBtn.disabled = state; startBtn.textContent = state ? "Processing Vectors..." : "▶ Run Full Setup"; }
        ["export", "import", "refresh", "tab", "load", "target"].forEach((id) => {
          const b = document.getElementById(`${PREFIX}-${id}`);
          if (b) b.disabled = state;
        });
      }
      function isRunning() { return running; }
      function getJson() { return jsonEl ? jsonEl.value : ""; }
      function setJson(t) { if (jsonEl) jsonEl.value = t; }
      function getTarget() { return targetEl ? targetEl.value : "new"; }
      
      function setTargetOptions(apps) {
        if (!targetEl) return;
        const current = targetEl.value;
        while (targetEl.options.length > 1) targetEl.remove(1);
        apps.forEach((a) => {
          const o = document.createElement("option");
          o.value = a.id;
          o.textContent = `🧩 ${a.name || "App"} (${a.id})`;
          targetEl.appendChild(o);
        });
        if ([].some.call(targetEl.options, (o) => o.value === current)) targetEl.value = current;
      }

      function showFallback(command) {
        if (!fallbackWrap) return;
        fallbackText.value = command;
        fallbackWrap.classList.add(`${PREFIX}-open`);
      }

      async function copyFallback() {
        const btn = document.getElementById(`${PREFIX}-copy`);
        try {
          await navigator.clipboard.writeText(fallbackText.value);
          if (btn) { btn.textContent = "Payload Extracted!"; setTimeout(() => (btn.textContent = "Copy Payload Command "), 1500); }
        } catch (e) {
          fallbackText.focus(); fallbackText.select();
        }
      }

      function onStart(handler) { startBtn.addEventListener("click", () => { if (!running) handler(); }); }
      function bindButton(id, handler) {
        const btn = document.getElementById(`${PREFIX}-${id}`);
        if (btn) btn.addEventListener("click", () => handler());
      }

      return { build, log, setStatus, setRunning, isRunning, getJson, setJson, getTarget, setTargetOptions, showFallback, onStart, bindButton };
    })();

    function buildSurfaces() {
      const stats = {};
      for (let i = 1; i <= 6; i++) {
        stats[`stat_${i}`] = {
          fields: {
            value: { presentation_type: "text", value_type: "custom_string", value: `text ${i} here` },
            label: { presentation_type: "text", value_type: "custom_string", value: `label ${i} here` },
          },
        };
      }
      return {
        surfaces: {
          widget_top: {
            layout: "widget_top_hero",
            components: {
              hero_image: { fields: { image: { presentation_type: "image", value_type: "data", value: "change this to an image" } } },
              title: { fields: { text: { presentation_type: "text", value_type: "custom_string", value: "some title here" } } },
            },
          },
          widget_bottom: { layout: "widget_bottom_stats", components: stats },
          add_widget_preview: {
            layout: "add_widget_preview_hero",
            components: { hero_image: { fields: { image: { presentation_type: "image", value_type: "data", value: "change this to an image" } } } },
          },
        },
      };
    }

    function buildPowershell(appId, userId, botToken) {
      const body = JSON.stringify({ data: { dynamic: [] } });
      return (
        `Invoke-RestMethod -Method PATCH -Headers @{"Content-Type"="application/json"; ` +
        `"Authorization"="Bot ${botToken}";"User-Agent"="DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)"} ` +
        `-Uri https://discord.com/api/v9/applications/${appId}/users/${userId}/identities/0/profile -Body '${body}'`
      );
    }

    function currentAppId() {
      const m = location.pathname.match(/\/applications\/(\d+)/);
      return m ? m[1] : null;
    }

    function extractSurfacesBody(json) {
      if (!json || typeof json !== "object") return null;
      if (json.surfaces && typeof json.surfaces === "object") return { surfaces: json.surfaces };
      const surfaceKeys = ["widget_top", "widget_bottom", "add_widget_preview"];
      if (surfaceKeys.some((k) => k in json)) return { surfaces: json };
      return null;
    }

    function readJsonBox() {
      const raw = UI.getJson().trim();
      if (!raw) { UI.log("Paste target widget JSON schematic into workspace buffer .", "warn"); return null; }
      try { return JSON.parse(raw); }
      catch (e) { UI.log("Syntax validation error: " + e.message, "error"); return null; }
    }

    function describeErr(e) {
      if (!e) return "unknown structural exception";
      let s = "";
      if (e.status) s += "HTTP Status " + e.status;
      if (e.body) { try { s += " Payload " + JSON.stringify(e.body); } catch (x) {} }
      else if (e.message) s += (s ? " " : "") + e.message;
      return s || String(e);
    }

    function walkAssetFields(node, cb) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) { for (const item of node) walkAssetFields(item, cb); return; }
      if (node.value_type === "application_asset" && typeof node.value === "string" && node.value) {
        cb(node); return;
      }
      for (const key of Object.keys(node)) walkAssetFields(node[key], cb);
    }

    function collectAssetNames(surfaces) {
      const names = new Set();
      walkAssetFields(surfaces, (n) => names.add(n.value));
      return names;
    }

    function remapSurfaceAssets(surfaces, remap) {
      if (!remap || !Object.keys(remap).length) return surfaces;
      const clone = JSON.parse(JSON.stringify(surfaces));
      walkAssetFields(clone, (n) => { if (remap[n.value] != null) n.value = remap[n.value]; });
      return clone;
    }
    
    const assetName = (a) => a ? (a.key != null ? a.key : a.name) : undefined;
    const assetId = (a) => a ? (a.asset_id != null ? a.asset_id : a.id) : undefined;
    function extForContentType(ct) {
      switch (ct) {
        case "image/jpeg": return "jpg";
        case "image/gif": return "gif";
        case "image/webp": return "webp";
        default: return "png";
      }
    }

    function blobToDataUrl(blob) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error("binary content read error"));
        fr.readAsDataURL(blob);
      });
    }

    async function fetchAssetDataUrl(appId, id, contentType) {
      const ext = extForContentType(contentType);
      const res = await fetch(`https://cdn.discordapp.com/app-assets/${appId}/${id}.${ext}`, { credentials: "omit" });
      if (!res.ok) throw new Error("Asset Fetch HTTP Exception " + res.status);
      return blobToDataUrl(await res.blob());
    }

    function getInternals() {
      if (typeof window.webpackChunkdiscord_developers === "undefined") {
        throw new Error("Discord Engine Module Bundle is absent. Allow portal core initialization dependencies to populate fully.");
      }
      const wpRequire = window.webpackChunkdiscord_developers.push([["dwc_" + Math.random()], {}, (r) => r]);
      window.webpackChunkdiscord_developers.pop();
      const find = (pred, name) => {
        const mod = Object.values(wpRequire.c).find(pred);
        if (!mod) throw new Error(`Internal binding error for ${name}.`);
        return mod;
      };
      return {
        ApexStore: find((x) => x?.exports?.A?.createOverride, "ApexStore").exports.A,
        UserStore: find((x) => x?.exports?.A?.__proto__?.getCurrentUser, "UserStore").exports.A,
        FluxDispatcher: find((x) => x?.exports?.A?.__proto__?.flushWaitQueue, "FluxDispatcher").exports.A,
        api: find((x) => x?.exports?.Bo?.get, "API Engine").exports.Bo,
      };
    }

    async function apiCall(api, method, opts, label) {
      UI.log(label + "...", "step");
      try { return await api[method](opts); }
      catch (e) {
        let detail = "";
        if (e && e.status) detail += ` HTTP ${e.status}`;
        if (e && e.body) { try { detail += " Response: " + JSON.stringify(e.body); } catch (x) {} }
        const err = new Error(`${label} execution failure:${detail || " " + String(e)}`);
        err.cause = e; throw err;
      }
    }

    async function fetchConfig(api, appId) {
      const listRes = await apiCall(api, "get", { url: `/applications/${appId}/widget-configs` }, "Querying existing profile widget matrices ");
      let b = listRes.body;
      let cfg = Array.isArray(b) ? b[0] : (b && Array.isArray(b.configs) ? b.configs[0] : b);
      if (cfg && cfg.config_id && !cfg.surfaces) {
        try {
          const full = await apiCall(api, "get", { url: `/applications/${appId}/widget-configs/${cfg.config_id}` }, "Fetching mapping blueprints ");
          cfg = full.body || cfg;
        } catch (e) {}
      }
      return cfg;
    }

    async function getAppAssets(api, appId) {
      const paths = [`/applications/${appId}/assets`, `/oauth2/applications/${appId}/assets`];
      let lastErr;
      for (const url of paths) {
        try {
          const res = await api.get({ url });
          const b = res && res.body;
          return Array.isArray(b) ? b : (b && Array.isArray(b.assets) ? b.assets : []);
        } catch (e) { lastErr = e; if (!(e && e.status === 404)) throw e; }
      }
      throw lastErr || new Error("Asset structural configuration reading blocked");
    }

    async function uploadAsset(api, appId, name, dataUrl, contentType) {
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const ext = extForContentType(contentType || blob.type);
      const slotRes = await api.post({ url: `/applications/${appId}/assets/upload`, body: { filename: `${name}.${ext}`, file_size: blob.size } });
      const slot = slotRes && slotRes.body;
      if (!slot || !slot.upload_url || !slot.upload_filename) throw new Error("Endpoint verification signature absent");
      const put = await fetch(slot.upload_url, { method: "PUT", body: blob });
      if (!put.ok) throw new Error("Binary storage transmission execution error: HTTP " + put.status);
      const regRes = await api.post({ url: `/applications/${appId}/assets`, body: { key: name, upload_filename: slot.upload_filename, visibility: "public" } });
      return regRes && regRes.body;
    }

    function bridgeFinalize(appId, userId, botToken) {
      return new Promise((resolve) => {
        const id = "dwc-" + Math.random().toString(36).slice(2);
        const timer = setTimeout(() => {
          window.removeEventListener("message", onMsg);
          resolve({ ok: false, status: 0, body: "Userscript interface synchronization timeout[cite: 4]." });
        }, 20000);
        function onMsg(e) {
          if (e.source !== window) return;
          const d = e.data;
          if (!d || d.__dwc !== true || d.type !== "finalizeResult" || d.id !== id) return;
          clearTimeout(timer);
          window.removeEventListener("message", onMsg);
          resolve({ ok: !!d.ok, status: d.status, body: d.body });
        }
        window.addEventListener("message", onMsg);
        window.postMessage({ __dwc: true, type: "finalize", id, appId, userId, botToken }, location.origin);
      });
    }

    async function buildAssetBundle(api, appId, surfaces) {
      const names = collectAssetNames(surfaces);
      if (!names.size) return null;
      UI.log(`Located unique assets (${names.size}) — parsing into memory buffers...`, "step");
      let list;
      try { list = await getAppAssets(api, appId); }
      catch (e) { UI.log("Asset structure reading failure: " + describeErr(e), "warn"); return null; }
      const byName = new Map(list.map((a) => [assetName(a), a]));
      const bundle = {};
      let ok = 0;
      for (const name of names) {
        const asset = byName.get(name);
        const aid = assetId(asset);
        if (!aid) continue;
        try {
          const ct = asset.metadata && asset.metadata.content_type;
          bundle[name] = {
            asset_type: asset.asset_type != null ? asset.asset_type : (asset.type != null ? asset.type : "image"),
            content_type: ct || "image/png",
            image: await fetchAssetDataUrl(appId, aid, ct),
          };
          ok++;
        } catch (e) {}
      }
      if (ok) UI.log(`Successfully mapped assets (${ok}) into runtime package matrix .`, "success");
      return Object.keys(bundle).length ? bundle : null;
    }

    async function materializeAssets(api, appId, assets) {
      const names = assets ? Object.keys(assets) : [];
      if (!names.length) return null;
      UI.log(`Preparing image deployment (${names.length}) inside app cluster ${appId}...`, "step");
      let existing = [];
      try { existing = await getAppAssets(api, appId); } catch (e) {}
      const existingByName = new Map(existing.map((a) => [assetName(a), a]));
      const remap = {};
      let uploaded = 0, reused = 0;
      for (const name of names) {
        if (existingByName.has(name)) { remap[name] = name; reused++; continue; }
        const entry = assets[name];
        const image = typeof entry === "string" ? entry : (entry && entry.image);
        const contentType = (entry && typeof entry === "object" && entry.content_type) || null;
        if (!image) continue;
        try {
          const asset = await uploadAsset(api, appId, name, image, contentType);
          remap[name] = assetName(asset) || name;
          uploaded++;
        } catch (e) { UI.log(`Image cluster component upload execution block "${name}": ${describeErr(e)}`, "warn"); }
      }
      UI.log(`Asset matrix integration resolved. Synchronized: ${uploaded}, Existing: ${reused}. `, "success");
      return remap;
    }

    async function runFlow(opts) {
      if (UI.isRunning()) return;
      UI.setRunning(true); UI.setStatus("Active Operation", "#5865f2");
      try {
        await createWidget(opts || {});
        UI.setStatus("Idle", "#23a55a");
      } catch (err) {
        UI.log(`CRITICAL CONTEXT ERROR: ${err && err.message ? err.message : err}`, "error");
        UI.setStatus("Failed Execution", "#f23f43");
      } finally { UI.setRunning(false); }
    }

    async function createWidget(opts) {
      UI.log("Binding to portal processing cores ...", "step");
      const { ApexStore, UserStore, FluxDispatcher, api } = getInternals();
      const userId = UserStore.getCurrentUser().id;
      UI.log(`Account context authorized: User Identity ${userId}. `, "info");

      const displayName = opts.displayName || "My Profile Widget";
      const surfacesBody = opts.surfaces || buildSurfaces();

      const appRes = await apiCall(api, "post", { url: "/applications", body: { name: "Interactive Widget Instance", team_id: null } }, "Provisioning application endpoint registry ");
      FluxDispatcher.dispatch({ type: "APPLICATION_CREATE_SUCCESS", application: appRes.body });
      const appId = appRes.body.id;
      UI.log(`Registry entry established. Application ID: ${appId}. `, "success");

      await apiCall(api, "post", {
        url: `/applications/${appId}/social-sdk/enable`,
        body: {
          name: "a", business_email: "foo@bar.com", game_or_studio_name: "a", game_or_studio_url: "",
          email_updates_consent: false, country_or_region: "United States", title_role: "Founder",
          target_platforms: [], form_type: "Dev Solutions", sfdc_leadsource: "Dev Portal", utm_campaign: "SDK Enable Form",
        },
      }, "Enabling Core Social Presence SDK interface layers ");

      const configRes = await apiCall(api, "post", { url: `/applications/${appId}/widget-configs`, body: { display_name: displayName } }, "Initializing surface configuration container models ");
      const configId = configRes.body.config_id;
      lastApp = { appId, configId };
      let layoutBody = surfacesBody;
      if (opts.assets) {
        const remap = await materializeAssets(api, appId, opts.assets);
        layoutBody = { surfaces: remapSurfaceAssets(surfacesBody.surfaces, remap) };
      }
      await apiCall(api, "patch", { url: `/applications/${appId}/widget-configs/${configId}`, body: layoutBody }, "Injecting operational node layer configurations ");
      await apiCall(api, "post", { url: `/applications/${appId}/widget-configs/${configId}/publish` }, "Broadcasting state layout mappings to CDN nodes ");

      await apiCall(api, "patch", { url: `/applications/${appId}`, body: { redirect_uris: ["https://discord.com"] } }, "Configuring routing maps ");
      await apiCall(api, "post", { url: `/oauth2/authorize?client_id=${appId}&response_type=token&scope=sdk.social_layer_presence`, body: { authorize: true } }, "Muxing security scope layers ");
      
      const profileRes = await apiCall(api, "get", { url: `/users/${userId}/profile` }, "Querying master global user profile container state ");
      const existingWidgets = profileRes.body.widgets || [];
      existingWidgets.unshift({ data: { type: "application", application_id: appId } });
      await apiCall(api, "put", { url: `/users/@me/widgets`, body: { widgets: existingWidgets } }, "Binding application viewport instance onto global account presence matrix ");

      const botTokenRes = await apiCall(api, "post", { url: `/applications/${appId}/bot/reset` }, "Minting privileged application network synchronization keys ");
      const botToken = botTokenRes.body.token;

      UI.log("Synchronizing background system configuration structures ...", "step");
      const result = await bridgeFinalize(appId, userId, botToken);
      if (result.ok) {
        UI.log("Background synchronization completed successfully .", "success");
      } else {
        UI.log(`Background network execution blocked: Status ${result.status} `, "error");
        UI.showFallback(buildPowershell(appId, userId, botToken));
      }

      UI.log("Synchronizing sidebar navigation states...", "step");
      try {
        ApexStore.createOverride(WIDGET_EXPERIMENT, 1);
        document.querySelector(`a[href="/developers/applications/${appId}"]`)?.click();
        for (let i = 0; i < 50 && !document.querySelector(`a[href="/developers/applications/${appId}/widget"]`); i++) await sleep(100);
        document.querySelector(`a[href="/developers/applications/${appId}/widget"]`)?.click();
        UI.log("Interface synchronized. System components active.", "success");
      } catch (e) { UI.log(`Sidebar layout force-injection skipped.`, "warn"); }

      UI.log(`Operation fully resolved. Target Application Identifier: ${appId} `, "success");
    }

    async function applyToApp(api, appId, body, assets) {
      let configId = (lastApp && lastApp.appId === appId) ? lastApp.configId : null;
      if (!configId) {
        const cfg = await fetchConfig(api, appId);
        configId = cfg && cfg.config_id;
      }
      if (!configId) {
        const configRes = await apiCall(api, "post", { url: `/applications/${appId}/widget-configs`, body: { display_name: "Profile Widget Setup" } }, "Provisioning uninitialized mapping models ");
        configId = configRes.body.config_id;
      }
      lastApp = { appId, configId };
      let outBody = body;
      if (assets && Object.keys(assets).length) {
        const remap = await materializeAssets(api, appId, assets);
        outBody = { surfaces: remapSurfaceAssets(body.surfaces, remap) };
      }
      await apiCall(api, "patch", { url: `/applications/${appId}/widget-configs/${configId}`, body: outBody }, "Hot-swapping component structure rules ");
      await apiCall(api, "post", { url: `/applications/${appId}/widget-configs/${configId}/publish` }, "Baking production assets into edge nodes ");
    }

    function importWidget() {
      if (UI.isRunning()) return;
      const json = readJsonBox(); if (!json) return;
      const body = extractSurfacesBody(json);
      if (!body) { UI.log("Validation structural failure: Top-level data objects are corrupt .", "error"); return; }
      const target = UI.getTarget();
      if (target === "new") {
        UI.log("Compiling setup task vectors from structural schematic imports...", "step");
        runFlow({ surfaces: body, displayName: json.display_name, assets: json.assets });
      } else {
        importToExisting(target, body, json.assets);
      }
    }

    async function importToExisting(appId, body, assets) {
      if (UI.isRunning()) return;
      UI.setRunning(true); UI.setStatus("Patching Matrix", "#5865f2");
      try {
        const { api } = getInternals();
        UI.log("Locating application parameters inside target element ...", "step");
        await applyToApp(api, appId, body, assets);
        UI.log("Application matrix state synchronized successfully. ✔ ", "success");
        UI.setStatus("Idle", "#23a55a");
      } catch (err) { UI.log(`Hot-patch failed: ${err.message}`, "error"); UI.setStatus("Failed Execution", "#f23f43");
      } finally { UI.setRunning(false); }
    }

    async function refreshWidget() {
      if (UI.isRunning()) return;
      const json = readJsonBox(); if (!json) return;
      const body = extractSurfacesBody(json); if (!body) return;
      UI.setRunning(true); UI.setStatus("Swapping Blueprints", "#e17055");
      try {
        const { api } = getInternals();
        const appId = currentAppId() || (lastApp && lastApp.appId);
        if (!appId) throw new Error("Initialize configuration context by choosing an application panel node first .");
        await applyToApp(api, appId, body, json.assets);
        UI.log("Dynamic state configuration arrays cleared and updated. ✔ ", "success");
        UI.setStatus("Idle", "#23a55a");
      } catch (err) { UI.log(`Reload action abort execution: ${err.message}`, "error"); UI.setStatus("Failed Execution", "#f23f43");
      } finally { UI.setRunning(false); }
    }

    async function loadWidgetList() {
      if (UI.isRunning()) return;
      UI.setRunning(true); UI.setStatus("Polling Registry", "#5865f2");
      try {
        const { api } = getInternals();
        const res = await apiCall(api, "get", { url: "/applications" }, "Downloading account identity application maps ");
        const raw = Array.isArray(res.body) ? res.body : (res.body && Array.isArray(res.body.applications) ? res.body.applications : []);
        const apps = raw.filter((a) => a && a.id).map((a) => ({ id: a.id, name: a.name }));
        UI.setTargetOptions(apps);
        UI.log(`Mapped active applications (${apps.length}) into configuration routing registers .`, "success");
        UI.setStatus("Idle", "#23a55a");
      } catch (err) { UI.log(`Failed to fetch applications structural map: ${err.message}`, "error"); UI.setStatus("Failed Execution", "#f23f43");
      } finally { UI.setRunning(false); }
    }

    async function exportWidget() {
      if (UI.isRunning()) return;
      UI.setRunning(true); UI.setStatus("Extracting Layout", "#5865f2");
      try {
        const { api } = getInternals();
        const appId = currentAppId() || (lastApp && lastApp.appId);
        if (!appId) throw new Error("Select an existing app inside the developer tree path to perform extraction .");
        UI.log(`Reassembled schema arrays for target element structure ${appId} ...`, "step");
        const cfg = await fetchConfig(api, appId);
        if (!cfg || !cfg.surfaces) throw new Error("Operational layout rules missing or map array is blank .");
        if (cfg.config_id) lastApp = { appId, configId: cfg.config_id };
        const assets = await buildAssetBundle(api, appId, cfg.surfaces);
        const envelope = { _type: "discord-widget", version: 2, display_name: cfg.display_name || "Extracted Design System", surfaces: cfg.surfaces };
        if (assets) envelope.assets = assets;
        UI.setJson(JSON.stringify(envelope, null, 2));
        UI.log("Extraction resolved. Schematic tree serialized to operational clipboard buffer .", "success");
        UI.setStatus("Idle", "#23a55a");
      } catch (err) { UI.log(`Extraction operations failure: ${err.message}`, "error"); UI.setStatus("Failed Execution", "#f23f43");
      } finally { UI.setRunning(false); }
    }

    async function ensureWidgetTab(announce) {
      for (let attempt = 0; attempt < 40; attempt++) {
        try {
          const { ApexStore } = getInternals();
          ApexStore.createOverride(WIDGET_EXPERIMENT, 1);
          if (announce) UI.log("Forced interface feature flag constraints overrides into memory registry .", "success");
          return true;
        } catch (e) { await sleep(200); }
      }
      if (announce) UI.log("Feature flag injection engine timeline exception: Hooks unresolved .", "warn");
      return false;
    }

    async function reactivateWidgetTab() {
      if (UI.isRunning()) return;
      UI.log("Running interface sidebar node injection pipeline ...", "step");
      if (!(await ensureWidgetTab(true))) return;
      const appId = currentAppId();
      const widgetLink = () => document.querySelector(`a[href="/developers/applications/${appId}/widget"]`);
      if (appId && !widgetLink()) {
        document.querySelector(`a[href="/developers/applications/${appId}"]`)?.click();
        for (let i = 0; i < 40 && !widgetLink(); i++) await sleep(100);
      }
      if (!appId) UI.log("Override matrix updated globally. Enter any app configuration page .", "success");
      else if (widgetLink()) UI.log("Interface node verified inside target sidebar layout tree .", "success");
      else UI.log("Node verification exception. Manually cycle page index routes to map state templates .", "warn");
    }

    const overridePromise = ensureWidgetTab(false);

    function boot() {
      UI.build();
      UI.onStart(() => runFlow({}));
      UI.bindButton("export", exportWidget);
      UI.bindButton("import", importWidget);
      UI.bindButton("refresh", refreshWidget);
      UI.bindButton("load", loadWidgetList);
      UI.bindButton("tab", reactivateWidgetTab);
      overridePromise.then((ok) => {
        if (ok) UI.log("Natively patched sidebar dynamic navigation layers (re-linked after memory flash) .", "success");
      });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  const script = document.createElement("script");
  script.textContent = `(${injectedMainWorldScript.toString()})();`;
  document.documentElement.appendChild(script);
})();
