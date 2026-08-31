# 06 — Accessibility contract docs and changelog

**What to build:** The consumer-facing documentation of v1.1 — the reference section the whole effort promised, the README condensation, and the migration notes.

**Blocked by:** 01–05 (the contract's content is the summary of what they changed).

**Status:** done

- [x] New top-level "Accessibility contract" section in `reference.md`, after the headless contract, covering exactly the five consumer-side items: focus-visible styling on `mcrw`, `mcrw-header`, `mcrw-btn-*`, `mcrw-taskbar`, and `mcrw-taskbar-item` (plus any consumer-owned `fallbackFocus` targets); `mcrw-focused` as visual-only (semantic focus is DOM focus per ADR-0010); non-drag affordances composed from the public `moveTo`/`resizeFrom` (WCAG 2.5.7); the native-button reset keyed to `mcrw-btn-*`/`mcrw-taskbar-item` (required before system.css/classicy-tier cultivar mapping, per the research verdicts — which also pin `aria-label` on controls as mandatory in every mapping; microw supplies it via the labels bag); `setControlLabels` as the i18n surface for all a11y copy.
- [x] README gains a one-paragraph a11y summary pointing at the section.
- [x] Changelog/migration notes for v1.1: semver-minor framing (class contract unchanged), new focusable elements, new options/labels, reset requirement.
- [x] CONTEXT.md, ADR-0010, and the wayfinder records are already landed — verify the docs don't contradict them rather than rewriting them.
