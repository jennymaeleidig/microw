# Architecture deepening: microw

Outcome of the 2026-08-31 architecture review (report: `/tmp/claude/architecture-review-20260831-141342.html`). Six deepening candidates from the v1.1 accessibility hot spot, grilled into decided designs. Vocabulary per codebase-design: module, interface, depth, seam, adapter, leverage, locality.

## Constraints (fixed)

- Zero dependencies, TypeScript, headless class contract unchanged.
- ADRs 0001–0010 stand; no candidate contradicts one. ADR-0010's observable semantics are frozen (focus-fallback work is structural only).
- ADR-0008 DOM class contract (`.mcrw-*`) unchanged — the 222 existing tests assert it and must survive unchanged.
- New seam-level tests are added for the focus-fallback ordering and the registry channels.

## Sequencing (decided)

**2 → 1 → 6 → 3 → 5 → 4** — one commit per candidate, tests green between each.

Dependency-respecting: 2 produces the internal `applyRect` that 5 needs; 1 absorbs the control-label usage that shrinks 6; 1 and 5 settle ownership before 4 designs its channels once. 3 is independent (slots anywhere; placed here for size).

## Cross-candidate interactions (checked, no conflicts)

| Interaction | Resolution |
|---|---|
| 2 → 5 | `applyRect` is the narrow internal apply step cascade re-placement calls. |
| 1 → 6 | Candidate 1 absorbs control-label consumption; 6 reduced to deleting `config.ts` only. |
| 1 → 4 | Taskbar's cheap single-writer projection (from 1) is a prerequisite for 4's per-channel sync. |
| 5 → 4 | Cascade owns its work-area watcher before 4 splits channels, so the membership channel is designed against final ownership. |
| 3 | Standalone; only decouples the handoff import — statics keep their `taskbar.ts` import for `MicroW.taskbar()`/`destroyTaskbars()`. |

## Decisions log

- **Q1 Sequencing**: accepted (above).
- **Q2 Controls scope**: the deepened module owns ALL window-state ARIA — header controls and taskbar items. Single writer, full stop.
- **Q3 Controls shape**: separate `src/controls.ts` module, per-window object created at construction. Chosen over private methods on `MicroW` (file already the churn magnet).
- **Q3b Controls interface** (design-it-twice, two parallel designs): **Way B — active projection — chosen** over Way A (passive model). Way A self-assessed as a lateral move for locality; Way B passes the deletion test (`control-state.ts` deleted, plus `appendControls`/`applyStateClasses`/`stripMinControl`). See ticket 01 for the interface and the accepted weaknesses (config channel is a documented single-subscriber chain; item-node two-writer ordering rule).
- **Q4 Geometry writer**: one internal `applyRect(rect)` — clamp, write geometry, fire `onresize` then `onmove` — callers compute target rects. `applyPlacement` deleted.
- **Q5 Cascade ownership**: cascade module owns re-placement AND the work-area watcher (`lastWorkArea` map + static init listener move); `MicroW.cascade()` stays a validation-and-dispatch facade. Cascade applies positions via type-only import calling `applyRect` (no second seam).
- **Q6 config/labels**: delete `config.ts` (one boolean, one consumer); KEEP `labels.ts` (two real consumers after 1; folding would force a value import `taskbar.ts → microw.ts`).
- **Q7 Focus fallback seam**: registration seam; semantics frozen at ADR-0010's three-tier priority (MRU non-min → taskbar → per-window `fallbackFocus` → documented no-op). Taskbar registers per-root on mount/unregisters on destroy; `fallbackFocus` registers per-window at construction. Handoff-only decoupling.
- **Q8 Registry channels**: three channels (membership / state / focus) inside `registry.ts` — no new events module.
- **Q9 Tests**: existing 222 survive unchanged; new seam-level tests for tickets 04 and 05 (see issue numbers below).
- **Q10 Commit discipline**: one commit per candidate, changelog entry per commit.

## Tickets

| # | File | Candidate | Strength |
|---|---|---|---|
| 01 | `issues/01-one-geometry-writer.md` | One geometry-and-callback writer | Strong |
| 02 | `issues/02-controls-projection.md` | Give the Control a model home (Way B) | Strong |
| 03 | `issues/03-fold-config.md` | Delete `config.ts` | Speculative |
| 04 | `issues/04-focus-fallback-seam.md` | A seam for focus fallback | Worth exploring |
| 05 | `issues/05-cascade-replacement.md` | Consolidate cascade re-placement | Worth exploring |
| 06 | `issues/06-registry-channels.md` | Split the registry's change channel | Worth exploring |
