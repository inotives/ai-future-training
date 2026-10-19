import { upsertObservation } from "./db.js";

export const REGIONS = [
  { id: "north", name: "North", latitude: 1.41803, longitude: 103.82 },
  { id: "south", name: "South", latitude: 1.29587, longitude: 103.82 },
  { id: "east", name: "East", latitude: 1.35735, longitude: 103.94 },
  { id: "west", name: "West", latitude: 1.35735, longitude: 103.7 },
  { id: "central", name: "Central", latitude: 1.35735, longitude: 103.82 },
];

export const PROVIDERS = {
  psi: { url: "https://api-open.data.gov.sg/v2/real-time/api/psi", readingKey: "psi_twenty_four_hourly" },
  pm25: { url: "https://api-open.data.gov.sg/v2/real-time/api/pm25", readingKey: "pm25_one_hourly" },
};

const MAX_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 5_000;
const PROVIDER_REQUEST_LIMIT = 6;
const PROVIDER_WINDOW_MS = 10_000;

export function singaporeDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function backfillDates(now = new Date(), days = 30) {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new RangeError("days must be between 1 and 366");
  const today = singaporeDate(now);
  const [year, month, day] = today.split("-").map(Number);
  // UTC arithmetic is used on Singapore's calendar date to avoid host timezone/DST effects.
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1, day - offset));
    return date.toISOString().slice(0, 10);
  });
}

function isoTimestamp(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Malformed data.gov.sg payload: ${label} must be a timestamp`);
  }
  return new Date(value).toISOString();
}

export function parsePayload(payload, metric, fetchedAt = new Date().toISOString()) {
  const provider = PROVIDERS[metric];
  if (!provider || !payload || typeof payload !== "object" || (payload.code !== 0 && payload.code !== "0")) {
    throw new Error(`Malformed data.gov.sg ${metric} response`);
  }
  const items = payload.data?.items;
  if (!Array.isArray(items)) throw new Error(`Malformed data.gov.sg ${metric} response: data.items is missing`);
  const normalized = [];
  for (const item of items) {
    if (!item || typeof item !== "object") throw new Error(`Malformed data.gov.sg ${metric} item`);
    const observedAt = isoTimestamp(item.timestamp, "item.timestamp");
    const updated = item.updatedTimestamp ?? item.updateTimestamp ?? item.updated_timestamp;
    const sourceUpdatedAt = updated == null ? null : isoTimestamp(updated, "item.updatedTimestamp");
    const readings = item.readings?.[provider.readingKey];
    if (readings == null) continue;
    if (typeof readings !== "object" || Array.isArray(readings)) throw new Error(`Malformed ${provider.readingKey} readings`);
    for (const region of REGIONS) {
      const value = readings[region.id];
      if (value == null) continue;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Malformed ${provider.readingKey} value for ${region.id}`);
      }
      normalized.push({ metric, region: region.id, value, observedAt, sourceUpdatedAt, fetchedAt });
    }
  }
  return normalized;
}

function createSlidingWindowLimiter({ limit, windowMs, now, sleep }) {
  const requestTimes = [];
  let queue = Promise.resolve();

  function acquire() {
    const turn = queue.then(async () => {
      while (true) {
        const currentTime = now();
        while (requestTimes.length && currentTime - requestTimes[0] >= windowMs) requestTimes.shift();
        if (requestTimes.length < limit) {
          requestTimes.push(currentTime);
          return;
        }
        await sleep(Math.max(1, requestTimes[0] + windowMs - currentTime));
      }
    });
    queue = turn.catch(() => {});
    return turn;
  }

  return { acquire };
}

function retryAfterMs(response, attempt) {
  const header = response?.headers?.get?.("retry-after");
  const seconds = Number(header);
  if (header && Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  const date = header ? Date.parse(header) : NaN;
  if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), MAX_RETRY_DELAY_MS);
  return Math.min(500 * (2 ** (attempt - 1)), MAX_RETRY_DELAY_MS);
}

export async function fetchPayload(url, {
  fetchImpl = fetch,
  beforeAttempt = async () => {},
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  timeoutMs = 10_000,
  apiKey = process.env.DATA_GOV_SG_API_KEY,
  attempts = MAX_ATTEMPTS,
  validatePayload = value => value,
} = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      await beforeAttempt();
      const headers = apiKey ? { "x-api-key": apiKey } : {};
      response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) {
        const error = new Error(`data.gov.sg returned HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const payload = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Malformed data.gov.sg JSON response");
      validatePayload(payload);
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(retryAfterMs(response, attempt));
    }
  }
  throw lastError;
}

function requestUrl(metric, date) {
  const url = new URL(PROVIDERS[metric].url);
  if (date) url.searchParams.set("date", date);
  return url;
}

function seedRegions(database) {
  const statement = database.prepare(`
    INSERT INTO regions (id, name, latitude, longitude) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, latitude = excluded.latitude, longitude = excluded.longitude
  `);
  for (const region of REGIONS) statement.run(region.id, region.name, region.latitude, region.longitude);
}

function createRun(database, metric, runType, requestedDate, startedAt) {
  return Number(database.prepare(`
    INSERT INTO ingestion_runs (metric, run_type, requested_date, started_at, status)
    VALUES (?, ?, ?, ?, 'running')
  `).run(metric, runType, requestedDate, startedAt).lastInsertRowid);
}

function finishRun(database, id, status, recordsWritten, error, completedAt) {
  database.prepare(`
    UPDATE ingestion_runs SET completed_at = ?, status = ?, records_written = ?, error = ? WHERE id = ?
  `).run(completedAt, status, recordsWritten, error, id);
}

export function createIngestionService({
  database,
  fetchImpl = fetch,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  now = () => new Date(),
  backfillDelayMs = Number(process.env.AQI_BACKFILL_DELAY_MS ?? 2_000),
  pollIntervalMs = Number(process.env.AQI_POLL_INTERVAL_MS ?? 10 * 60_000),
  timeoutMs = Number(process.env.AQI_REQUEST_TIMEOUT_MS ?? 10_000),
  attempts = MAX_ATTEMPTS,
  providerRequestLimit = PROVIDER_REQUEST_LIMIT,
  providerWindowMs = PROVIDER_WINDOW_MS,
  requestNow = () => performance.now(),
} = {}) {
  if (!database) throw new TypeError("database is required");
  if (!Number.isInteger(providerRequestLimit) || providerRequestLimit < 1) throw new RangeError("providerRequestLimit must be a positive integer");
  if (!Number.isFinite(providerWindowMs) || providerWindowMs <= 0) throw new RangeError("providerWindowMs must be positive");
  const requestLimiter = createSlidingWindowLimiter({ limit: providerRequestLimit, windowMs: providerWindowMs, now: requestNow, sleep });
  let stopped = false;
  let timer;
  let active;
  let historyTask;
  seedRegions(database);

  async function ingest(metric, runType, date = null) {
    const startedAt = now().toISOString();
    const runId = createRun(database, metric, runType, date, startedAt);
    try {
      const url = requestUrl(metric, date);
      const payload = await fetchPayload(url, {
        fetchImpl, sleep, timeoutMs, attempts, beforeAttempt: () => requestLimiter.acquire(),
        validatePayload: value => parsePayload(value, metric),
      });
      const fetchedAt = now().toISOString();
      const observations = parsePayload(payload, metric, fetchedAt);
      database.exec("BEGIN IMMEDIATE;");
      try {
        for (const observation of observations) upsertObservation(database, observation);
        database.exec("COMMIT;");
      } catch (error) {
        database.exec("ROLLBACK;");
        throw error;
      }
      finishRun(database, runId, "succeeded", observations.length, null, now().toISOString());
      return observations.length;
    } catch (error) {
      finishRun(database, runId, "failed", 0, String(error?.message ?? error).slice(0, 1000), now().toISOString());
      throw error;
    }
  }

  async function pollCurrent() {
    if (active) return active;
    active = (async () => {
      const results = await Promise.allSettled(["psi", "pm25"].map(metric => ingest(metric, "current")));
      const errors = results.filter(result => result.status === "rejected").map(result => result.reason);
      if (errors.length) throw new AggregateError(errors, `${errors.length} current air-quality feed(s) failed`);
      return results.reduce((total, result) => total + result.value, 0);
    })();
    try { return await active; } finally { active = undefined; }
  }

  async function importHistory({ days = 30, dates = backfillDates(now(), days) } = {}) {
    const completed = database.prepare(`
      SELECT 1 FROM ingestion_runs
      WHERE metric = ? AND run_type = 'backfill' AND requested_date = ? AND status = 'succeeded'
      LIMIT 1
    `);
    let recordsWritten = 0;
    let requestCount = 0;
    const errors = [];
    for (const date of dates) {
      for (const metric of ["psi", "pm25"]) {
        if (completed.get(metric, date)) continue;
        if (requestCount > 0 && backfillDelayMs > 0) await sleep(backfillDelayMs);
        if (stopped) return { recordsWritten, errors };
        requestCount += 1;
        try { recordsWritten += await ingest(metric, "backfill", date); }
        catch (error) { errors.push({ metric, date, error }); }
        if (stopped) return { recordsWritten, errors };
      }
    }
    return { recordsWritten, errors };
  }

  async function start() {
    stopped = false;
    try { await pollCurrent(); }
    catch (error) { console.error("Initial air-quality poll failed:", error.message); }
    if (stopped) return;
    historyTask = importHistory().then(result => {
      for (const failure of result.errors) console.error(`Backfill failed for ${failure.metric} ${failure.date}:`, failure.error.message);
    }).catch(error => console.error("Air-quality backfill failed:", error.message));
    timer = setInterval(() => {
      pollCurrent().catch(error => console.error("Scheduled air-quality poll failed:", error.message));
    }, pollIntervalMs);
    timer.unref?.();
    return historyTask;
  }

  async function stop() {
    stopped = true;
    if (timer) clearInterval(timer);
    await Promise.allSettled([active, historyTask].filter(Boolean));
  }

  return { ingest, pollCurrent, importHistory, start, stop };
}
