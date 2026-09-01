# 04: Consumer-facing docs — the "Global listeners" section

**What to build:** The listener API reads as one coherent contract: a single "Global listeners" section in the reference docs covering all four statics, the timing-guarantee table (option callback before global listener; `onCreate` sees a mounted window; snapshots settled; `destroyAll()` equivalence; throwing listeners propagate), the deliberate geometry omission, and a README example showing the dialogue-style reaction pattern (subscribe once, branch on a window the session did not create). The demo is out of scope — docs only. Spec: `.scratch/global-listeners/spec.md`.

**Blocked by:** 01 — Lifecycle listeners; 02 — State listener; 03 — Focus listener

**Status:** ready-for-human (implemented, reviewed, committed)

- [x] `docs/reference.md` has one "Global listeners" section documenting all four statics, signatures, unsubscribe semantics, and the timing guarantees in one place. (Ticket "01 — lifecycle listeners" already created the two-static stub; extend it rather than replacing it — see its Comments.)
- [x] `README.md` carries a short example of the subscribe-once pattern with a narrative-style reaction.
- [x] The geometry omission is stated as deliberate, not missing.
- [x] The timing table records listener ordering within a channel (subscription order; the taskbar subscribes at its creation) and the throw-during-teardown caveat.
- [x] Cross-event interleaving on close (focus hand-off before `onclose`) is documented in one sentence.
- [x] Changelog sweep: every commit in the feature has its Unreleased entry; the section reads as one feature, not four patches.
- [x] Prettier-clean docs (`npx prettier --check`).

## Comments

- 2026-08-31: Implemented (commit "docs: the Global listeners section —
  one timing table, README pattern (ticket \"04 — consumer docs\")").
  reference.md's section restructured: coverage table of all four statics,
  subscription mechanics, the per-static timing-guarantee table, the
  no-op list, the hand-off ordering, and the geometry omission. README
  gained the statics pointer and the subscribe-once example. The three
  per-ticket changelog entries merged into one feature entry naming all
  three tickets.
- 2026-08-31: Two-axis review — both reviewers converged on the same two
  partials (taskbar-subscription anchor and the hand-off-before-`onclose`
  ordering absent from the timing facts); both added. The spec reviewer
  also caught the overbroad "throw aborts teardown mid-way" claim — a
  public listener fires at the method's last statement, so the precise
  statement is "a throw skips that event's remaining listeners, and a
  throw inside `destroyAll()` aborts the loop"; docs now say exactly
  that. The duplicated statics rows in the Statics table were collapsed
  to a pointer into the Global listeners section.
