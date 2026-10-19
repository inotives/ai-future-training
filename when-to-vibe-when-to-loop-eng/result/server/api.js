import { getDashboardSnapshot } from "./dashboard.js";

/** Create the local JSON API handler so it can be exercised without opening a socket. */
export function createApiHandler(database, now = () => new Date()) {
  return (request, response) => {
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
