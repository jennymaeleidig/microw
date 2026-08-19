# Container-relative coordinates, root fixed at construction

Window coordinates and bounds are always relative to the constructing root; there is no `position: fixed` / document-relative escape hatch, and a window's root never changes (no re-parenting). Per-pointer-event `getBoundingClientRect()` conversion keeps dragging correct under scroll and re-layout, which a cached document-relative model could not. Document-level placement and moving windows between containers are consumer problems, solved by choosing a root up front.
