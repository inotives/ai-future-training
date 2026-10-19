import "./style.css";
import L from "leaflet";
import { fetchDashboard, type AirQualityMetric, type DashboardReading, type DashboardResponse } from "./data/dashboard-api";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root element #app was not found.");

type Metric = AirQualityMetric;
const labels: Record<string, string> = { north: "North", south: "South", east: "East", west: "West", central: "Central" };
const saved = (() => { try { return JSON.parse(localStorage.getItem("airwatch-selection") ?? "{}"); } catch { return {}; } })();
let selected = ["north", "south", "east", "west", "central"].includes(saved.region) ? saved.region as string : "central";
let measure: Metric = saved.measure === "pm25" ? "pm25" : "psi";
let data: DashboardResponse | undefined;
let loading = true;
let requestError = "";
let map: L.Map | undefined;
let mapView: { center: L.LatLng; zoom: number } | undefined;
let requestSequence = 0;
let autoRefreshEnabled = localStorage.getItem("airwatch-auto-refresh") === "true";
let autoRefreshTimer: number | undefined;
let checkInFlight: Promise<void> | undefined;
let lastCheckAt = "";
let autoRefreshError = "";
let startupSnapshotTimer: number | undefined;
let startupSnapshotRetries = 0;
let startupPollPending = false;
const STARTUP_SNAPSHOT_RETRY_MS = 1_000;
const MAX_STARTUP_SNAPSHOT_RETRIES = 45;

const regions = () => data?.regions ?? [];
const reading = (metric: Metric, region: string): DashboardReading | null => data?.metrics[metric].latestByRegion[region] ?? null;
const maximum = (metric: Metric) => regions().map(region => ({ region, value: reading(metric, region.id) })).filter(item => item.value)
  .sort((a, b) => b.value!.value - a.value!.value)[0];
function psiCategory(value?: number) {
  if (value === undefined) return { label: "No PSI reading", className: "none", color: "#9aa39e" };
  if (value >= 301) return { label: "Hazardous", className: "hazardous", color: "#82578f" };
  if (value >= 201) return { label: "Very Unhealthy", className: "very-unhealthy", color: "#cf6259" };
  if (value >= 101) return { label: "Unhealthy", className: "unhealthy", color: "#d89a38" };
  return { label: "Good to Moderate", className: "good", color: "#739a70" };
}
function time(timestamp?: string | null, includeDate = false) {
  if (!timestamp) return "Unavailable";
  return new Intl.DateTimeFormat("en-SG", { ...(includeDate ? { day: "2-digit", month: "short" } : {}), hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore" }).format(new Date(timestamp)) + " SGT";
}
function freshness(value: DashboardReading | null) {
  if (!value) return { label: "No reading", className: "empty" };
  const state = value.freshness.state;
  return { label: `${state === "fresh" ? "Fresh" : "Stale"} · ${Math.floor(value.freshness.ageMinutes)} min`, className: state };
}
function trend(metric: Metric, region: string) {
  const samples = data?.metrics[metric].series24h ?? [];
  const width = 440, height = 126, pad = 14;
  const values = samples.flatMap(p => p.value === null ? [] : [p.value]);
  if (!values.length) return `<div class="chart-empty">No trend readings available.</div>`;
  const min = Math.min(...values), max = Math.max(...values);
  const point = (i: number, value: number) => `${pad + i * (width - pad * 2) / Math.max(1, samples.length - 1)},${height - pad - (value - min) * (height - pad * 2) / (max - min || 1)}`;
  const runs: number[][] = [];
  samples.forEach((sample, i) => { if (sample.value === null) return; const run = runs[runs.length - 1]; if (!run || i !== run[run.length - 1] + 1) runs.push([i]); else run.push(i); });
  const lines = runs.filter(run => run.length > 1).map(run => `<polyline points="${run.map(i => point(i, samples[i].value!)).join(" ")}"/>`).join("");
  const dots = samples.map((sample, i) => sample.value === null
    ? `<line class="gap-mark" x1="${pad + i * (width - pad * 2) / Math.max(1, samples.length - 1)}" y1="${pad}" x2="${pad + i * (width - pad * 2) / Math.max(1, samples.length - 1)}" y2="${height - pad}"/>`
    : `<circle cx="${point(i, sample.value).split(",")[0]}" cy="${point(i, sample.value).split(",")[1]}" r="4"/>`).join("");
  return `<svg class="trend" viewBox="0 0 ${width} ${height}" role="img" aria-label="24-hour ${metric === "psi" ? "PSI" : "PM2.5"} trend for ${labels[region] ?? region}"><line class="axis" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"/>${lines}${dots}</svg><div class="chart-times"><span>${time(samples[0]?.hour)}</span><span>${time(samples.at(-1)?.hour)}</span></div><p class="chart-note">24 hourly points · missing samples show as gaps; no values are interpolated.</p>`;
}
function hourlyAveragesPanel() {
  const rankings = (["psi", "pm25"] as Metric[]).map(metric => {
    const averages = data?.metrics[metric].hourlyAverages7d ?? [];
    const max = averages[0]?.average ?? 0;
    const rows = averages.map((item, index) => `<li><span class="hour-rank">${String(index + 1).padStart(2, "0")}</span><time>${String(item.hour).padStart(2, "0")}:00</time><span class="hour-track" aria-hidden="true"><i style="width:${max ? item.average / max * 100 : 0}%"></i></span><strong>${item.average.toFixed(1)}</strong><small>${item.daysWithReadings}/7</small></li>`).join("");
    return `<article class="hourly-rank ${metric}"><div class="hourly-rank-title"><h4>${metric === "psi" ? "24-hour PSI" : "1-hour PM2.5"}</h4><span>${metric === "psi" ? "INDEX" : "µg/m³"}</span></div><ol>${rows || `<li class="hour-empty">No hourly profile yet</li>`}</ol></article>`;
  }).join("");
  return `<section class="hourly-summary" aria-labelledby="hourly-average-title"><div class="hourly-summary-head"><div><div class="eyebrow">7-DAY HOURLY PROFILE</div><h3 id="hourly-average-title">Average by hour</h3></div><span>HIGHEST AVERAGE FIRST · SGT</span></div><div class="hourly-columns">${rankings}</div><p class="hourly-note">Each row averages readings from the same Singapore clock hour across the last seven days. The count shows days with available readings.</p></section>`;
}
function statePanel() {
  if (loading && !data) return `<section class="state-panel loading" role="status"><div class="state-icon">◌</div><div><h2>Loading air quality readings</h2><p>Connecting to the local dashboard data service.</p></div></section>`;
  const hasReadings = regions().some(region => reading("psi", region.id) || reading("pm25", region.id));
  const providerError = data?.metrics.psi.status.error || data?.metrics.pm25.status.error;
  if (requestError || providerError) {
    const detail = requestError || providerError;
    const message = hasReadings
      ? "The latest poll or refresh failed; stored values are retained."
      : "No readings are stored yet, and the latest upstream poll failed.";
    return `<section class="state-panel error" role="alert"><div class="state-icon">!</div><div><h2>${hasReadings ? "Showing last stored readings" : "No readings stored · provider error"}</h2><p>${message} ${detail ? escapeHtml(detail) : ""}</p></div></section>`;
  }
  if (startupPollPending) return `<section class="state-panel loading" role="status"><div class="state-icon">◌</div><div><h2>Waiting for the startup NEA check</h2><p>Checking the local database again shortly while startup ingestion finishes.</p></div></section>`;
  if (!hasReadings) return `<section class="state-panel empty-state" role="status"><div class="state-icon">i</div><div><h2>No readings stored yet</h2><p>Current readings will appear after the first successful NEA data.gov.sg poll.</p></div></section>`;
  return "";
}
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }

function refreshStatusText() {
  return autoRefreshError ? `Check failed: ${escapeHtml(autoRefreshError)}`
    : lastCheckAt ? `Last check ${time(lastCheckAt, true)}`
      : autoRefreshEnabled ? "Checking NEA…" : "Automatic checks are off";
}
function hasStoredReadings(snapshot: DashboardResponse) {
  return (["psi", "pm25"] as Metric[]).some(metric => Object.values(snapshot.metrics[metric].latestByRegion).some(Boolean));
}
function updateStartupSnapshotRetry(snapshot: DashboardResponse) {
  const attempts = [snapshot.metrics.psi.status.latestAttempt, snapshot.metrics.pm25.status.latestAttempt];
  const allCurrentAttemptsSettled = attempts.every(attempt => attempt && attempt.status !== "running");
  const startupPollIsRunning = attempts.some(attempt => attempt?.status === "running");
  const pending = !hasStoredReadings(snapshot) && startupPollIsRunning && !allCurrentAttemptsSettled && !requestError && startupSnapshotRetries < MAX_STARTUP_SNAPSHOT_RETRIES;
  startupPollPending = pending;
  if (!pending) {
    if (startupSnapshotTimer !== undefined) window.clearTimeout(startupSnapshotTimer);
    startupSnapshotTimer = undefined;
    if (hasStoredReadings(snapshot) || allCurrentAttemptsSettled) startupSnapshotRetries = 0;
    return;
  }
  if (startupSnapshotTimer === undefined) {
    startupSnapshotTimer = window.setTimeout(() => {
      startupSnapshotTimer = undefined;
      startupSnapshotRetries += 1;
      void refresh();
    }, STARTUP_SNAPSHOT_RETRY_MS);
  }
}
function updateRefreshStatus() {
  const status = app!.querySelector<HTMLSpanElement>("#refresh-status");
  if (status) status.textContent = refreshStatusText();
}

function render() {
  if (map) { mapView = { center: map.getCenter(), zoom: map.getZoom() }; map.remove(); map = undefined; }
  const psiMax = maximum("psi"), pmMax = maximum("pm25");
  const allReadings = regions().flatMap(region => [reading("psi", region.id), reading("pm25", region.id)]).filter((value): value is DashboardReading => Boolean(value));
  const newest = allReadings.sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  const staleCount = allReadings.filter(item => item.freshness.state === "stale").length;
  const state = statePanel();
  app!.innerHTML = `
    <main class="shell">
      <header class="topbar"><a class="brand" href="#" aria-label="Airwatch home"><span class="brand-mark">A</span><span>FIELDNOTES<span class="brand-sub">SINGAPORE / ENVIRONMENT</span></span></a><div class="header-meta"><span class="demo-pill live-pill"><i></i>NEA · data.gov.sg</span><span class="updated">${loading ? "UPDATING" : "OBSERVED"}<strong>${time(newest?.observedAt, true)}</strong></span></div></header>
      <section class="intro"><div><div class="eyebrow"><span class="eyebrow-line"></span>REGIONAL MONITORING / LIVE DATA</div><h1>Singapore air quality</h1><p>Regional PSI and PM2.5 observations from NEA via data.gov.sg. Readings reflect the latest available observation and do not independently confirm a haze event.</p></div><div class="source-meta"><span>Last data update ${time(data?.generatedAt, true)}</span><button id="auto-refresh-toggle" class="refresh-toggle ${autoRefreshEnabled ? "enabled" : ""}" type="button" role="switch" aria-checked="${autoRefreshEnabled}" aria-label="Auto refresh every five minutes">Auto refresh <span class="toggle-track" aria-hidden="true"><span></span></span><b>${autoRefreshEnabled ? "On" : "Off"}</b></button><span id="refresh-status" class="refresh-status" role="status" aria-live="polite">${refreshStatusText()}</span></div></section>
      <section class="metrics" aria-label="Regional summary">
        <article class="metric-card"><div class="metric-label">HIGHEST 24-HOUR PSI <span class="unit-chip">INDEX</span></div><div class="metric-value">${psiMax?.value?.value ?? "—"}<span class="metric-unit">PSI</span></div><div class="metric-foot">Latest available · observed ${time(psiMax?.value?.observedAt)}</div></article>
        <article class="metric-card accent"><div class="metric-label">REGION <span class="unit-chip">PSI PEAK</span></div><div class="metric-value region-value">${psiMax ? labels[psiMax.region.id] ?? psiMax.region.name : "—"}</div><div class="metric-foot">Source updated ${time(psiMax?.value?.sourceUpdatedAt)}</div></article>
        <article class="metric-card"><div class="metric-label">HIGHEST 1-HOUR PM2.5 <span class="unit-chip">µg/m³</span></div><div class="metric-value">${pmMax?.value?.value ?? "—"}<span class="metric-unit">µg/m³</span></div><div class="metric-foot">Observed ${time(pmMax?.value?.observedAt)}</div></article>
        <article class="metric-card"><div class="metric-label">DATA FRESHNESS <span class="unit-chip">${staleCount ? "STALE" : "LIVE"}</span></div><div class="metric-value freshness-value">${!newest ? "—" : staleCount ? "Stale" : "Fresh"}</div><div class="metric-foot">${newest ? `${staleCount} of ${allReadings.length} readings stale` : "Waiting for first reading"}</div></article>
      </section>
      ${state}
      <section class="workspace ${!data || !allReadings.length ? "muted" : ""}">
        <article class="panel map-panel"><div class="panel-heading"><div><div class="eyebrow">GEOGRAPHIC VIEW</div><h2>Regional readings</h2></div><div class="segmented" role="group" aria-label="Map measure"><button data-measure="psi" class="${measure === "psi" ? "active" : ""}" aria-pressed="${measure === "psi"}">PSI</button><button data-measure="pm25" class="${measure === "pm25" ? "active" : ""}" aria-pressed="${measure === "pm25"}">PM2.5</button></div></div><div id="map" aria-label="Map of Singapore showing regional air quality readings"></div><div class="map-foot"><span><i class="legend-dot"></i> Regional reference point</span><span>Source: NEA · data.gov.sg · Map © OpenStreetMap</span></div></article>
        <article class="panel regions-panel"><div class="panel-heading"><div><div class="eyebrow">LATEST BY REGION</div><h2>Singapore regions</h2></div><span class="list-count">${String(regions().length).padStart(2, "0")} REGIONS</span></div><div class="region-list">${regions().map(region => { const p = reading("psi", region.id), m = reading("pm25", region.id); const category = psiCategory(p?.value); return `<button class="region-row ${selected === region.id ? "selected" : ""}" data-region="${region.id}" aria-pressed="${selected === region.id}" aria-label="${labels[region.id] ?? region.name}: PSI ${p?.value ?? "no reading"}, ${category.label}; PM2.5 ${m?.value ?? "no reading"} µg/m³"><span class="region-name"><span class="region-pin psi-${category.className} ${selected === region.id ? "chosen" : ""}"></span>${labels[region.id] ?? region.name}</span><span class="region-reading"><strong>${p?.value ?? "—"}</strong><small>PSI</small></span><span class="region-reading pm"><strong>${m?.value ?? "—"}</strong><small>µg/m³</small></span><span class="row-chevron">›</span></button>`; }).join("")}</div><div class="list-legend"><span>24h PSI</span><span>1h PM2.5</span></div></article>
      </section>
      <section class="panel detail-panel"><div class="detail-title"><div><div class="eyebrow">REGION DETAIL</div><h2>${labels[selected] ?? regions().find(r => r.id === selected)?.name ?? selected} <span class="detail-coord">${regions().find(r => r.id === selected)?.latitude?.toFixed(3) ?? "—"}°N · ${regions().find(r => r.id === selected)?.longitude?.toFixed(3) ?? "—"}°E</span></h2></div><span class="selected-badge"><i></i>SELECTED REGION</span></div><div class="detail-grid"><article class="detail-reading"><div class="reading-head"><span>24-HOUR PSI</span><b>INDEX</b></div><div class="reading-number">${reading("psi", selected)?.value ?? "—"}<span>PSI</span></div><div class="reading-meta"><span>Observed ${time(reading("psi", selected)?.observedAt, true)}</span><span class="fresh-tag ${freshness(reading("psi", selected)).className}">${freshness(reading("psi", selected)).label}</span><span>Source updated ${time(reading("psi", selected)?.sourceUpdatedAt, true)}</span></div></article><article class="detail-reading pm-detail"><div class="reading-head"><span>1-HOUR PM2.5</span><b>µg/m³</b></div><div class="reading-number">${reading("pm25", selected)?.value ?? "—"}<span>µg/m³</span></div><div class="reading-meta"><span>Observed ${time(reading("pm25", selected)?.observedAt, true)}</span><span class="fresh-tag ${freshness(reading("pm25", selected)).className}">${freshness(reading("pm25", selected)).label}</span><span>Source updated ${time(reading("pm25", selected)?.sourceUpdatedAt, true)}</span></div></article><article class="trend-card"><div class="trend-head"><div><span>RECENT TREND</span><strong>${measure === "psi" ? "24-hour PSI" : "1-hour PM2.5"}</strong></div><div class="segmented mini" role="group" aria-label="Trend measure"><button data-measure="psi" class="${measure === "psi" ? "active" : ""}" aria-pressed="${measure === "psi"}">PSI</button><button data-measure="pm25" class="${measure === "pm25" ? "active" : ""}" aria-pressed="${measure === "pm25"}">PM2.5</button></div></div>${trend(measure, selected)}</article></div>${hourlyAveragesPanel()}</section>
      <footer><span>LIVE DATABASE · API GENERATED ${time(data?.generatedAt, true)}</span><span><a href="https://data.gov.sg/datasets?agencies=National+Environment+Agency+%28NEA%29&resultId=d_fe37906a0182569d891506e815e819b7" target="_blank" rel="noreferrer">NEA PSI dataset</a><span class="footer-sep">/</span><a href="https://data.gov.sg/datasets?agencies=National+Environment+Agency+%28NEA%29&resultId=d_e1058d6974c877257e32048ab128ad83" target="_blank" rel="noreferrer">NEA PM2.5 dataset</a></span></footer>
    </main>`;
  const detailPanel = app!.querySelector(".detail-panel");
  detailPanel?.classList.add(`severity-${psiCategory(reading("psi", selected)?.value).className}`);
  app!.querySelector("#auto-refresh-toggle")?.addEventListener("click", () => setAutoRefresh(!autoRefreshEnabled));
  app!.querySelectorAll<HTMLButtonElement>("[data-region]").forEach(button => button.addEventListener("click", () => { selected = button.dataset.region!; persistSelection(); void refresh(); }));
  app!.querySelectorAll<HTMLButtonElement>("[data-measure]").forEach(button => button.addEventListener("click", () => { measure = button.dataset.measure as Metric; persistSelection(); render(); }));
  if (!data || !regions().length) return;
  map = L.map("map", { zoomControl: true, scrollWheelZoom: false }).setView(mapView?.center ?? [1.3521, 103.8198], mapView?.zoom ?? 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors" }).addTo(map);
  regions().forEach(region => {
    if (region.latitude === null || region.longitude === null) return;
    const psi = reading("psi", region.id), pm25 = reading("pm25", region.id), category = psiCategory(psi?.value);
    const shown = measure === "psi" ? psi : pm25;
    const marker = L.circleMarker([region.latitude, region.longitude], { radius: region.id === selected ? 10 : 7, color: region.id === selected ? "#ffffff" : "#254f4a", weight: region.id === selected ? 3 : 2, fillColor: measure === "psi" ? category.color : (pm25 ? "#66887d" : "#9aa39e"), fillOpacity: 0.95 }).addTo(map!);
    marker.bindTooltip(`<strong>${labels[region.id] ?? region.name} · ${measure === "psi" ? category.label : "PM2.5"}</strong><span>24-hour PSI: <b>${psi?.value ?? "No reading"}</b> · observed ${time(psi?.observedAt)}</span><span>1-hour PM2.5: <b>${pm25 ? `${pm25.value} µg/m³` : "No reading"}</b> · observed ${time(pm25?.observedAt)}</span>`, { direction: "top", offset: [0, -8], opacity: 1, sticky: true, className: "air-tooltip" });
    marker.bindPopup(`<strong>${labels[region.id] ?? region.name}</strong><br>${measure === "psi" ? "PSI" : "PM2.5"}: ${shown?.value ?? "No reading"}<br>Observed ${time(shown?.observedAt)}<br>Source updated ${time(shown?.sourceUpdatedAt)}`);
    marker.on("click", () => { if (selected !== region.id) { selected = region.id; persistSelection(); void refresh(); } });
  });
}
function persistSelection() { localStorage.setItem("airwatch-selection", JSON.stringify({ region: selected, measure })); }
function setAutoRefresh(enabled: boolean) {
  autoRefreshEnabled = enabled;
  localStorage.setItem("airwatch-auto-refresh", String(enabled));
  if (autoRefreshTimer !== undefined) { window.clearInterval(autoRefreshTimer); autoRefreshTimer = undefined; }
  if (enabled) {
    void checkForUpdates();
    autoRefreshTimer = window.setInterval(() => void checkForUpdates(), 5 * 60_000);
  }
  render();
}
async function checkForUpdates() {
  if (checkInFlight) return checkInFlight;
  checkInFlight = (async () => {
    try {
      const response = await fetch("/api/poll-current", { method: "POST", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Current data check returned HTTP ${response.status}`);
      const result = await response.json() as { changed?: boolean; checkedAt?: string; error?: string | null };
      lastCheckAt = result.checkedAt ?? new Date().toISOString();
      autoRefreshError = result.error ?? "";
      const hasProviderError = Boolean(data?.metrics.psi.status.error || data?.metrics.pm25.status.error);
      if (result.changed || result.error || requestError || hasProviderError) await refresh();
      else updateRefreshStatus();
    } catch (error) {
      lastCheckAt = new Date().toISOString();
      autoRefreshError = error instanceof Error ? error.message : "Unexpected current data check error";
      await refresh();
    }
  })();
  try { await checkInFlight; } finally { checkInFlight = undefined; }
}
async function refresh() {
  const sequence = ++requestSequence;
  loading = !data;
  if (!data) render();
  try {
    const response = await fetchDashboard(selected);
    if (sequence !== requestSequence) return;
    data = response;
    selected = data.selectedRegion;
    persistSelection();
    requestError = "";
    updateStartupSnapshotRetry(data);
  } catch (error) {
    if (sequence !== requestSequence) return;
    requestError = error instanceof Error ? error.message : "Unexpected API error";
    if (data && selected !== data.selectedRegion) {
      selected = data.selectedRegion;
      persistSelection();
    }
  } finally {
    if (sequence === requestSequence) { loading = false; render(); }
  }
}
render();
void refresh();
if (autoRefreshEnabled) {
  void checkForUpdates();
  autoRefreshTimer = window.setInterval(() => void checkForUpdates(), 5 * 60_000);
}
window.addEventListener("beforeunload", () => {
  if (autoRefreshTimer !== undefined) window.clearInterval(autoRefreshTimer);
  if (startupSnapshotTimer !== undefined) window.clearTimeout(startupSnapshotTimer);
  map?.remove();
});
