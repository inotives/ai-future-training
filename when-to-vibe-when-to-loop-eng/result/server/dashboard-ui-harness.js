import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transformWithEsbuild } from "vite";

function createLeafletStub(stats) {
  const map = {
    setView() { return this; },
    getCenter() { return [1.3521, 103.8198]; },
    getZoom() { return 10; },
    remove() { stats.removals += 1; },
  };
  const layer = {
    addTo() { return this; },
    bindTooltip() { return this; },
    bindPopup() { return this; },
    on() { return this; },
  };
  return {
    map: () => { stats.creations += 1; return map; },
    tileLayer: () => layer,
    circleMarker: () => layer,
  };
}

async function callHandler(handler, url, method = "GET") {
  let status;
  let body;
  await new Promise(resolve => handler({ url, method }, {
    writeHead(value) { status = value; },
    end(value) { body = JSON.parse(value); resolve(); },
  }));
  return { status, body };
}

/** Run the real TypeScript dashboard entrypoint against a small DOM/Leaflet test surface. */
export async function renderDashboardWithApiHandler(handler, initialStorage = {}) {
  const apiSource = await readFile(new URL("../src/data/dashboard-api.ts", import.meta.url), "utf8");
  const apiCompiled = await transformWithEsbuild(apiSource, "src/data/dashboard-api.ts", { loader: "ts", format: "cjs" });

  const listeners = new Map();
  let html = "";
  let refreshStatusText = "";
  let refreshStatusWrites = 0;
  const refreshStatus = {
    get textContent() { return refreshStatusText; },
    set textContent(value) { refreshStatusText = String(value); refreshStatusWrites += 1; },
  };
  const app = {
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      const match = html.match(/<span id="refresh-status"[^>]*>(.*?)<\/span>/);
      if (match) refreshStatusText = match[1];
    },
    querySelector(selector) {
      if (selector === "#auto-refresh-toggle") return { addEventListener(type, callback) { listeners.set(selector, callback); } };
      if (selector === "#refresh-status") return refreshStatus;
      return { classList: { add() {} }, addEventListener() {} };
    },
    querySelectorAll() { return []; },
  };
  const fetchCalls = [];
  const fetch = async (url, options = {}) => {
    const method = options.method ?? "GET";
    fetchCalls.push({ url, method });
    const result = await callHandler(handler, url, method);
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
    };
  };
  const apiModule = { exports: {} };
  const apiContext = vm.createContext({
    module: apiModule,
    exports: apiModule.exports,
    fetch,
  });
  vm.runInContext(apiCompiled.code, apiContext, { filename: "dashboard-api.compiled.cjs" });

  const intervals = [];
  const timeouts = [];
  const mapStats = { creations: 0, removals: 0 };
  const window = {
    setInterval(callback, delay) { intervals.push({ callback, delay, active: true }); return intervals.length; },
    clearInterval(id) { if (intervals[id - 1]) intervals[id - 1].active = false; },
    setTimeout(callback, delay) { timeouts.push({ callback, delay, active: true }); return timeouts.length; },
    clearTimeout(id) { if (timeouts[id - 1]) timeouts[id - 1].active = false; },
    addEventListener() {},
  };
  const localStorage = {
    getItem: key => initialStorage[key] ?? null,
    setItem(key, value) { initialStorage[key] = String(value); },
  };
  const document = { querySelector: selector => selector === "#app" ? app : null };
  let mainSource = await readFile(new URL("../src/main.ts", import.meta.url), "utf8");
  mainSource = mainSource
    .replace(/^import "\.\/style\.css";\s*$/m, "")
    .replace(/^import L from "leaflet";\s*$/m, "const L = globalThis.__leaflet;")
    .replace(/^import \{[^}]+\} from "\.\/data\/dashboard-api";\s*$/m, "const fetchDashboard = globalThis.__fetchDashboard;");
  const mainCompiled = await transformWithEsbuild(mainSource, "src/main.ts", { loader: "ts", format: "cjs" });
  const mainContext = vm.createContext({
    document,
    window,
    localStorage,
    fetch,
    __leaflet: createLeafletStub(mapStats),
    __fetchDashboard: apiModule.exports.fetchDashboard,
  });
  vm.runInContext(mainCompiled.code, mainContext, { filename: "main.compiled.cjs" });
  await new Promise(resolve => setImmediate(resolve));
  return {
    get html() { return app.innerHTML; },
    get intervalScheduled() { return intervals.some(interval => interval.active); },
    get intervals() { return intervals; },
    get timeouts() { return timeouts; },
    get mapStats() { return mapStats; },
    get refreshStatusText() { return refreshStatusText; },
    get refreshStatusWrites() { return refreshStatusWrites; },
    fetchCalls,
    storage: initialStorage,
    clickAutoRefresh() { listeners.get("#auto-refresh-toggle")?.(); },
    async tickAutoRefresh() {
      const timer = intervals.find(interval => interval.active && interval.delay === 5 * 60_000);
      if (timer) timer.callback();
      await new Promise(resolve => setImmediate(resolve));
    },
    async tickStartupSnapshotRetry() {
      const timer = timeouts.find(timeout => timeout.active && timeout.delay === 1_000);
      if (!timer) return false;
      timer.active = false;
      timer.callback();
      await new Promise(resolve => setImmediate(resolve));
      return true;
    },
  };
}
