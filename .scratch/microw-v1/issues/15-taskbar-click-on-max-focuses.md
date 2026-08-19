# 15 — Taskbar click on a maximized window focuses it, not restores

**What to build:** Clicking a `max` window's taskbar item should **focus** it — raise it to the top, move the `-focused` highlight, leave it maximized — rather than dropping it out of `max` back to its previous size. A maximized window is already visible, so the taskbar should switch to it, not restore it. Restore stays the taskbar's job only for `min` items.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Clicking a `max` item focuses the window (gains `mcrw-focused`, previously focused window blurs) and leaves it in `max` — geometry still fills the work area, `mcrw-max` still set.
- [x] Clicking a `min` item still restores it — unchanged (including the `max → min → restore → max` round-trip from ticket 14).
- [x] Clicking a `normal` item still focuses it — unchanged.
- [x] The v1 spec's taskbar rules, the ADR-0004 mapping, the `CONTEXT.md` taskbar-item definition, and the README taskbar paragraph are amended to say `min` restores and `normal`/`max` focus.
- [x] The headless seam gains a max-item-click test, and the full suite, `build`, `typecheck`, and `prettier --check` stay green.

## Answer

`Taskbar.handleClick` now branches on `min` only: a `min` item restores, and `normal`/`max` items focus.

**Library (`src/taskbar.ts`).** The click mapping changed from `restore()` (min/max) to `restore()` (min) or `focus()` (normal/max). A maximized window is already visible, so clicking its item focuses and raises it instead of dropping it out of `max`.

**Docs.** US 38, the spec's taskbar-semantics rule, `CONTEXT.md`'s taskbar-item definition, the README taskbar paragraph, and ADR-0004 (plus a new ticket-15 amendment) all now say `min` restores and `normal`/`max` focus.

**Tests.** A new headless-seam test clicks a `max` item and asserts the window stays in `max` (work-area fill + `mcrw-max`), gains focus, and blurs the previously focused window; the existing min-restores and normal-focuses tests are unchanged. Suite: 161 passing; `build`, `typecheck`, and `prettier --check` all clean.
