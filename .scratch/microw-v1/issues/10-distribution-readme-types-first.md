# 10 — Distribution verification, README, types-first pass

**What to build:** The finished library is consumable as promised — plain-JS and TypeScript apps alike import it and get working windows plus compile-checked types — with README and packaging telling the headless story and the shipped surface matching the spec exactly.

**Blocked by:** 09 — Re-clamping on root/viewport resize.

**Status:** resolved

- [x] Compiled ESM and CJS both import cleanly from the package boundary and create functioning windows with zero runtime dependencies (verified with a plain consumer that imports nothing else).
- [x] A TypeScript consumer is compile-checked against the shipped `.d.ts`: every option, callback, and static has an exported type, and the `exports` map exposes only the public API.
- [x] README documents the headless contract — `mcrw-*` classes, the root-geometry requirements, `MicroW` construction, the taskbar, and the API surface — with no reference to WinBox and no bundled styling.
- [x] `package.json` is final: name `microw`, `license: CC0-1.0`, zero runtime dependencies, no UMD, and the `mcrw-*` class contract is what consumers are told to style.
- [x] Framework sanity check: a window survives a re-render / change-detection pass in at least one framework without the library interfering (the library owns only its DOM and state; framework-scoped styles can't strip the window's structure).
- [x] A final pass confirms no Apache-2.0-licensed code or fork residue ships anywhere.

## Answer

The distribution is verified end to end with three new `scripts/` checks, plus a rewritten README and a final `package.json`.

**ESM + CJS, zero deps** — `scripts/verify-dist.mjs` (existing, extended) imports both `dist/esm/index.js` and `dist/cjs/index.js` and constructs a window in a fresh jsdom document, then scans the emitted JS for bare imports (nothing but relative paths) and asserts source maps and `.d.ts` declarations are all present.

**Types-first** — `scripts/types-consumer/consumer.ts` is a TypeScript consumer compiled (type-checked only) against the shipped `dist/types/index.d.ts` via a `paths` alias to the package name, exercising every option, callback, and static — the full `MicroWOptions`, `WindowEventCallback` / `WindowGeometryCallback`, `Taskbar`, `CascadeOptions`, `TaskbarOptions`, all scalar option unions, and every static. `npm run verify:types` compiles it. The exports map is enforced in `verify-dist` to expose only `.` and `./package.json`, types-first (`types`/`import`/`require`).

**README** — rewritten to document the headless `mcrw-*` contract (structure, state, and resize classes), the root-geometry requirements (`position: relative` + `isolation: isolate`, padding-edge coordinates, border correction, translation-only transforms, work-area clamping), `MicroW` construction with the full options table, the taskbar with its class hooks and a reference recipe, the complete API surface, and the framework note — no WinBox reference, no bundled styling.

**`package.json`** — confirmed final: name `microw`, `license: CC0-1.0`, zero runtime dependencies (only devDependencies), no UMD, `files: ["dist", "src"]`, and the `mcrw-*` class contract is what the README tells consumers to style. Added `verify:types`, `verify:framework`, and a `prepublishOnly` gate (build → typecheck → test → verify:dist → verify:types).

**Framework sanity check** — `scripts/verify-framework.mjs` mounts a React 19 app in jsdom, creates a `MicroW` in a ref-managed node React renders once and never reconciles over, then runs repeated `setState` re-renders and asserts the `.mcrw` element is the same object with `.mcrw-header`/`.mcrw-body`/controls/handles intact and the window still transitions (`maximize`/`restore`). React and `@types/react`/`react-dom` are devDependencies only — the runtime stays zero-dependency.

**No residue** — `verify-dist` scans every shipped file (`dist/`, `src/`, `README.md`, `LICENSE`, `package.json`) for `winbox`/`apache` (case-insensitive); `npm pack --dry-run` confirms only `dist` + `src` + `README` + `LICENSE` + `package.json` ship (74 files, 40.7 kB). `LICENSE` is CC0-1.0.

Full pipeline green: 154 tests, `typecheck`, `build`, `verify:dist`, `verify:types`, `verify:framework`.
