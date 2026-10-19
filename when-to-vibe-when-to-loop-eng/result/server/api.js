import { getDashboardSnapshot } from "./dashboard.js";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

function allowedPollOrigin(request) {
  const originHeader = request.headers?.origin;
  if (originHeader === undefined) return true;
  if (typeof originHeader !== "string") return false;
  try {
    const origin = new URL(originHeader);
    const originPort = Number(origin.port || 80);
    const allowedPorts = new Set([
      Number(process.env.VITE_PORT ?? 3555),
      Number(process.env.API_PORT ?? 3556),
    ]);
    if (origin.protocol !== "http:" || !LOCAL_HOSTS.has(origin.hostname) || !allowedPorts.has(originPort)) return false;
    const hostHeader = request.headers?.host;
    if (typeof hostHeader !== "string") return false;
    const requestHost = new URL(`http://${hostHeader}`).host;
    return requestHost === origin.host;
  } catch {
    return false;
  }
}

/** Create the local JSON API handler so it can be exercised without opening a socket. */
export function createApiHandler(database, { now = () => new Date(), ingestion } = {}) {
  return (request, response) => {
    if (request.url === "/api/poll-current" && request.method === "POST") {
      if (!allowedPollOrigin(request)) {
        response.writeHead(403, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Forbidden request origin" }));
        return;
      }
      if (!ingestion) {
        response.writeHead(503, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Current polling is unavailable" }));
        return;
      }
      void (async () => {
        try {
          const result = await ingestion.pollCurrent();
          response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({ ...result, checkedAt: now().toISOString(), error: null }));
        } catch (error) {
          response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
          response.end(JSON.stringify({
            changed: Boolean(error.changed),
            recordsWritten: error.recordsWritten ?? 0,
            checkedAt: now().toISOString(),
            error: error.message,
            feedErrors: error.feedErrors ?? [],
          }));
        }
      })();
      return;
    }
    if (request.url?.startsWith("/api/dashboard") && request.method === "GET") {
      const url = new URL(request.url, "http://127.0.0.1");
      const result = getDashboardSnapshot(database, url.searchParams.get("region") ?? "central", now());
      if (result.error) {
        response.writeHead(400, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify(result));
        return;
      }
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(result));
      return;
    }
    if (request.url === "/api/health" && request.method === "GET") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ status: "ok", database: "ready" }));
      return;
    }
    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "Not found" }));
  };
}
