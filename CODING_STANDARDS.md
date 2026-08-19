# CODING_STANDARDS.md

Coding standards for **microw v1.0** — the zero-dependency, headless, framework-agnostic window management microframework. Everything that ships must be CC0-1.0; never copy Apache-2.0-licensed code into new files.

## Formatting: Prettier

All source, config, and documentation files are formatted with **Prettier, default options**. No custom `.prettierrc` — if a file does not match Prettier defaults, it is unformatted.

- Run: `npx prettier --write .` before committing; CI may check with `npx prettier --check .`.
- Do not hand-format files that Prettier already covers, and do not fight the formatter with disable comments unless a code block's structure is genuinely clearer unformatted (rare; justify it).
- Files outside the rewrite — `dist/`, `node_modules/`, build artifacts — are excluded via `.prettierignore`; never reformat them (see the note below).
- Agent edit pipelines may auto-format markdown on write. That is acceptable **iff** the result matches Prettier defaults; when it produces a huge unrelated diff, restore the file and apply the edit minimally instead. Keep diffs to what the change actually is.

## TypeScript

- **Language**: TypeScript (`strict: true`) is the source of truth (see [ADR-0007](docs/adr/0007-typescript-source-transpiled-to-js.md)); `tsc` transpiles the distribution to plain JavaScript so downstream consumers can use either language. TypeScript is dev-only — the shipped runtime has zero dependencies.
- **Distribution**: `tsc` emits ESM + CJS + `.d.ts` + source maps; the npm package also ships the `.ts` source. The public API is types-first: every option, callback, and static gets an exported type from the spec's API surface (see [04 — API Surface Design](.scratch/microw-v1/issues/04-api-surface-design.md)). No bundler, no UMD.
- **No `any`**: if a boundary genuinely escapes typing (a DOM/third-party edge), type it as narrowly as possible and justify the escape; no `@ts-ignore` / `@ts-expect-error` as a habit.
- **Module format**: source is ESM; one module per concern; no globals leaked to `window`.
- **Naming**: constructor `MicroW`, project `microw`. Methods `minimize/maximize/restore/moveTo/resizeTo/resizeFrom/getState/destroy`, chainable; callbacks `oncreate/onmaximize/onminimize/onrestore/onclose/onfocus/onblur/onmove/onresize`.
- **No comments unless they earn their place**: standard-library code reads itself; comments explain _why_, never _what_.
- **Errors**: fail loudly with `Error`/`TypeError` on invalid options; no silent fallbacks.
- **State**: `normal`/`min`/`max` mutually exclusive; focus the only orthogonal state (see [09 — Domain Model Flesh-Out](.scratch/microw-v1/issues/09-domain-model-flesh-out.md)).

## DOM and CSS contract

Headless: no inline _static_ CSS — the library writes only its dynamic geometry (`left`/`top`/`width`/`height`) and the `z-index` stacking carve-out (see [ADR-0003](docs/adr/0003-root-scoped-stacking.md)). All other styling is downstream.

- Class prefix `mcrw-*`; structure is the contract: `.mcrw`, `.mcrw-header` (drag surface), `.mcrw-title`, `.mcrw-body`, `.mcrw-resize-*` (8 compass handles), `.mcrw-btn-*` controls.
- State classes exactly `mcrw-min` / `mcrw-max` / `mcrw-focused`; normal state carries no class.
- Windows are `position: absolute` inside a `position: relative` root; two-level stacking isolation — the root and every window establish their own via `isolation: isolate` (ADR-0003); container-relative coordinates only, per-event `root.getBoundingClientRect()` (see [ADR-0002](docs/adr/0002-container-relative-only-coordinates.md) and [02 — Coordinate and Bounding Model](.scratch/microw-v1/issues/02-coordinate-bounding-model.md)).
- Never style with IDs; never attach behavior via inline `on*` attributes.

## Documentation

- Decisions live in ADRs (`docs/adr/NNNN-short-name.md`), one decision per file, newest number last — see [domain doc conventions](docs/agents/domain.md).
- Issues live in `.scratch/<feature>/` per the [issue tracker doc](docs/agents/issue-tracker.md); the [map](.scratch/microw-v1/map.md) is the single source of truth for effort scope.
- Prose is written for both humans and agents: concrete, imperative, no filler. When editing `AGENTS.md` or skills, follow the writing-for-agents conventions.
- Refer to tickets and decisions **by name** (title), not by bare id.

## License

- New code is CC0-1.0 (SPDX `CC0-1.0`); no license header comments required (optional short `// SPDX-License-Identifier: CC0-1.0`).
- Never copy Apache-2.0-licensed code — derive behavior from the spec.
