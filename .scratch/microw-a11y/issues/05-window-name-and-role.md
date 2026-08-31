# Window name and role (root cause A)

Type: grilling
Status: resolved

## Question

The window container is a plain unnamed `div` — no `role`, no accessible
name (audit items 1, 2, 3; item 2 is the WCAG 4.1.2 MUST). Decide:

- `role="dialog"` on the container (audit rec; matches the APG non-modal
  window shape) vs alternatives.
- Name source: `aria-labelledby` → the title element's id (what when no
  title is set — omit the attribute, `aria-label` fallback, or a config
  option?), and whether a title-less window is even allowed post-v1.1.
- The advisory layer that comes free: name from visible title bar text
  (item 3).

Smallest ticket; mostly confirmation of the audit's recommendation, but the
title-less-window case is a real decision. Evidence:
`docs/aria-conformance-audit.md` root cause A. Record the CSS impact note.

## Answer

Decided 2026-07 (grilling session, both sub-decisions agreed):

- **Role**: `role="dialog"` on the window container — the APG non-modal
  window shape; `aria-modal` stays absent (audit item 1 already met).
- **Name**: `title` stays optional — no new validation. When titled:
  `aria-labelledby` → the `mcrw-title` element, which gains an auto-assigned
  id (`mcrw-title-N`) since it exists but is unnamed today. When not:
  `aria-label` from the labels bag reusing `untitledWindow` (the fallback
  ticket 04 added for taskbar items) — every window is named, the two name
  sources can never disagree, and audit item 3 (name = visible title text)
  comes free. Windows with a consumer-supplied `id` keep it; the
  auto-ids only fill gaps.
- **CSS impact**: none beyond what tickets 02/03 already noted — the role
  and name are pure attributes.
