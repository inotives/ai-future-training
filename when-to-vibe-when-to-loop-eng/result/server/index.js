import { createServer } from "node:http";
import { openDatabase } from "./db.js";
import { createIngestionService } from "./ingestion.js";

const port = Number(process.env.API_PORT ?? 3556);
const database = openDatabase();
const ingestion = createIngestionService({ database });

const server = createServer((request, response) => {
  if (request.url === "/api/health" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "ok", database: "ready" }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Air quality API listening on http://127.0.0.1:${port}`);
  void ingestion.start();
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  void ingestion.stop();
  server.close(() => {
    void ingestion.stop().finally(() => {
      database.close();
      process.exit(0);
    });
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
