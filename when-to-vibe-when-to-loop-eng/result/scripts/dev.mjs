import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const viteCli = new URL("../node_modules/vite/bin/vite.js", import.meta.url);
const api = spawn(process.execPath, [fileURLToPath(new URL("../server/index.js", import.meta.url))], {
  cwd: fileURLToPath(root), stdio: "inherit", env: process.env,
});
const vite = spawn(process.execPath, [fileURLToPath(viteCli), "--host", "127.0.0.1", "--port", process.env.VITE_PORT ?? "3555", "--strictPort"], {
  cwd: fileURLToPath(root), stdio: "inherit", env: process.env,
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill("SIGTERM");
  vite.kill("SIGTERM");
  process.exitCode = code;
}
api.on("exit", code => { if (!stopping) stop(code ?? 1); });
vite.on("exit", code => { if (!stopping) stop(code ?? 1); });
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
