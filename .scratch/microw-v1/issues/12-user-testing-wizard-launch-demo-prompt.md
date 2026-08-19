# 12 — User-testing wizard: launch demo, prompt to test

**What to build:** A developer runs one command and gets a live demo of microw in a real browser, then is walked through a short checklist of what to try — and nothing more. The wizard launches and prompts only: it asks no questions and records no answers.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] One npm script launches a live demo in a real browser (cross-platform URL opening), with no manual path or port copying.
- [x] The demo exercises the full v1 surface in one page: multiple windows, header drag, the eight resize handles, minimize/maximize/restore, close, the taskbar, and cascade.
- [x] The flow prompts the tester stage by stage with a concise checklist of what to try, then ends on confirmation — no questions are asked, no answers are captured or recorded.
- [x] The demo is styled with minimal consumer CSS, proving the headless contract holds in a real browser (structural `mcrw-*` classes present, the library writes no static styles).

## Answer

`npm run demo` builds the library and runs `scripts/serve-demo.mjs`, a zero-dependency Node static server that serves the repo and opens the demo in a real browser (cross-platform: `open` / `start` / `xdg-open`; `PORT` env override, falls back to any free port on `EADDRINUSE`, `--no-open`/`MICROW_DEMO_NO_OPEN=1` skips the browser for headless runs). No path or port is copied — the script opens the URL it serves.

`demo/` holds a single-page desktop (`index.html`, `demo.css`, `demo.js`): five explicit-position windows plus a taskbar at load, and a cascade stage that spawns four more windows via `MicroW.cascade({ mode: "cascade" })`. The page exercises the full v1 surface — multiple windows, header drag, the eight resize handles, minimize/maximize/restore, close, the taskbar, and cascade. A stage panel walks the tester through a concise checklist (Windows & drag → Resize → Minimize/maximize/restore → Focus & z-order → Close → Cascade → Done) and ends on a confirmation screen; no questions are asked and nothing is recorded. All appearance is consumer CSS keyed to `mcrw-*`; a headless audit on finish confirms every window's inline styles are only geometry (`left`/`top`/`width`/`height`) plus `z-index`, with no `<style>` injected.

Verified end to end: the full suite (154 tests), `typecheck`, `build`, and `prettier --check` stay green; a jsdom smoke of `demo.js` walks all seven stages and confirms the headless audit is clean.
