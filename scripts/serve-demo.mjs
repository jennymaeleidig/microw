// Serves the microw demo and opens it in the user's browser. Zero dependencies:
// Node's http + fs only. Cross-platform URL opening via `open` (macOS),
// `start` (Windows), or `xdg-open` (Linux).
//
// Usage:  node scripts/serve-demo.mjs [--no-open]
// Env:    PORT (default 4173) · MICROW_DEMO_NO_OPEN=1 skips the browser open.

import { createServer } from "node:http";
import { exec } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PREFERRED_PORT = Number(process.env.PORT) || 4173;
const noOpen =
  process.argv.includes("--no-open") || process.env.MICROW_DEMO_NO_OPEN === "1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function resolveSafePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  let rel = decoded.replace(/^\/+/, "");
  if (rel === "") {
    rel = "demo/index.html";
  }
  const filePath = resolve(root, rel);
  if (filePath !== root && !filePath.startsWith(root + sep)) {
    return resolve(root, "demo/index.html"); // traversal attempt → the demo
  }
  return filePath;
}

async function handler(req, res) {
  try {
    let filePath = resolveSafePath(
      new URL(req.url, "http://localhost").pathname,
    );
    const info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, "index.html");
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function openBrowser(url) {
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command, (error) => {
    if (error) {
      console.log(`Open a browser at ${url}`);
    }
  });
}

function listen(port) {
  return new Promise((resolveListen, rejectListen) => {
    const server = createServer(handler);
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen(server);
    });
  });
}

async function main() {
  let server;
  try {
    server = await listen(PREFERRED_PORT);
  } catch (error) {
    if (error.code !== "EADDRINUSE") {
      throw error;
    }
    server = await listen(0); // any free port
  }
  const url = `http://127.0.0.1:${server.address().port}/demo/`;
  console.log(`microw demo running at ${url}`);
  console.log("Press Ctrl+C to stop.");
  if (!noOpen) {
    openBrowser(url);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
