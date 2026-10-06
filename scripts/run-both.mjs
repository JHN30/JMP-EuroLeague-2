// Runs one npm script in backend and one in frontend at the same time.
// Usage: node scripts/run-both.mjs <backend-script> <frontend-script>
import { spawn } from "node:child_process";

const [backendScript, frontendScript] = process.argv.slice(2);
if (!backendScript || !frontendScript) {
  console.error("Usage: node scripts/run-both.mjs <backend-script> <frontend-script>");
  process.exit(1);
}

const children = [
  spawn(`npm --prefix backend run ${backendScript}`, { stdio: "inherit", shell: true }),
  spawn(`npm --prefix frontend run ${frontendScript}`, { stdio: "inherit", shell: true }),
];

let exiting = false;
function stopAll(code) {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    } else {
      child.kill();
    }
  }
  setTimeout(() => process.exit(code), 500);
}

// If either app stops, stop the other so nothing is left running.
for (const child of children) child.on("exit", (code) => stopAll(code ?? 1));
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
