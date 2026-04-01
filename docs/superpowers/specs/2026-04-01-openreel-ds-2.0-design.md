# OpenReel Design System 2.0 — Design Spec

## Summary

Upgrade the OpenReel Design System across three layers: fix critical infrastructure bugs, add a CSS-only motion/visual polish layer, and provide an optional advanced effects layer (GSAP, Three.js, WebGL). Same design identity — refined execution.

## Goals

1. Fix all identified bugs (token collisions, semantic HTML, stale generators)
2. Extract shared CSS to eliminate 14-file duplication
3. Add professional motion layer (subtle, Linear/Stripe style)
4. Add optional advanced effects via data attributes
5. Keep the DS zero-build, CDN-based, static
6. Everything layered and opt-in

## Non-Goals

- Redesigning the visual identity (colors, typography, spacing stay the same)
- Adding a build system or bundler
- Breaking existing HTML that uses current `or-` classes

---

## Tier 1 — Bug Fixes & Infrastructure

### 1.1 Extract shared CSS file (`openreel.css`)

**Problem:** Tokens and component styles are duplicated inline across 14+ HTML files. No importable stylesheet exists.

**Solution:** Create `/css/openreel.css` containing:
- All `:root` token definitions (colors, typography, spacing, radius, shadows)
- Semantic color definitions for light mode (`:root`) and dark mode (`html.dark`)
- Base styles (reset, body, scrollbar)
- All `or-*` component class definitions

Each HTML file replaces its inline `<style>` block with:
```html
<link rel="stylesheet" href="css/openreel.css" />
```

The MCP `get_css_setup` tool returns the content of this file.

### 1.2 Fix token naming collisions in MCP `generateTokensCSS()`

**Problem:** `mcp/index.js:67` — `generateTokensCSS()` flattens tokens without category prefixes, causing collisions:
- `--sm` = `4px` (borderRadius) AND `--sm` = `0 1px 3px...` (shadow)
- `--md`, `--1`, etc. all collide

**Solution:** Add category prefixes matching the actual HTML usage:
- Spacing: `--space-1`, `--space-2`, etc.
- Border radius: `--radius-sm`, `--radius-md`, etc.
- Shadows: `--shadow-xs`, `--shadow-sm`, etc.
- Typography: `--text-xs`, `--font-medium`, `--leading-sm` (already correct)
- Colors: `--brand`, `--gray-500`, etc. (already correct)

Update `generateTokensCSS()`, `generateTokensSCSS()`, and `generateTokensTailwind()` to use these prefixes.

### 1.3 Fix `:root` dark values in `get_css_setup`

**Problem:** The MCP's `get_css_setup` output defines dark-mode semantic tokens (`--bg-primary: #0C111D`) in `:root`, then redefines them in `html.dark`. Light mode only works with explicit `html:not(.dark)`.

**Solution:** `:root` defines light values as default. `html.dark` overrides. Match the pattern already used in `index.html`.

### 1.4 Semantic HTML in code generators

**Problem:** `generateReactComponent()`, `generateVueComponent()`, `generateSvelteComponent()` all render `<div>` regardless of component type.

**Solution:** Add an `element` field to each component in `registry.json`:
```json
{ "slug": "button", "element": "button" }
{ "slug": "input", "element": "input" }
{ "slug": "sidebar-nav", "element": "nav" }
{ "slug": "table", "element": "table" }
```

Generators read `comp.element` (default: `"div"`) and use it as the root tag. Self-closing elements (`input`, `img`) handled separately.

### 1.5 Update Svelte generator to Svelte 5

**Problem:** Uses `$: classes = [...]` (Svelte 4 reactive syntax).

**Solution:** Update to Svelte 5 runes:
```svelte
<script>
  let { variant, size, children, ...props } = $props();
  const classes = $derived([...].filter(Boolean).join(' '));
</script>
```

### 1.6 Fix Vue type mapping

**Problem:** `mcp/index.js:189` maps all non-boolean/non-string types to `String`.

**Solution:**
```js
const typeMap = {
  boolean: "Boolean",
  string: "String",
  number: "Number",
  array: "Array",
  object: "Object"
};
const type = typeMap[p.type.split("|")[0]] || "String";
```

### 1.7 Enrich MCP guidelines

**Problem:** Guidelines returned by `get_guidelines` are 1-2 sentences. Insufficient for AI code generation.

**Solution:** Expand each guideline topic in `registry.json` to 200-400 words with:
- Concrete rules (not just principles)
- Code examples
- Do/don't patterns
- Token references

Topics to expand: `spacing`, `typography`, `color_usage`, `dark_mode`, `accessibility`, `responsive`, `motion`.

### 1.8 Sync tokens.json with registry.json

**Problem:** `tokens.json` (Tokens Studio format) has fields that `registry.json` lacks (composition, opacity, letterSpacing, borderWidth) and vice versa.

**Solution:** Generate `tokens.json` from `registry.json` at build time (add a `scripts/sync-tokens.js` script), or keep `registry.json` as the single source and derive `tokens.json` from it. Add the new motion tokens to both.

---

## Tier 2 — Motion & Visual Polish (`openreel-motion.css`)

### 2.1 Motion Design Tokens

New CSS custom properties in `:root`:

```css
/* Durations */
--duration-instant: 50ms;
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 300ms;

/* Easings */
--ease-default: cubic-bezier(0.2, 0, 0, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Colored shadows (accent-tinted) */
--shadow-brand-sm: 0 2px 8px rgba(31, 18, 222, 0.15);
--shadow-brand-md: 0 4px 14px rgba(31, 18, 222, 0.2);
--shadow-brand-lg: 0 8px 24px rgba(31, 18, 222, 0.25);
--shadow-success-sm: 0 2px 8px rgba(23, 178, 106, 0.15);
--shadow-error-sm: 0 2px 8px rgba(240, 68, 56, 0.15);
--shadow-warning-sm: 0 2px 8px rgba(181, 71, 8, 0.15);
```

### 2.2 Component Animations

All animations use CSS transitions/animations only. No JavaScript required.

#### Buttons (`or-btn`)
| State | Effect | Duration | Easing |
|-------|--------|----------|--------|
| Hover | `translateY(-1px)`, shadow-xs → shadow-sm | 200ms | ease-default |
| Active/Press | `translateY(0)`, `scale(0.98)` | 100ms | ease-default |
| Focus | brand ring fades in (box-shadow) | 150ms | ease-out |
| Disabled | opacity transition | 200ms | ease-default |
| Loading | spinner rotates, content fades to 0 | 200ms | linear (spin) |

Primary buttons on hover also transition to `--shadow-brand-sm`.

#### Inputs (`or-input`, `or-select`, `or-textarea`)
| State | Effect | Duration |
|-------|--------|----------|
| Focus | border-color → brand, shadow ring fades in | 150ms |
| Error | border + ring → error-red | 150ms |
| Invalid submit | subtle horizontal shake (3px, 2 cycles) | 300ms |
| Placeholder | opacity 0.7 → 0.4 on focus | 200ms |

#### Checkbox (`or-checkbox`)
- Check animation: SVG stroke draws in via `stroke-dashoffset` (200ms ease-out)
- Indeterminate dash slides in

#### Toggle (`or-toggle`)
- Thumb slides with ease-spring (250ms)
- Track color crossfades (150ms)

#### Select dropdown
- Opens: translateY(-4px → 0) + opacity 0→1 (150ms ease-out)
- Closes: opacity 1→0 (100ms ease-in)

#### Cards (`or-card`)
| State | Effect | Duration |
|-------|--------|----------|
| Hover (interactive) | `translateY(-2px)`, shadow-xs → shadow-md, border-color shift | 200ms |
| Hover (static) | border-color subtly lightens | 200ms |

#### Modal (`or-modal`)
- Enter: backdrop opacity 0→1 + backdrop-filter blur(0→8px), modal scale(0.95→1) + opacity | 200ms ease-out
- Exit: reverse | 150ms ease-in

#### Drawer (`or-drawer`)
- Slide from edge with ease-out (250ms)
- Backdrop fade (200ms)

#### Toast / Snackbar
- Enter: translateY(16px→0) + opacity | 250ms ease-out
- Exit: translateX(100%) + opacity | 200ms ease-in

#### Tooltip
- Show: translateY(4px→0) + opacity | 100ms ease-out
- Hide: opacity | 75ms ease-in

#### Dropdown menu
- transform-origin from trigger position
- Scale(0.95→1) + opacity | 120ms ease-out

#### Accordion
- Content: max-height transition + opacity | 200ms ease-default
- Chevron rotates (180deg) | 200ms

#### Tabs
- Active indicator bar slides horizontally between tabs (200ms ease-default)
- Content crossfades (150ms)

#### Progress bar
- Width transitions smoothly (300ms ease-out)
- Indeterminate: animated striped gradient sweep

#### Skeleton
- Shimmer gradient sweep (1.5s infinite, ease-in-out)

#### Badge
- Count update: scale bounce (1→1.15→1, 200ms ease-spring)

#### Notification badge (dot)
- Appear: scale(0→1) with ease-spring (250ms)

### 2.3 Colored Shadow Utility Classes

Optional classes that can be applied to any element:

```css
.or-shadow-brand { box-shadow: var(--shadow-brand-sm); }
.or-shadow-brand-md { box-shadow: var(--shadow-brand-md); }
.or-shadow-brand-lg { box-shadow: var(--shadow-brand-lg); }
.or-shadow-success { box-shadow: var(--shadow-success-sm); }
.or-shadow-error { box-shadow: var(--shadow-error-sm); }
.or-shadow-warning { box-shadow: var(--shadow-warning-sm); }
```

Hover variants: `.or-hover-shadow-brand` applies colored shadow only on hover, transitioning from neutral.

### 2.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Single rule, covers everything. Placed at the end of `openreel-motion.css`.

---

## Tier 3 — Advanced Effects (`openreel-effects.js`)

### 3.1 Architecture

Single JS file loaded via CDN or local. On DOMContentLoaded, scans for `data-or-*` attributes and lazy-loads the required libraries (GSAP, Three.js) only when needed.

```html
<!-- Only load if you use advanced effects -->
<script src="js/openreel-effects.js" defer></script>
```

Libraries loaded from CDN:
- GSAP + ScrollTrigger: `https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js`
- Three.js: `https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.min.js`

### 3.2 GSAP Scroll Animations

Data attribute API:

```html
<!-- Fade up on scroll -->
<div data-or-animate="fade-up">...</div>

<!-- Fade in from left -->
<div data-or-animate="fade-left">...</div>

<!-- Stagger children -->
<ul data-or-animate="stagger">
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<!-- Text character reveal -->
<h1 data-or-animate="split-chars">Heading</h1>

<!-- Custom delay -->
<div data-or-animate="fade-up" data-or-delay="0.2">...</div>
```

Available animations:
| Value | Effect |
|-------|--------|
| `fade-up` | opacity 0→1, translateY(24px→0) |
| `fade-down` | opacity 0→1, translateY(-24px→0) |
| `fade-left` | opacity 0→1, translateX(-24px→0) |
| `fade-right` | opacity 0→1, translateX(24px→0) |
| `fade-in` | opacity 0→1 |
| `scale-up` | opacity 0→1, scale(0.9→1) |
| `stagger` | each child fades up with 0.08s stagger |
| `split-chars` | character-by-character reveal |

All use ScrollTrigger with `start: "top 85%"` and `once: true`.

### 3.3 Three.js Particle Field

```html
<div data-or-particles data-or-particle-count="80" data-or-particle-color="#1F12DE">
  <!-- Content renders on top of particle canvas -->
  <h1>Hero Section</h1>
</div>
```

- Canvas rendered behind content (position: absolute, z-index: 0)
- Particles: small dots, slow ambient float, respond slightly to mouse
- Performance: requestAnimationFrame, capped at 60fps, pauses when not in viewport
- Respects `prefers-reduced-motion`: particles visible but static

Configurable attributes:
| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-or-particle-count` | 60 | Number of particles |
| `data-or-particle-color` | `#1F12DE` | Particle color |
| `data-or-particle-size` | 2 | Particle radius in px |
| `data-or-particle-speed` | 0.5 | Float speed multiplier |
| `data-or-particle-opacity` | 0.4 | Base opacity |
| `data-or-particle-lines` | false | Draw connection lines between nearby particles |

### 3.4 WebGL Animated Gradient

```html
<div data-or-gradient data-or-gradient-colors="#1F12DE,#2970FF,#17B26A">
  <h1>Content on gradient</h1>
</div>
```

- Animated mesh gradient background using WebGL fragment shader
- Smooth color interpolation, slow organic movement
- Fallback: CSS gradient if WebGL unavailable
- Configurable: colors (comma-separated), speed, grain (noise overlay)

### 3.5 Parallax

```html
<div data-or-parallax="0.3">
  <!-- Moves at 30% of scroll speed -->
</div>
```

Uses `transform: translate3d()` for GPU acceleration. Factor 0-1.

### 3.6 SVG Morph

```html
<button data-or-morph="menu,close" data-or-morph-duration="300">
  <svg><!-- initial state SVG --></svg>
</button>
```

Morphs between two SVG path states on toggle (click). Uses GSAP MorphSVG or a lightweight path interpolator.

---

## File Structure (After)

```
openreel-design-system/
├── css/
│   ├── openreel.css          # Base: tokens + reset + components
│   └── openreel-motion.css   # Motion: transitions, hovers, colored shadows
├── js/
│   └── openreel-effects.js   # Advanced: GSAP, Three.js, WebGL (opt-in)
├── index.html                # Updated to use <link> to css/
├── playground.html            # Updated
├── ... (all HTML files)       # Updated to use shared CSS
├── tokens.json                # Synced with registry
├── mcp/
│   ├── index.js              # Fixed generators + token prefixes
│   ├── registry.json         # + element field, enriched guidelines, motion tokens
│   └── ...
└── scripts/
    └── sync-tokens.js        # Generates tokens.json from registry.json
```

## Implementation Notes

### CSS import order
```html
<link rel="stylesheet" href="css/openreel.css" />
<link rel="stylesheet" href="css/openreel-motion.css" /> <!-- optional -->
<script src="js/openreel-effects.js" defer></script>      <!-- optional -->
```

### Backwards compatibility
- All existing `or-*` classes continue to work unchanged
- Motion is additive — same classes, transitions layered on top
- Effects are opt-in via data attributes — zero impact if not used

### Dark mode
- All colored shadows have dark-mode variants (lower opacity, adjusted for dark backgrounds)
- Motion tokens are theme-independent (durations/easings don't change)

### Performance
- `openreel-motion.css`: ~4KB gzipped (CSS transitions only, very lightweight)
- `openreel-effects.js`: ~3KB own code; GSAP (~25KB) and Three.js (~150KB) loaded on demand only
- All animations use `transform` and `opacity` for GPU compositing
- `will-change` applied sparingly (only on frequently animated elements)
