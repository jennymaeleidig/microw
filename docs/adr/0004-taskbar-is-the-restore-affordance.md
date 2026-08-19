# Taskbar is the only restore affordance

Restore is consumer-reachable only through the shipped taskbar component (`MicroW.taskbar(root)`): minimize is class-only, the window header ships no restore button, and the shade dock is gone. Keeping restore out of the window preserves headlessness — the window is pure state + DOM, and any app can substitute its own affordance, though v1 ships one to keep minimized windows reachable. The taskbar's item-click maps to `restore()` (min) or `focus()` (normal/max).

## Amendment (ticket 03)

The header ships no _dedicated_ restore button, but a shipped **max control may toggle** `normal ↔ max`. The max button is not a restore affordance (ADR-0004's exclusion was aimed at the shade-dock idiom); it is the natural pairing with `maximize()` — clicking it while `max` restores to `normal`. Restore for minimized windows remains taskbar-only.

## Amendment (ticket 15)

Clicking a `max` item now **focuses** the window rather than restoring it: a maximized window is already visible, so the taskbar switches to it instead of dropping it out of `max`. Restore stays the taskbar's job only for `min` items; `normal` and `max` items both focus.
