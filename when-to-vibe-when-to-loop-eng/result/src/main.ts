import L from "leaflet";
import "./style.css";
import { airQualityFixture, type Measure } from "./data/temperature-fixture";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root element #app was not found.");

type Region = (typeof airQualityFixture.psi.data.regionMetadata)[number];
type Mode = "normal" | "loading" | "error";
const regions = airQualityFixture.psi.data.regionMetadata;
let selected = "central";
let measure: Measure = "psi";
let mode: Mode = "normal";
let map: L.Map | undefined;
const labels: Record<string, string> = { north: "North", south: "South", east: "East", west: "West", central: "Central" };

function getItems(metric: Measure) {
  return airQualityFixture[metric].data.items as readonly { timestamp: string; readings: Record<string, Record<string, number>> }[];
}
function metricKey(metric: Measure) { return metric === "psi" ? "psi_twenty_four_hourly" : "pm25_one_hourly"; }
function latest(metric: Measure, region: string) {
  const key = metricKey(metric);
  for (const item of getItems(metric)) {
    const value = item.readings[key]?.[region];
    if (value !== undefined && value !== null) return { value, timestamp: item.timestamp };
  }
  return undefined;
}
function psiCategory(value?: number) {
  if (value === undefined) return { label: "No PSI reading", className: "none", color: "#9aa39e" };
  if (value >= 301) return { label: "Hazardous", className: "hazardous", color: "#82578f" };
  if (value >= 201) return { label: "Very Unhealthy", className: "very-unhealthy", color: "#cf6259" };
  if (value >= 101) return { label: "Unhealthy", className: "unhealthy", color: "#d89a38" };
  return { label: "Good to Moderate", className: "good", color: "#739a70" };
}
function freshness(timestamp?: string) {
  if (!timestamp) return { label: "No reading", className: "empty" };
  const minutes = Math.max(0, Math.floor((Date.parse(airQualityFixture.asOf) - Date.parse(timestamp)) / 60_000));
  return minutes >= 30 ? { label: `Stale · ${minutes} min`, className: "stale" } : { label: `Fresh · ${minutes} min`, className: "fresh" };
}
function time(timestamp?: string) {
  if (!timestamp) return "No reading";
  return new Intl.DateTimeFormat("en-SG", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Singapore" }).format(new Date(timestamp)) + " SGT";
}
function maximum(metric: Measure) {
  return regions.map(r => ({ region: r.name, reading: latest(metric, r.name) })).filter(x => x.reading).sort((a, b) => b.reading!.value - a.reading!.value)[0];
}
function trend(metric: Measure, region: string) {
  const key = metricKey(metric);
  const samples = [...getItems(metric).slice(0, 24)].reverse().map(item => ({ timestamp: item.timestamp, value: item.readings[key]?.[region] }));
  const width = 440, height = 126, pad = 14;
  const values = samples.flatMap(p => p.value === undefined ? [] : [p.value]);
  if (!values.length) return `<div class="chart-empty">No trend readings available.</div>`;
  const min = Math.min(...values) - 3, max = Math.max(...values) + 3;
  const point = (i: number, value: number) => `${pad + i * (width - pad * 2) / (samples.length - 1)},${height - pad - (value - min) * (height - pad * 2) / (max - min || 1)}`;
  const runs: number[][] = [];
  samples.forEach((sample, i) => { if (sample.value === undefined) return; const run = runs[runs.length - 1]; if (!run || i !== run[run.length - 1] + 1) runs.push([i]); else run.push(i); });
  const lines = runs.filter(run => run.length > 1).map(run => `<polyline points="${run.map(i => point(i, samples[i].value!)).join(" ")}"/>`).join("");
  const dots = samples.map((sample, i) => sample.value === undefined
    ? `<line class="gap-mark" x1="${pad + i * (width - pad * 2) / (samples.length - 1)}" y1="${pad}" x2="${pad + i * (width - pad * 2) / (samples.length - 1)}" y2="${height - pad}"/>`
    : `<circle cx="${point(i, sample.value).split(",")[0]}" cy="${point(i, sample.value).split(",")[1]}" r="4"/>`).join("");
  return `<svg class="trend" viewBox="0 0 ${width} ${height}" role="img" aria-label="24-hour ${metric === "psi" ? "PSI" : "PM2.5"} trend for ${labels[region]}, one point per hour"><line class="axis" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}"/>${lines}${dots}</svg><div class="chart-times"><span>${time(samples[0].timestamp)}</span><span>${time(samples[samples.length - 1].timestamp)}</span></div><p class="chart-note">24 hourly points · missing samples show as gaps; no values are interpolated.</p>`;
}
function hourlyAverages(metric: Measure, region: string) {
  const groups = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0, count: 0 }));
  const hourFormatter = new Intl.DateTimeFormat("en-SG", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Singapore" });
  for (const item of getItems(metric)) {
    const value = item.readings[metricKey(metric)]?.[region];
    if (value === undefined || value === null) continue;
    const hour = Number(hourFormatter.formatToParts(new Date(item.timestamp)).find(part => part.type === "hour")?.value);
    groups[hour].total += value;
    groups[hour].count++;
  }
  return groups.filter(group => group.count).map(group => ({
    ...group,
    average: group.total / group.count
  })).sort((a, b) => b.average - a.average || a.hour - b.hour);
}
function hourlyAveragesPanel(region: string) {
  const rankings = (["psi", "pm25"] as Measure[]).map(metric => {
    const averages = hourlyAverages(metric, region);
    const max = averages[0]?.average ?? 0;
    const rows = averages.map((item, index) => `<li><span class="hour-rank">${String(index + 1).padStart(2, "0")}</span><time>${String(item.hour).padStart(2, "0")}:00</time><span class="hour-track" aria-hidden="true"><i style="width:${max ? item.average / max * 100 : 0}%"></i></span><strong>${item.average.toFixed(1)}</strong><small>${item.count}/7</small></li>`).join("");
    return `<article class="hourly-rank ${metric}"><div class="hourly-rank-title"><h4>${metric === "psi" ? "24-hour PSI" : "1-hour PM2.5"}</h4><span>${metric === "psi" ? "INDEX" : "µg/m³"}</span></div><ol>${rows}</ol></article>`;
  }).join("");
  return `<section class="hourly-summary" aria-labelledby="hourly-average-title"><div class="hourly-summary-head"><div><div class="eyebrow">7-DAY HOURLY PROFILE</div><h3 id="hourly-average-title">Average by hour</h3></div><span>HIGHEST AVERAGE FIRST · SGT</span></div><div class="hourly-columns">${rankings}</div><p class="hourly-note">Each row averages readings from the same Singapore clock hour across the fixture’s seven days. The count shows available daily readings out of seven.</p></section>`;
}

function render() {
  map?.remove(); map = undefined;
  const psiMax = maximum("psi"), pmMax = maximum("pm25");
  const newest = [getItems("psi")[0]?.timestamp, getItems("pm25")[0]?.timestamp].filter(Boolean).sort().at(-1);
  const statePanel = mode === "normal" ? "" : `<section class="state-panel ${mode}" role="${mode === "error" ? "alert" : "status"}"><div class="state-icon">${mode === "loading" ? "◌" : "!"}</div><div><h2>${mode === "loading" ? "Loading demo readings" : "Demo API unavailable"}</h2><p>${mode === "loading" ? "The fixture is paused to preview the loading state." : "Synthetic readings could not be retrieved in this demo state."}</p></div></section>`;
  app!.innerHTML = `
    <main class="shell">
      <header class="topbar"><a class="brand" href="#" aria-label="Airwatch home"><span class="brand-mark">A</span><span>FIELDNOTES<span class="brand-sub">SINGAPORE / ENVIRONMENT</span></span></a><div class="header-meta"><span class="demo-pill"><i></i>${airQualityFixture.source}</span><span class="updated">FIXTURE UPDATED <strong>${time(newest)}</strong></span></div></header>
      <section class="intro"><div><div class="eyebrow"><span class="eyebrow-line"></span>REGIONAL MONITORING / DEMO</div><h1>Singapore air quality</h1><p>Explore synthetic regional readings for haze monitoring. This dashboard does not report current conditions or confirm a haze event.</p></div><label class="state-control">DEMO STATE<select id="demo-state" aria-label="Demo state"><option value="normal" ${mode === "normal" ? "selected" : ""}>Normal fixture</option><option value="loading" ${mode === "loading" ? "selected" : ""}>Loading</option><option value="error" ${mode === "error" ? "selected" : ""}>API error</option></select></label></section>
      <section class="metrics" aria-label="Regional summary">
        <article class="metric-card"><div class="metric-label">HIGHEST 24-HOUR PSI <span class="unit-chip">INDEX</span></div><div class="metric-value">${psiMax?.reading?.value ?? "—"}<span class="metric-unit">PSI</span></div><div class="metric-foot">Latest available across regions</div></article>
        <article class="metric-card accent"><div class="metric-label">REGION <span class="unit-chip">PSI PEAK</span></div><div class="metric-value region-value">${psiMax ? labels[psiMax.region] : "—"}</div><div class="metric-foot">${psiMax?.reading ? time(psiMax.reading.timestamp) : "No reading"}</div></article>
        <article class="metric-card"><div class="metric-label">HIGHEST 1-HOUR PM2.5 <span class="unit-chip">µg/m³</span></div><div class="metric-value">${pmMax?.reading?.value ?? "—"}<span class="metric-unit">µg/m³</span></div><div class="metric-foot">Concentration · latest available</div></article>
        <article class="metric-card"><div class="metric-label">DATA FRESHNESS <span class="unit-chip">FIXTURE</span></div><div class="metric-value freshness-value">${freshness(newest).label.split(" · ")[0]}</div><div class="metric-foot">Reference time ${time(airQualityFixture.asOf)}</div></article>
      </section>
      ${statePanel}
      <section class="workspace ${mode !== "normal" ? "muted" : ""}">
        <article class="panel map-panel"><div class="panel-heading"><div><div class="eyebrow">GEOGRAPHIC VIEW</div><h2>Regional readings</h2></div><div class="segmented" role="group" aria-label="Map measure"><button data-measure="psi" class="${measure === "psi" ? "active" : ""}" aria-pressed="${measure === "psi"}">PSI</button><button data-measure="pm25" class="${measure === "pm25" ? "active" : ""}" aria-pressed="${measure === "pm25"}">PM2.5</button></div></div><div id="map" aria-label="Map of Singapore showing five regional air quality readings"></div><div class="map-foot"><span><i class="legend-dot"></i> Regional reference point</span><span>Values are synthetic · Map © OpenStreetMap</span></div></article>
        <article class="panel regions-panel"><div class="panel-heading"><div><div class="eyebrow">LATEST BY REGION</div><h2>Singapore regions</h2></div><span class="list-count">05 REGIONS</span></div><div class="region-list">${regions.map(r => { const p = latest("psi", r.name), m = latest("pm25", r.name); return `<button class="region-row ${selected === r.name ? "selected" : ""}" data-region="${r.name}" aria-pressed="${selected === r.name}"><span class="region-name"><span class="region-pin ${selected === r.name ? "chosen" : ""}"></span>${labels[r.name]}</span><span class="region-reading"><strong>${p?.value ?? "—"}</strong><small>PSI</small></span><span class="region-reading pm"><strong>${m?.value ?? "—"}</strong><small>µg/m³</small></span><span class="row-chevron">›</span></button>`; }).join("")}</div><div class="list-legend"><span>24h PSI</span><span>1h PM2.5</span></div></article>
      </section>
      <section class="panel detail-panel"><div class="detail-title"><div><div class="eyebrow">REGION DETAIL</div><h2>${labels[selected]} <span class="detail-coord">${regions.find(r => r.name === selected)?.labelLocation.latitude.toFixed(3)}°N · ${regions.find(r => r.name === selected)?.labelLocation.longitude.toFixed(3)}°E</span></h2></div><span class="selected-badge"><i></i>SELECTED REGION</span></div><div class="detail-grid"><article class="detail-reading"><div class="reading-head"><span>24-HOUR PSI</span><b>INDEX</b></div><div class="reading-number">${latest("psi", selected)?.value ?? "—"}<span>PSI</span></div><div class="reading-meta"><span>${time(latest("psi", selected)?.timestamp)}</span><span class="fresh-tag ${freshness(latest("psi", selected)?.timestamp).className}">${freshness(latest("psi", selected)?.timestamp).label}</span></div></article><article class="detail-reading pm-detail"><div class="reading-head"><span>1-HOUR PM2.5</span><b>µg/m³</b></div><div class="reading-number">${latest("pm25", selected)?.value ?? "—"}<span>µg/m³</span></div><div class="reading-meta"><span>${time(latest("pm25", selected)?.timestamp)}</span><span class="fresh-tag ${freshness(latest("pm25", selected)?.timestamp).className}">${freshness(latest("pm25", selected)?.timestamp).label}</span></div></article><article class="trend-card"><div class="trend-head"><div><span>RECENT TREND</span><strong>${measure === "psi" ? "24-hour PSI" : "1-hour PM2.5"}</strong></div><div class="segmented mini" role="group" aria-label="Trend measure"><button data-measure="psi" class="${measure === "psi" ? "active" : ""}" aria-pressed="${measure === "psi"}">PSI</button><button data-measure="pm25" class="${measure === "pm25" ? "active" : ""}" aria-pressed="${measure === "pm25"}">PM2.5</button></div></div>${trend(measure, selected)}</article></div></section>
      <footer><span>DEMO FIXTURE · REFERENCE ${airQualityFixture.asOf.slice(0, 10)}</span><span><a href="https://data.gov.sg/datasets?agencies=National+Environment+Agency+%28NEA%29&resultId=d_fe37906a0182569d891506e815e819b7" target="_blank" rel="noreferrer">NEA PSI dataset</a><span class="footer-sep">/</span><a href="https://data.gov.sg/datasets?agencies=National+Environment+Agency+%28NEA%29&resultId=d_e1058d6974c877257e32048ab128ad83" target="_blank" rel="noreferrer">NEA PM2.5 dataset</a></span></footer>
    </main>`;
  app!.querySelector(".detail-panel")?.insertAdjacentHTML("beforeend", hourlyAveragesPanel(selected));
  app!.querySelectorAll<HTMLButtonElement>(".region-row").forEach(button => {
    const region = button.dataset.region!;
    const psi = latest("psi", region), pm25 = latest("pm25", region);
    const category = psiCategory(psi?.value);
    button.querySelector(".region-pin")?.classList.add(`psi-${category.className}`);
    button.classList.add(`psi-${category.className}`);
    button.setAttribute("aria-label", `${labels[region]}: PSI ${psi?.value ?? "no reading"}, ${category.label}; PM2.5 ${pm25?.value ?? "no reading"} µg/m³`);
  });
  const detailPanel = app!.querySelector(".detail-panel");
  const selectedCategory = psiCategory(latest("psi", selected)?.value);
  detailPanel?.classList.add(`severity-${selectedCategory.className}`);
  detailPanel?.querySelector(".selected-badge")?.insertAdjacentHTML("beforeend", ` · ${selectedCategory.label.toUpperCase()}`);
  const mapFoot = app!.querySelector(".map-foot");
  if (mapFoot) mapFoot.innerHTML = `<span class="severity-legend" aria-label="Regional dots use PSI category colors"><strong>PSI CATEGORY</strong><span><i class="severity-dot psi-good"></i>Good to Moderate</span><span><i class="severity-dot psi-unhealthy"></i>Unhealthy</span><span><i class="severity-dot psi-very-unhealthy"></i>Very Unhealthy</span><span><i class="severity-dot psi-hazardous"></i>Hazardous</span></span><span>Values are synthetic · Map © OpenStreetMap</span>`;
  bind();
}

function bind() {
  document.querySelector<HTMLSelectElement>("#demo-state")?.addEventListener("change", event => { mode = (event.currentTarget as HTMLSelectElement).value as Mode; render(); });
  document.querySelectorAll<HTMLButtonElement>("[data-region]").forEach(button => button.addEventListener("click", () => { selected = button.dataset.region!; render(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-measure]").forEach(button => button.addEventListener("click", () => { measure = button.dataset.measure as Measure; render(); }));
  if (mode !== "normal") return;
  map = L.map("map", { zoomControl: true, scrollWheelZoom: false }).setView([1.3521, 103.8198], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors" }).addTo(map);
  regions.forEach((region: Region) => {
    const psi = latest("psi", region.name), pm25 = latest("pm25", region.name);
    const category = psiCategory(psi?.value);
    const marker = L.circleMarker([region.labelLocation.latitude, region.labelLocation.longitude], { radius: region.name === selected ? 10 : 7, color: region.name === selected ? "#ffffff" : "#254f4a", weight: region.name === selected ? 3 : 2, fillColor: category.color, fillOpacity: 0.95 }).addTo(map!);
    marker.bindTooltip(`<strong>${labels[region.name]} · ${category.label}</strong><span>24-hour PSI: <b>${psi?.value ?? "No reading"}</b> · ${time(psi?.timestamp)}</span><span>1-hour PM2.5: <b>${pm25 ? `${pm25.value} µg/m³` : "No reading"}</b> · ${time(pm25?.timestamp)}</span>`, { direction: "top", offset: [0, -8], opacity: 1, sticky: true, className: "air-tooltip" });
    marker.bindPopup(`<strong>${labels[region.name]} · ${category.label}</strong><br>24-hour PSI: ${psi?.value ?? "No reading"}<br>${time(psi?.timestamp)}<br>1-hour PM2.5: ${pm25 ? `${pm25.value} µg/m³` : "No reading"}<br>${time(pm25?.timestamp)}`);
    marker.on("click", () => { if (selected !== region.name) { selected = region.name; render(); } });
  });
}

render();
