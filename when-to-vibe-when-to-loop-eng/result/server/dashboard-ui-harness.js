import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transformWithEsbuild } from "vite";

function createLeafletStub() {
  const map = {
    setView() { return this; },
    getCenter() { return [1.3521, 103.8198]; },
    getZoom() { return 10; },
    remove() {},
  };
  const layer = {
    addTo() { return this; },
    bindTooltip() { return this; },
    bindPopup() { return this; },
    on() { return this; },
  };
  return {
    map: () => map,
    tileLayer: () => layer,
    circleMarker: () => layer,
  };
}

function callHandler(handler, url) {
  let status;
  let body;
  handler({ url, method: "GET" }, {
    writeHead(value) { status = value; },
    end(value) { body = JSON.parse(value); },
  });
  return { status, body };
}

/** Run the real TypeScript dashboard entrypoint against a small DOM/Leaflet test surface. */
export async function renderDashboardWithApiHandler(handler) {
  const apiSource = await readFile(new URL("../src/data/dashboard-api.ts", import.meta.url), "utf8");
  const apiCompiled = await transformWithEsbuild(apiSource, "src/data/dashboard-api.ts", { loader: "ts", format: "cjs" });

  const app = {
    innerHTML: "",
    querySelector() { return { classList: { add() {} }, addEventListener() {} }; },
    querySelectorAll() { return []; },
  };
  const fetch = async url => {
    const result = callHandler(handler, url);
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

  let intervalCallback;
  const window = {
    setInterval(callback) { intervalCallback = callback; return 1; },
    clearInterval() {},
    addEventListener() {},
  };
  const localStorage = { getItem: () => null, setItem() {} };
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
    __leaflet: createLeafletStub(),
    __fetchDashboard: apiModule.exports.fetchDashboard,
  });
  vm.runInContext(mainCompiled.code, mainContext, { filename: "main.compiled.cjs" });
  await new Promise(resolve => setImmediate(resolve));
  return { html: app.innerHTML, intervalScheduled: typeof intervalCallback === "function" };
}
