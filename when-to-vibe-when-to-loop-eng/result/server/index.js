import { createServer } from "node:http";
import { openDatabase } from "./db.js";
import { createIngestionService } from "./ingestion.js";
import { createApiHandler } from "./api.js";

const port = Number(process.env.API_PORT ?? 3556);
const database = openDatabase();
const ingestion = createIngestionService({ database });

const server = createServer(createApiHandler(database));

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
