import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const root = new URL("..", import.meta.url).pathname;
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// 1. The package boundary: ESM and CJS both import cleanly, construct a
//    window, and expose the public API with zero runtime dependencies.
// ---------------------------------------------------------------------------

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
const document = dom.window.document;

const esm = await import("../dist/esm/index.js");
const cjs = require("../dist/cjs/index.js");

for (const [format, mod] of [
  ["esm", esm],
  ["cjs", cjs],
]) {
  if (typeof mod.MicroW !== "function") {
    throw new Error(`${format}: MicroW is not exported`);
  }
  const win = new mod.MicroW({ root: document.body });
  if (document.body.querySelector(".mcrw") === null) {
    throw new Error(
      `${format}: constructing MicroW did not mount a .mcrw element`,
    );
  }
  win.element.remove();
}

// ---------------------------------------------------------------------------
// 2. The exports map exposes only the public API.
// ---------------------------------------------------------------------------

const pkg = JSON.parse(readFileSync(`${root}/package.json`, "utf8"));
const entries = Object.keys(pkg.exports).sort();
if (JSON.stringify(entries) !== JSON.stringify([".", "./package.json"])) {
  throw new Error(
    `package.json exports must expose only "." and "./package.json", got: ${entries.join(", ")}`,
  );
}
const dot = pkg.exports["."];
for (const condition of Object.keys(dot)) {
  if (!["types", "import", "require", "default"].includes(condition)) {
    throw new Error(
      `package.json exports["."] has unexpected condition "${condition}"`,
    );
  }
}
if (
  dot.types === undefined ||
  dot.import === undefined ||
  dot.require === undefined
) {
  throw new Error(
    'package.json exports["."] must be types-first (types, import, require)',
  );
}

// ---------------------------------------------------------------------------
// 3. No bare imports (zero runtime dependencies) and source maps present.
// ---------------------------------------------------------------------------

const jsFiles = (dir) =>
  readdirSync(`${root}/dist/${dir}`).filter((f) => f.endsWith(".js"));

const bareImport = (source) =>
  /(?:from\s+|import\s*\(?\s*|require\(\s*)['"][^.\/]['"]/.test(source);

for (const dir of ["esm", "cjs"]) {
  for (const file of jsFiles(dir)) {
    const source = readFileSync(`${root}/dist/${dir}/${file}`, "utf8");
    if (bareImport(source)) {
      throw new Error(
        `${dir}/${file}: contains a bare (external) import — dist must be dependency-free`,
      );
    }
    if (!readdirSync(`${root}/dist/${dir}`).includes(`${file}.map`)) {
      throw new Error(`${dir}/${file}: missing its source map`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Declaration files are emitted and mapped.
// ---------------------------------------------------------------------------

const typeFiles = readdirSync(`${root}/dist/types`);
const declarations = typeFiles.filter((f) => f.endsWith(".d.ts"));
if (declarations.length === 0) {
  throw new Error("dist/types: no .d.ts declarations emitted");
}
for (const file of declarations) {
  if (!typeFiles.includes(`${file}.map`)) {
    throw new Error(`dist/types/${file}: missing its declaration map`);
  }
}

// ---------------------------------------------------------------------------
// 5. Nothing Apache-2.0-derived or WinBox-fork-residual ships.
// ---------------------------------------------------------------------------

const SHIPPED = ["dist", "src", "README.md", "LICENSE", "package.json"];
const FORBIDDEN = [/winbox/i, /apache/i];

const filesUnder = (dir) => {
  const out = [];
  const stack = [`${root}/${dir}`];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const full = `${current}/${entry}`;
      if (statSync(full).isDirectory()) {
        stack.push(full);
      } else {
        out.push(full);
      }
    }
  }
  return out;
};

const shippedFiles = [];
for (const path of SHIPPED) {
  const full = `${root}/${path}`;
  if (statSync(full).isDirectory()) {
    shippedFiles.push(...filesUnder(path));
  } else {
    shippedFiles.push(full);
  }
}

for (const file of shippedFiles) {
  const source = readFileSync(file, "utf8");
  for (const pattern of FORBIDDEN) {
    if (pattern.test(source)) {
      throw new Error(
        `${file.replace(`${root}/`, "")}: contains "${pattern}" — Apache-2.0 / fork residue must not ship`,
      );
    }
  }
}

console.log(
  "dist ESM and CJS both construct a window with zero external imports; " +
    "exports map is public-API-only; d.ts and source maps present; no fork residue",
);
