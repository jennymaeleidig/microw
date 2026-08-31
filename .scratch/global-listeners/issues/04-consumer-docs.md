# 04: Consumer-facing docs — the "Global listeners" section

**What to build:** The listener API reads as one coherent contract: a single "Global listeners" section in the reference docs covering all four statics, the timing-guarantee table (option callback before global listener; `onCreate` sees a mounted window; snapshots settled; `destroyAll()` equivalence; throwing listeners propagate), the deliberate geometry omission, and a README example showing the dialogue-style reaction pattern (subscribe once, branch on a window the session did not create). The demo is out of scope — docs only. Spec: `.scratch/global-listeners/spec.md`.

**Blocked by:** 01 — Lifecycle listeners; 02 — State listener; 03 — Focus listener

**Status:** ready-for-agent

- [ ] `docs/reference.md` has one "Global listeners" section documenting all four statics, signatures, unsubscribe semantics, and the timing guarantees in one place. (Ticket "01 — lifecycle listeners" already created the two-static stub; extend it rather than replacing it — see its Comments.)
- [ ] `README.md` carries a short example of the subscribe-once pattern with a narrative-style reaction.
- [ ] The geometry omission is stated as deliberate, not missing.
- [ ] The timing table records listener ordering within a channel (subscription order; the taskbar subscribes at its creation) and the throw-during-teardown caveat.
- [ ] Cross-event interleaving on close (focus hand-off before `onclose`) is documented in one sentence.
- [ ] Changelog sweep: every commit in the feature has its Unreleased entry; the section reads as one feature, not four patches.
- [ ] Prettier-clean docs (`npx prettier --check`).
