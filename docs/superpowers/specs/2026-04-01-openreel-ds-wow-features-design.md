# OpenReel DS — WOW Features Design Spec

## Summary

Add 12 premium interactive features to the OpenReel Design System, split into two layers: enhancements to `openreel-effects.js` (JS-powered interactions) and new CSS utilities in `openreel-motion.css`. All opt-in, all non-breaking.

## Goals

1. Add game-changing interactions: dark mode radial reveal, command palette, view transitions
2. Add premium-feel effects: 3D tilt, magnetic buttons, gradient borders, cursor glow
3. Add polish/delight: scroll progress, animated counters, noise grain, glassmorphism, anatomy mode
4. Keep zero-build, CDN-based architecture
5. Everything activates via `data-or-*` attributes or `.or-*` utility classes

## Non-Goals

- Changing existing component designs or tokens
- Adding new npm dependencies
- Modifying the MCP server tools (this round is purely visual/interactive)

---

## Feature 1: Dark Mode Radial Reveal

**Activation:** Replace existing `toggleDarkMode()` in page JS.

When the dark mode toggle is clicked, instead of instant class swap:
1. Get click position (center of toggle button)
2. Create a full-viewport overlay with the target theme's `--bg-primary`
3. Animate `clip-path: circle()` expanding from click position to cover viewport
4. At animation midpoint, swap `html.dark` class
5. Remove overlay

Duration: 500ms. Easing: ease-out. Uses CSS `clip-path` animation (GPU-accelerated).

Fallback: if `prefers-reduced-motion`, instant swap (current behavior).

**Implementation:** Add `initDarkModeReveal()` to `openreel-effects.js`. Replaces any existing `toggleDarkMode` function on the page.

---

## Feature 2: Command Palette (Cmd+K)

**Activation:** Auto-initializes when `openreel-effects.js` loads. Scans the page for `[data-or-cmd]` entries or builds from navigation links.

UI: Fixed overlay with search input, fuzzy-matched results list, keyboard navigation.

**Structure:**
```html
<div class="or-cmd-palette">
  <div class="or-cmd-backdrop"></div>
  <div class="or-cmd-dialog">
    <input class="or-cmd-input" placeholder="Search components, pages..." />
    <div class="or-cmd-results">
      <div class="or-cmd-item" data-action="navigate" data-url="#buttons">
        <span class="or-cmd-icon">→</span>
        <span class="or-cmd-label">Buttons</span>
        <span class="or-cmd-hint">Component</span>
      </div>
    </div>
  </div>
</div>
```

**Behavior:**
- `Cmd+K` (Mac) / `Ctrl+K` (Windows) opens
- `Escape` closes
- Arrow keys navigate, `Enter` selects
- Fuzzy search across: component sections (`h2` elements), navigation links, custom `[data-or-cmd]` items
- Actions: navigate (scroll to section), link (open page), toggle dark mode, copy code

**Styling:** Uses existing DS tokens. Modal-style backdrop blur. Brand-colored focus ring on active item.

---

## Feature 3: View Transitions API

**Activation:** Auto-initializes. Intercepts clicks on `<a>` tags pointing to other `.html` pages within the DS.

**Behavior:**
- Uses `document.startViewTransition()` for same-origin navigation
- Crossfade transition: old page fades out, new page fades in (200ms)
- Fallback: standard navigation if View Transitions API not supported
- CSS rules added:

```css
::view-transition-old(root) { animation: or-vt-fade-out 200ms ease-out; }
::view-transition-new(root) { animation: or-vt-fade-in 200ms ease-in; }
```

---

## Feature 4: 3D Card Tilt

**Activation:** `data-or-tilt` attribute on any element.

**Behavior:**
- On mousemove: calculate cursor position relative to element center
- Apply `transform: perspective(800px) rotateX(Xdeg) rotateY(Ydeg)`
- Max rotation: 5deg (subtle). Configurable via `data-or-tilt-max="10"`.
- On mouseleave: animate back to flat (300ms ease-out)
- Optional glare effect: `data-or-tilt-glare` adds a semi-transparent gradient overlay that follows cursor

**Implementation:** `initTilt()` in `openreel-effects.js`.

---

## Feature 5: Magnetic Buttons

**Activation:** `data-or-magnetic` attribute.

**Behavior:**
- When cursor is within 50px of button center, button translates toward cursor
- Max displacement: 8px
- On mouseleave: spring back to origin (250ms ease-spring)
- Uses `transform: translate(Xpx, Ypx)` for GPU compositing

**Implementation:** `initMagnetic()` in `openreel-effects.js`.

---

## Feature 6: Gradient Border Animation

**Activation:** CSS class `.or-gradient-border` or `data-or-gradient-border`.

**Behavior:**
- Uses `background: conic-gradient(from var(--angle), ...)` with `@property --angle` animated 0→360deg
- Colors: brand → blue → brand (or custom via `data-or-gradient-border-colors`)
- Applied as a pseudo-element border (element gets 1px padding, pseudo has gradient bg, inner content covers)
- Rotation speed: 3s per revolution
- Activates on hover or focus (not always spinning — saves CPU)

**Implementation:** CSS in `openreel-motion.css` (uses `@property` for Houdini animation).

---

## Feature 7: Cursor Glow

**Activation:** `data-or-glow` on a container.

**Behavior:**
- Tracks mouse position within container
- Renders a radial gradient at cursor position: `radial-gradient(300px circle at Xpx Ypx, rgba(31,18,222,0.08), transparent)`
- Applied as a pseudo-element overlay (pointer-events: none)
- Color configurable: `data-or-glow-color="#1F12DE"`
- Size configurable: `data-or-glow-size="300"`

**Implementation:** `initGlow()` in `openreel-effects.js`.

---

## Feature 8: Scroll Progress Bar

**Activation:** `data-or-scroll-progress` on `<body>` or any scroll container.

**Behavior:**
- Fixed thin bar (3px) at top of viewport
- Width = scroll percentage (0-100%)
- Color: `--brand` (or configurable)
- Smooth width transition
- Hidden at top (0%) and auto-hides after 2s idle

**Implementation:** `initScrollProgress()` in `openreel-effects.js`. Creates the element dynamically.

---

## Feature 9: Animated Counters

**Activation:** `data-or-counter` on numeric text elements.

**Behavior:**
- When element enters viewport, counts from 0 to target number
- Target extracted from `textContent` or `data-or-counter-to`
- Duration: 1.5s with ease-out deceleration
- Supports: integers, decimals (1 decimal place), percentages, currency prefix
- Optional suffix: `data-or-counter-suffix="%"`
- Uses `requestAnimationFrame` for smooth 60fps counting

**Implementation:** `initCounters()` in `openreel-effects.js`.

---

## Feature 10: Noise/Grain Texture

**Activation:** CSS class `.or-grain`.

**Behavior:**
- Applies a subtle SVG noise texture as a pseudo-element overlay
- SVG `<feTurbulence>` filter inlined as data URI
- Opacity: 0.03 (barely visible, adds depth)
- `pointer-events: none`, `position: absolute`, `inset: 0`
- Works on both light and dark mode (opacity adjusts)

**Implementation:** CSS in `openreel-motion.css`.

---

## Feature 11: Glassmorphism

**Activation:** CSS class `.or-glass`.

**Behavior:**
- `backdrop-filter: blur(12px) saturate(180%)`
- `background: rgba(255, 255, 255, 0.7)` (light) / `rgba(12, 17, 29, 0.7)` (dark)
- `border: 1px solid rgba(255, 255, 255, 0.2)` (light) / `rgba(255, 255, 255, 0.08)` (dark)
- Variants: `.or-glass-sm` (blur 8px), `.or-glass-lg` (blur 20px)

**Implementation:** CSS in `openreel-motion.css`.

---

## Feature 12: Component Anatomy Mode

**Activation:** Keyboard shortcut `Shift+A` or `data-or-anatomy` attribute on a container.

**Behavior:**
- Toggles an overlay on `.or-*` components showing:
  - Padding values (displayed at edges)
  - Border-radius values (displayed at corners)
  - Gap values (displayed between children)
  - CSS class name (displayed as a label above)
- Overlay styling: semi-transparent brand-colored boxes for spacing, monospace labels
- Toggle on/off with same shortcut
- Only scans elements within the anatomy container (or entire `<main>` by default)

**Implementation:** `initAnatomy()` in `openreel-effects.js`. Reads computed styles.

---

## File Changes

| File | Changes |
|------|---------|
| `js/openreel-effects.js` | Add 9 new init functions: darkModeReveal, commandPalette, viewTransitions, tilt, magnetic, glow, scrollProgress, counters, anatomy |
| `css/openreel-motion.css` | Add: gradient-border animation, noise/grain overlay, glassmorphism utilities, view-transition keyframes |
| `css/openreel.css` | Add command palette component styles (`.or-cmd-*`) |
| `CLAUDE.md` | Document all 12 features |

## Architecture Notes

- All JS features are in `openreel-effects.js` — no new files
- All CSS features are in `openreel-motion.css` — no new files
- Command palette styles go in `openreel.css` since it's a component, not motion
- Dark mode reveal replaces the page-level `toggleDarkMode()` function
- View Transitions uses progressive enhancement — zero impact if unsupported
