# Overlay Animations — Design Spec

## Goal

Add snappy, professional entrance/exit animations to all overlay components in the OpenReel Design System. Style: Linear/Vercel — short durations, sharp easings, no bounce.

## Animation Language

**Shared timing tokens:**
```css
--or-duration-fast: 150ms;
--or-duration-base: 200ms;
--or-duration-slow: 300ms;
--or-easing-out: cubic-bezier(0.2, 0, 0, 1);
--or-easing-in: cubic-bezier(0.4, 0, 1, 1);
```

All overlays use these tokens. No hardcoded durations.

## Components

### 1. Modal

**File:** `index.html` — `.or-modal-backdrop`, `.or-modal`

**Entrance:**
- Backdrop: `opacity 0 → 1` over `--or-duration-base` with `--or-easing-out`
- Dialog: `opacity 0 → 1` + `scale(0.96) → scale(1)` over `--or-duration-base` with `--or-easing-out`

**Exit:**
- Dialog: `opacity 1 → 0` + `scale(1) → scale(0.96)` over `--or-duration-fast` with `--or-easing-in`
- Backdrop: `opacity 1 → 0` over `--or-duration-fast` with `--or-easing-in`

**JS behavior:**
- Opening: add class `.or-modal--open` to backdrop
- Closing: add class `.or-modal--closing`, wait for `animationend`, then remove both classes and hide

**CSS implementation:**
```css
.or-modal-backdrop {
  opacity: 0;
  transition: opacity var(--or-duration-base) var(--or-easing-out);
}
.or-modal-backdrop.or-modal--open {
  opacity: 1;
}
.or-modal-backdrop.or-modal--closing {
  opacity: 0;
  transition-duration: var(--or-duration-fast);
  transition-timing-function: var(--or-easing-in);
}

.or-modal {
  opacity: 0;
  transform: scale(0.96);
  transition: opacity var(--or-duration-base) var(--or-easing-out),
              transform var(--or-duration-base) var(--or-easing-out);
}
.or-modal--open .or-modal {
  opacity: 1;
  transform: scale(1);
}
.or-modal--closing .or-modal {
  opacity: 0;
  transform: scale(0.96);
  transition-duration: var(--or-duration-fast);
  transition-timing-function: var(--or-easing-in);
}
```

### 2. Drawer

**File:** `index.html` — `.or-drawer-overlay`, `.or-drawer-panel`

**Entrance:**
- Overlay: `opacity 0 → 1` over `--or-duration-base`
- Panel: `translateX(100%) → translateX(0)` over `--or-duration-slow` with `--or-easing-out` (right drawer)

**Exit:**
- Panel: `translateX(0) → translateX(100%)` over `--or-duration-base` with `--or-easing-in`
- Overlay: `opacity 1 → 0` over `--or-duration-base`

**JS behavior:** Same open/closing class pattern as modal.

**CSS implementation:**
```css
.or-drawer-overlay {
  opacity: 0;
  transition: opacity var(--or-duration-base) var(--or-easing-out);
}
.or-drawer-overlay.or-drawer--open {
  opacity: 1;
}
.or-drawer-overlay.or-drawer--closing {
  opacity: 0;
  transition-timing-function: var(--or-easing-in);
}

.or-drawer-panel {
  transform: translateX(100%);
  transition: transform var(--or-duration-slow) var(--or-easing-out);
}
.or-drawer--open .or-drawer-panel {
  transform: translateX(0);
}
.or-drawer--closing .or-drawer-panel {
  transform: translateX(100%);
  transition-duration: var(--or-duration-base);
  transition-timing-function: var(--or-easing-in);
}
```

### 3. Tooltip

**File:** `index.html` — `.or-tooltip`

**Entrance:** `opacity 0 → 1` + `translateY(4px) → translateY(0)` over `--or-duration-fast` with `--or-easing-out`. Delay: `200ms` (prevents flicker on fast mouse-through).

**Exit:** `opacity 1 → 0` over `100ms` (instant feel, no delay).

**CSS implementation:**
```css
.or-tooltip {
  opacity: 0;
  transform: translateY(4px);
  transition: opacity var(--or-duration-fast) var(--or-easing-out),
              transform var(--or-duration-fast) var(--or-easing-out);
  transition-delay: 200ms;
  pointer-events: none;
}
.or-tooltip-wrap:hover .or-tooltip {
  opacity: 1;
  transform: translateY(0);
}
```

Note: top-positioned tooltips use `translateY(-4px)` instead.

### 4. Popover

**File:** `index.html` — `.or-popover`

**Entrance:** `opacity 0 → 1` + `scale(0.96) → scale(1)` + `translateY(-4px) → translateY(0)` over `--or-duration-fast`. Transform-origin from trigger position.

**Exit:** reverse, `--or-duration-fast` with `--or-easing-in`.

**CSS implementation:**
```css
.or-popover {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
  transform-origin: top center;
  transition: opacity var(--or-duration-fast) var(--or-easing-out),
              transform var(--or-duration-fast) var(--or-easing-out);
}
.or-popover.open {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### 5. Nav Dropdown (header)

**File:** All 14 files with navbar — `.nav-dropdown`

**Current:** Has `opacity` and `transform` but NO `transition` property. Fix by adding transition.

**Entrance:** `opacity 0 → 1` + `translateX(-50%) translateY(-4px) → translateX(-50%) translateY(0)` over `--or-duration-fast`.

**CSS fix:**
```css
.nav-dropdown {
  /* existing properties stay... add: */
  transition: opacity var(--or-duration-fast) var(--or-easing-out),
              transform var(--or-duration-fast) var(--or-easing-out),
              visibility 0s linear var(--or-duration-fast);
}
.nav-dropdown-trigger:hover .nav-dropdown,
.nav-dropdown-trigger:focus-within .nav-dropdown {
  /* existing... add: */
  transition-delay: 0s;
}
```

### 6. Command Palette

**File:** `index.html` — `.or-cmd-palette` (or equivalent)

**Entrance:** Backdrop `opacity 0 → 1`. Palette: `opacity 0 → 1` + `translateY(-8px) → translateY(0)` + `scale(0.98) → scale(1)` over `--or-duration-base`.

**Exit:** reverse, `--or-duration-fast`.

### 7. Toast (improvement)

**File:** `index.html` — `.ds-toast`

**Current:** Already has slide-up + fade (0.3s ease). Improve:

**New entrance:** `translateY(16px) → translateY(0)` + `opacity 0 → 1` over `--or-duration-base` with `--or-easing-out` (shorter distance, snappier).

**New exit:** `opacity 1 → 0` + `translateY(-8px)` over `--or-duration-fast` with `--or-easing-in` (exit upward, not downward).

**Auto-dismiss bar:** Add a shrinking progress bar at the bottom:
```css
.ds-toast-progress {
  position: absolute;
  bottom: 0; left: 0;
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  animation: toast-countdown linear forwards;
}
@keyframes toast-countdown {
  from { width: 100%; }
  to { width: 0%; }
}
```
Duration set via JS `style="animation-duration: 5s"`.

### 8. Keyboard Shortcuts Modal

**File:** `index.html` — `.kbd-modal-overlay`, `.kbd-modal`

Apply same pattern as Modal (#1). Currently instant — add fade + scale using the `--open`/`--closing` class pattern. Integrate with existing `openKbdModal()`/`closeKbdModal()` functions.

## JS Helper Function

All animated overlays share the same close pattern. Add one helper:

```javascript
function closeOverlay(overlay, closingClass, onDone) {
  overlay.classList.add(closingClass);
  overlay.addEventListener('transitionend', function handler(e) {
    if (e.target !== overlay && e.target !== overlay.querySelector('[class*="-panel"], [class*="-modal"], .kbd-modal')) return;
    overlay.removeEventListener('transitionend', handler);
    overlay.classList.remove(closingClass);
    if (onDone) onDone();
  }, { once: false });
}
```

This waits for the animation to finish before removing the overlay, so no janky instant-disappear.

## Demo Interactivity

Each overlay component in index.html needs a working demo button that opens/closes it using the animated pattern. Currently some demos are static HTML only. Add:

- "Open Modal" button → opens animated modal → close via X or backdrop click
- "Open Drawer" button → opens animated drawer → close via X or overlay click
- Tooltips already hover-triggered (just needs CSS fix)
- Popovers need click-to-toggle JS

## Scope Boundaries

**In scope:**
- CSS transitions/animations for all 8 overlay types
- JS open/close logic with entrance/exit animations
- Animation timing tokens in `:root`
- Working demos in index.html

**Out of scope:**
- Custom form controls (Bloque A)
- Micro-interactions like copy feedback, error shake (Bloque C)
- Responsive behavior changes
- Dark mode adjustments (overlays already use semantic tokens)

## Testing

- Open each overlay → animation plays smoothly
- Close each overlay → exit animation plays, then element is hidden
- Rapid open/close → no broken state or stuck overlays
- `prefers-reduced-motion: reduce` → all animations skip to final state
- Keyboard: Escape closes overlays with exit animation
- Dark mode: overlays render correctly in both themes
