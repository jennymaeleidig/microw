# Model focus directs DOM focus

microw v1.0 kept focus purely model-level ("never real DOM focus",
ADR-0009) — which strands browser focus on `body` after minimize, restore,
and last-close, failing WCAG 2.4.3. v1.1 makes model focus drive real DOM
focus one-way: focusing a window moves DOM focus to its container
(`tabindex="-1"`, `preventScroll`); when no window can receive focus, it
falls to the taskbar element, overridable via a `fallbackFocus` option.
DOM focus never feeds back into the model.

Supersedes the focus-isolation stance of ADR-0009; its state model, hand-off
order (MRU, non-minimized), and taskbar-as-restore-affordance (ADR-0004) are
unchanged. Rejected: focusing the first focusable descendant (fragile,
content-dependent) and focusing the consumer's root element (invasive DOM
the library doesn't own).
