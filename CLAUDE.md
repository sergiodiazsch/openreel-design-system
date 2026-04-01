# OpenReel Design System — Rules for AI Assistants

## Overview

This is the **OpenReel Design System**, a comprehensive UI kit with 61 components, design tokens, and multi-framework support. All code generated for this project MUST follow these rules.

## Tech Stack

- **No build tools** — Static HTML files, no bundler
- **Tailwind CSS** via CDN (`https://cdn.tailwindcss.com`)
- **Inter** font from Google Fonts (weights: 400, 500, 600, 700)
- **CSS Custom Properties** for all design tokens (defined in `:root`)
- Multi-framework output: HTML, React, Vue, Svelte

## Project Structure

```
openreel-design-system/
├── css/
│   ├── openreel.css          # Base: tokens + reset + component styles
│   └── openreel-motion.css   # Motion: transitions, hovers, colored shadows (optional)
├── js/
│   └── openreel-effects.js   # Advanced: GSAP, Three.js, WebGL (optional, opt-in)
├── scripts/
│   └── sync-tokens.js        # Generates tokens.json from mcp/registry.json
├── index.html          # Main DS documentation (61 components)
├── playground.html     # Interactive component playgrounds (15 sections)
├── icons.html          # Icon library + token tools
├── templates.html      # 8 page templates with responsive preview
├── animations.html     # 36 animations in 7 categories
├── forms.html          # 6 interactive form patterns
├── layouts.html        # Grid system, flexbox, container queries
├── figma-handoff.html  # Figma-to-code specs + installation guide
├── a11y.html           # Accessibility tools + ARIA reference
├── theme-builder.html  # Theme customization + export
├── data-viz.html       # Chart patterns + data viz palette
├── email-templates.html # 5 email-safe templates
├── changelog.html      # Version history + roadmap
├── mcp-guide.html      # MCP installation guide
├── tokens.json         # Tokens Studio compatible format
├── mcp/
│   ├── index.js        # MCP server (7 tools)
│   ├── registry.json   # Component registry (61 components + tokens)
│   ├── package.json
│   └── README.md
└── .claude/
    └── settings.json   # MCP server configuration
```

## Design Tokens

ALWAYS use CSS custom properties. NEVER use hardcoded values.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#1F12DE` | Primary actions, links, focus rings |
| `--brand-hover` | `#1a0fbc` | Hover state for brand elements |
| `--brand-light` | `rgba(31, 18, 222, 0.1)` | Brand backgrounds, highlights |
| `--gray-25` to `--gray-900` | Gray scale | Text, borders, backgrounds |
| `--success-50` to `--success-800` | Green scale | Success states |
| `--error-50` to `--error-700` | Red scale | Error states |
| `--warning-50` to `--warning-700` | Amber scale | Warning states |
| `--blue-50` to `--blue-600` | Blue scale | Info, links |

### Semantic Colors (Light/Dark)

| Token | Light | Dark |
|-------|-------|------|
| `--bg-primary` | `#FFFFFF` | `#0C111D` |
| `--bg-secondary` | `#F9FAFB` | `#161B26` |
| `--bg-tertiary` | `#F2F4F7` | `#1F242F` |
| `--text-primary` | `#101828` | `#F5F5F6` |
| `--text-secondary` | `#667085` | `#94969C` |
| `--border-primary` | `#EAECF0` | `#333741` |

### Typography

```css
--font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Sizes */
--text-xs: 10px;   --text-sm: 12px;   --text-base: 14px;
--text-md: 16px;    --text-lg: 18px;   --text-xl: 20px;
--text-2xl: 24px;

/* Weights */
--font-regular: 400;  --font-medium: 500;  --font-semibold: 600;

/* Line Heights */
--leading-xs: 16px;   --leading-sm: 20px;  --leading-base: 24px;
--leading-lg: 28px;   --leading-xl: 32px;
```

### Spacing

```css
--space-1: 4px;   --space-1h: 6px;  --space-2: 8px;
--space-2h: 10px; --space-3: 12px;  --space-4: 16px;
--space-5: 20px;  --space-6: 24px;  --space-8: 32px;
```

### Border Radius

```css
--radius-sm: 4px;    --radius-md: 8px;     --radius-lg: 10px;
--radius-xl: 14px;   --radius-full: 9999px;
```

### Shadows

```css
--shadow-xs:  0px 1px 2px rgba(16, 24, 40, 0.05);
--shadow-sm:  0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 2px rgba(16, 24, 40, 0.06);
--shadow-md:  0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06);
--shadow-lg:  0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03);
--shadow-xl:  0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03);
--shadow-2xl: 0px 24px 48px -12px rgba(16, 24, 40, 0.18);
```

### Motion

```css
--duration-instant: 50ms;  --duration-fast: 100ms;
--duration-normal: 200ms;  --duration-slow: 300ms;

--ease-default: cubic-bezier(0.2, 0, 0, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Colored Shadows (Accent)

```css
--shadow-brand-sm: 0 2px 8px rgba(31, 18, 222, 0.15);
--shadow-brand-md: 0 4px 14px rgba(31, 18, 222, 0.2);
--shadow-brand-lg: 0 8px 24px rgba(31, 18, 222, 0.25);
--shadow-success-sm: 0 2px 8px rgba(23, 178, 106, 0.15);
--shadow-error-sm: 0 2px 8px rgba(240, 68, 56, 0.15);
--shadow-warning-sm: 0 2px 8px rgba(181, 71, 8, 0.15);
```

## Component Patterns

### 61 Components by Category

| Category | Components |
|----------|------------|
| **Form Controls** (12) | Button, Input, Checkbox, Radio, Toggle, Select, File Upload, Slider, Date Picker, Color Picker, OTP Input, Tag Input |
| **Data Display** (14) | Badge, Card, Table, Data Table, Avatar, Rating, Stat Card, Timeline, Activity Feed, Pills, Notification Badge, Date/Time, Metadata Grid, Status Indicator |
| **Feedback** (7) | Modal, Toast, Progress Bar, Skeleton, Empty State, Alert Banner, Snackbar |
| **Navigation** (9) | Tabs, Breadcrumbs, Pagination, Sidebar Nav, Tree View, Stepper, Mega Menu, Bottom Nav, Segmented Control |
| **Layout** (8) | Section Header, CTA Banner, Divider, Drawer, Kanban Board, Toolbar, Image Gallery, Audio Player |
| **Overlay** (5) | Tooltip, Dropdown, Popover, Command Palette, Accordion |
| **Content** (6) | Comments, Notifications, Calendar, Pricing Card, Testimonial, FAB |

### CSS Class Prefix

All components use the `or-` prefix:

```html
<button class="or-btn or-btn--primary or-btn--md">Button</button>
<span class="or-badge or-badge--success">Active</span>
<input class="or-input" placeholder="Enter text..." />
<div class="or-card">...</div>
```

### Button Variants

```html
<!-- Variants -->
<button class="or-btn or-btn--primary">Primary</button>
<button class="or-btn or-btn--secondary">Secondary</button>
<button class="or-btn or-btn--tertiary">Tertiary</button>
<button class="or-btn or-btn--destructive">Destructive</button>

<!-- Sizes -->
<button class="or-btn or-btn--primary or-btn--sm">Small (32px)</button>
<button class="or-btn or-btn--primary or-btn--md">Medium (40px)</button>
<button class="or-btn or-btn--primary or-btn--lg">Large (48px)</button>
```

### Badge Variants

```html
<span class="or-badge or-badge--success">Success</span>
<span class="or-badge or-badge--error">Error</span>
<span class="or-badge or-badge--warning">Warning</span>
<span class="or-badge or-badge--brand">Brand</span>
<span class="or-badge or-badge--gray">Default</span>
```

### Form Controls

```html
<!-- Input -->
<input class="or-input" type="text" placeholder="Placeholder..." />
<input class="or-input or-input--error" type="text" />

<!-- Checkbox -->
<input type="checkbox" class="or-checkbox" />

<!-- Toggle -->
<button class="or-toggle" role="switch" aria-checked="false">
  <span class="or-toggle__thumb"></span>
</button>

<!-- Select -->
<select class="or-select">
  <option>Option 1</option>
</select>
```

### Card

```html
<div class="or-card">
  <div class="or-card__header">
    <h3 class="or-card__title">Title</h3>
    <p class="or-card__subtitle">Subtitle</p>
  </div>
  <div class="or-card__body">Content</div>
  <div class="or-card__footer">Actions</div>
</div>
```

### Table

```html
<table class="or-table">
  <thead>
    <tr>
      <th>Header</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Cell</td>
    </tr>
  </tbody>
</table>
```

## Component Sizing

| Component | SM | MD (default) | LG |
|-----------|----|------|------|
| Button height | 32px | 40px | 48px |
| Input height | — | 40px | 48px |
| Avatar | 24px (xs) | 40px | 64px (xl) |
| Icon | 16px | 20px | 24px |

## Dark Mode

- Toggle via `html.dark` class
- All semantic colors switch automatically via CSS custom properties
- ALWAYS test both light and dark mode
- Dark backgrounds: `#0C111D`, `#161B26`, `#1F242F`
- Dark text: `#F5F5F6` (primary), `#94969C` (secondary)
- Dark borders: `#333741`

## Accessibility Requirements

- Minimum contrast: **4.5:1** for normal text, **3:1** for large text
- All interactive elements must be keyboard accessible
- Use semantic HTML: `<button>`, `<nav>`, `<main>`, `<section>`, not `<div>` with click handlers
- Include `aria-label` on icon-only buttons
- Support `prefers-reduced-motion` for animations
- Focus indicators must be visible (use `--brand` color with 4px ring)

## Figma Integration

### Tokens Studio

Import `tokens.json` into Figma via [Tokens Studio](https://tokens.studio) plugin. Format is compatible with Tokens Studio v2.

### Code Connect

When a Figma file URL is available, map components using:
```
add_code_connect_map(nodeId, fileKey, source, componentName, label)
```

### Figma → Code Translation

| Figma Property | CSS Equivalent |
|----------------|----------------|
| Auto Layout HORIZONTAL | `display: flex; flex-direction: row` |
| Auto Layout VERTICAL | `display: flex; flex-direction: column` |
| itemSpacing | `gap` |
| padding | `padding` |
| FILL sizing | `flex: 1` or `width: 100%` |
| HUG sizing | `width: fit-content` |
| cornerRadius | `border-radius` |

## MCP Server

The MCP server at `mcp/index.js` exposes 7 tools:

| Tool | Purpose |
|------|---------|
| `list_components` | List all 61 components, filter by category |
| `get_component` | Get component details + code (HTML/React/Vue/Svelte) |
| `get_tokens` | Export tokens in CSS/SCSS/JSON/Tailwind |
| `search` | Fuzzy search across components, tokens, guidelines |
| `get_guidelines` | Usage guidelines (spacing, typography, a11y) |
| `get_page_template` | Pre-built page templates |
| `get_css_setup` | Complete CSS needed for new projects |

### Using the MCP

When building UI with this design system:
1. Call `get_css_setup` first to get the base CSS
2. Use `search` or `list_components` to find relevant components
3. Call `get_component` with the desired format (html/react/vue/svelte)
4. Follow the token usage rules above — never hardcode values

## Advanced Effects (Optional)

Load `js/openreel-effects.js` for GSAP/Three.js/WebGL effects. All activate via `data-or-*` attributes:

| Attribute | Effect |
|-----------|--------|
| `data-or-animate="fade-up"` | GSAP scroll-triggered fade up |
| `data-or-animate="fade-down"` | GSAP scroll-triggered fade down |
| `data-or-animate="fade-left"` | GSAP scroll-triggered fade from left |
| `data-or-animate="fade-right"` | GSAP scroll-triggered fade from right |
| `data-or-animate="scale-up"` | GSAP scroll-triggered scale up |
| `data-or-animate="stagger"` | Children stagger in on scroll |
| `data-or-animate="split-chars"` | Character-by-character text reveal |
| `data-or-particles` | Canvas 2D floating particle field |
| `data-or-gradient` | WebGL animated mesh gradient |
| `data-or-parallax="0.3"` | Scroll parallax (factor 0-1) |

### Particle Configuration

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-or-particle-count` | 60 | Number of particles |
| `data-or-particle-color` | `#1F12DE` | Particle color |
| `data-or-particle-size` | 2 | Particle radius in px |
| `data-or-particle-speed` | 0.5 | Float speed multiplier |
| `data-or-particle-opacity` | 0.4 | Base opacity |
| `data-or-particle-lines` | false | Draw connection lines |

### CSS Import Order

```html
<link rel="stylesheet" href="css/openreel.css" />
<link rel="stylesheet" href="css/openreel-motion.css" /> <!-- optional -->
<script src="js/openreel-effects.js" defer></script>      <!-- optional -->
```

## Rules Summary

1. **ALWAYS** use `--token` CSS custom properties, never hardcoded hex/px values
2. **ALWAYS** use the `or-` prefix for component classes
3. **ALWAYS** use semantic HTML elements
4. **ALWAYS** support dark mode via `html.dark` class
5. **ALWAYS** maintain 4.5:1 contrast ratio
6. **ALWAYS** use Inter font family
7. **NEVER** add build tools — this is a static site
8. **NEVER** use inline styles when a token exists
9. **NEVER** create new color values — use the existing palette
10. **NEVER** skip focus states on interactive elements
11. **ALWAYS** use motion tokens (`--duration-*`, `--ease-*`) for transitions, never hardcoded ms/bezier values
12. **ALWAYS** respect `prefers-reduced-motion` — use `openreel-motion.css` which handles this globally
