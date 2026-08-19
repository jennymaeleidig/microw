# 01 — Scaffold: fork removal, package, build, headless test seam

**What to build:** The repository becomes the microw package with nothing of the old fork left, a working build pipeline, and a deterministic test harness — so that every later ticket can be developed, built, and verified as a self-contained slice.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The WinBox fork tree (old `src/`, `dist/`, `demo/`, `task/`, `index.html`, `CHANGELOG.md`, `.github/`, fork `package.json`/`README.md`) is removed; nothing Apache-2.0-derived ships.
- [x] The repo root `package.json` is microw's own: name `microw`, `license: CC0-1.0`, a types-first `exports` map, and build/test scripts. README is rewritten as microw's (no WinBox heritage).
- [x] Distribution builds from TypeScript `strict` via `tsc` and emits ESM + CJS + `.d.ts` + source maps — verified by running the build and importing both formats.
- [x] Prettier (defaults) formats the tree; `.prettierignore` excludes build artifacts and dependency dirs; a Prettier check passes.
- [x] The headless test seam exists: jsdom with stubbed layout (`getBoundingClientRect`, `clientWidth`/`clientHeight`, `clientLeft`/`clientTop` as controllable doubles) plus injectable ResizeObserver and window-resize signals and pointer-event helpers, so geometry-dependent behavior is testable without a real browser.
- [x] A first smoke test is green through the harness: constructing a window with no geometry mounts a `.mcrw` element into `document.body`, proving the seam and the pipeline end to end.

## Answer

The repo is now the microw package. Fork tree removed in `56148dd`; package (`microw`, CC0-1.0), dual-format `tsc` build (ESM + CJS + `.d.ts` + source maps, zero runtime deps, verified by `npm run verify:dist` importing both dist formats and constructing a window), Prettier-clean tree, and the headless seam (`test/support/seam.ts` — `createSeam()` with per-element layout doubles, injectable `FakeResizeObserver`, `fireWindowResize`, pointer helpers) land in the scaffold commit. The smoke test (`test/smoke.test.ts`) is green through the seam. Notes for later tickets: TS 7 requires an explicit `rootDir`; `MicroW` creates its element from `root.ownerDocument` so an explicit root works without global `document`; CJS output needs the nested `dist/cjs/package.json` `{"type":"commonjs"}` marker.
