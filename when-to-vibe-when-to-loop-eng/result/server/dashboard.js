import { REGIONS } from "./ingestion.js";

export const FRESHNESS_STALE_AFTER_MINUTES = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const METRICS = ["psi", "pm25"];
const UNITS = { psi: "index", pm25: "µg/m³" };
const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Singapore",
  hour: "2-digit",
  hourCycle: "h23",
});
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Singapore",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function singaporeHour(date) {
  return Number(hourFormatter.formatToParts(date).find(part => part.type === "hour")?.value);
}

function singaporeDate(date) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function hourBucket(timestamp) {
  const date = new Date(timestamp);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function freshness(row, nowMs) {
  if (!row) return null;
  const referenceAt = row.source_updated_at ?? row.fetched_at;
  const ageMinutes = Math.max(0, (nowMs - Date.parse(referenceAt)) / 60_000);
  return {
    state: ageMinutes >= FRESHNESS_STALE_AFTER_MINUTES ? "stale" : "fresh",
    referenceAt,
    ageMinutes,
    staleAfterMinutes: FRESHNESS_STALE_AFTER_MINUTES,
  };
}

function reading(metric, regionId, row, nowMs) {
  if (!row) return null;
  return {
    metric,
    regionId,
    value: row.value,
    unit: UNITS[metric],
    observedAt: row.observed_at,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
    freshness: freshness(row, nowMs),
  };
}

function feedStatus(database, metric) {
  const latestAttempt = database.prepare(`
    SELECT status, started_at, completed_at, error
    FROM ingestion_runs
    WHERE metric = ? AND run_type = 'current'
    ORDER BY started_at DESC, id DESC LIMIT 1
  `).get(metric);
  const lastSuccess = database.prepare(`
    SELECT completed_at FROM ingestion_runs
    WHERE metric = ? AND run_type = 'current' AND status = 'succeeded'
    ORDER BY completed_at DESC, id DESC LIMIT 1
  `).get(metric);
  return {
    latestAttempt: latestAttempt ? {
      status: latestAttempt.status,
      startedAt: latestAttempt.started_at,
      completedAt: latestAttempt.completed_at,
      error: latestAttempt.error,
    } : null,
    lastSuccessfulPoll: lastSuccess?.completed_at ?? null,
    error: latestAttempt?.status === "failed" ? latestAttempt.error : null,
  };
}

function queryRows(database, metric, regionId, since, until) {
  return database.prepare(`
    SELECT value, observed_at, source_updated_at, fetched_at
    FROM observations
    WHERE metric = ? AND region_id = ? AND observed_at >= ? AND observed_at <= ?
    ORDER BY observed_at ASC
  `).all(metric, regionId, since, until);
}

function series24h(rows, nowMs) {
  const end = Math.floor(nowMs / 3_600_000) * 3_600_000;
  const start = end - 23 * 3_600_000;
  const byHour = new Map(rows.map(row => [hourBucket(row.observed_at), row]));
  return Array.from({ length: 24 }, (_, index) => {
    const hour = new Date(start + index * 3_600_000).toISOString();
    const row = byHour.get(hour);
    return { hour, value: row?.value ?? null, observedAt: row?.observed_at ?? null };
  });
}

function hourlyAverages(rows) {
  const groups = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0, sampleCount: 0, days: new Set() }));
  for (const row of rows) {
    const date = new Date(row.observed_at);
    const group = groups[singaporeHour(date)];
    group.total += row.value;
    group.sampleCount += 1;
    group.days.add(singaporeDate(date));
  }
  return groups.filter(group => group.sampleCount > 0).map(group => ({
    hour: group.hour,
    average: group.total / group.sampleCount,
    sampleCount: group.sampleCount,
    daysWithReadings: group.days.size,
  })).sort((a, b) => b.average - a.average || a.hour - b.hour);
}

/** Build the database-backed response body for GET /api/dashboard. */
export function getDashboardSnapshot(database, selectedRegion = "central", now = new Date()) {
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new TypeError("now must be a valid date");
  const regions = database.prepare(`
    SELECT id, name, latitude, longitude FROM regions
  `).all().sort((a, b) => REGIONS.findIndex(region => region.id === a.id) - REGIONS.findIndex(region => region.id === b.id));
  const selected = regions.find(region => region.id === selectedRegion);
  if (!selected) return { error: "Unknown region", availableRegions: regions.map(region => region.id) };

  const metrics = Object.fromEntries(METRICS.map(metric => {
    const latestRows = database.prepare(`
      SELECT value, observed_at, source_updated_at, fetched_at
      FROM observations WHERE metric = ? AND region_id = ?
      ORDER BY observed_at DESC LIMIT 1
    `);
    const latestByRegion = Object.fromEntries(regions.map(region => {
      const row = latestRows.get(metric, region.id);
      return [region.id, reading(metric, region.id, row, nowMs)];
    }));
    const since24h = new Date(nowMs - DAY_MS).toISOString();
    const since7d = new Date(nowMs - 7 * DAY_MS).toISOString();
    const until = new Date(nowMs).toISOString();
    const rows24h = queryRows(database, metric, selectedRegion, since24h, until);
    const rows7d = queryRows(database, metric, selectedRegion, since7d, until);
    return [metric, {
      unit: UNITS[metric],
      latestByRegion,
      series24h: series24h(rows24h, nowMs),
      hourlyAverages7d: hourlyAverages(rows7d),
      status: feedStatus(database, metric),
    }];
  }));
  return {
    generatedAt: new Date(nowMs).toISOString(),
    timezone: "Asia/Singapore",
    regions,
    selectedRegion,
    metrics,
  };
}
