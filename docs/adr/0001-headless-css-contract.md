# Headless CSS contract — no shipped stylesheet

microw ships no stylesheet: `mcrw-*` classes (class prefix per [ADR-0008](0008-css-class-prefix-mcrw.md)) form a structural contract consumers style globally, and the library never injects styles. This is the rewrite's core identity (framework-agnostic, zero-dependency), deliberately avoiding bundled themes, icons, and a default look. Consumers must style everything themselves; a default theme or theme system is explicitly out of v1 scope.

**Scope of "no styles":** the rule governs _static_ CSS — appearance (colors, fonts, borders) and fixed structure (`position`, `isolation`, `display`) — which the consumer owns via the `mcrw-*` class contract. The library writes only its dynamic, per-window _values_ to the `style` attribute: geometry (`left`/`top`/`width`/`height`) and stacking (`z-index`). `position: absolute` and `isolation: isolate` on `.mcrw` are consumer CSS, like the root's `position: relative` + `isolation: isolate`.
