# OpenReel Design System 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the OpenReel DS with bug fixes, shared CSS extraction, a motion/visual polish layer, and optional advanced effects (GSAP, Three.js, WebGL).

**Architecture:** Three layered files — `css/openreel.css` (base tokens + components), `css/openreel-motion.css` (transitions, hovers, colored shadows), `js/openreel-effects.js` (GSAP, Three.js, WebGL, opt-in via data attributes). All CDN-based, zero build tools.

**Tech Stack:** Static HTML, CSS custom properties, Tailwind CDN, GSAP 3, Three.js r170, vanilla JS ES modules.

**Spec:** `docs/superpowers/specs/2026-04-01-openreel-ds-2.0-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `css/openreel.css` | Base tokens + reset + all `.or-*` component styles |
| Create | `css/openreel-motion.css` | Motion tokens + component transitions + colored shadows |
| Create | `js/openreel-effects.js` | GSAP scroll animations, Three.js particles, WebGL gradient, parallax |
| Create | `scripts/sync-tokens.js` | Generate `tokens.json` from `mcp/registry.json` |
| Modify | `mcp/index.js` | Fix `generateTokensCSS`, generators, `get_css_setup` |
| Modify | `mcp/registry.json` | Add `element` fields, motion tokens, enriched guidelines |
| Modify | `tokens.json` | Sync with registry (via script) |
| Modify | `index.html` + 19 other HTML files | Replace inline styles with `<link>` to shared CSS |
| Modify | `CLAUDE.md` | Document new files and motion tokens |

---

### Task 1: Extract base CSS to `css/openreel.css`

**Files:**
- Create: `css/openreel.css`
- Reference: `index.html:17-602` (tokens + base styles), `index.html:2527-3382` (component classes)

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/sergio/Downloads/openreel-design-system/css
```

- [ ] **Step 2: Create `css/openreel.css` with tokens and base styles**

Extract from `index.html:17-602` the full `:root` token block, dark mode overrides (`html.dark`, `html:not(.dark)`), base styles (`*`, `body`, scrollbar), and code block styles.

Then extract from `index.html:2527-3382` all lines starting with `.or-` — these are the component class definitions. Leave behind page-specific classes (`.component-section`, `.component-card`, `.preview-box`, `.copy-btn`, etc.) which stay inline in `index.html`.

The file structure should be:

```css
/* ===========================================
   OpenReel Design System — openreel.css
   Base tokens, reset, and component styles
   =========================================== */

/* ── Tokens (:root) ── */
:root { /* full token block from index.html:21-111 */ }

/* ── Dark mode ── */
html.dark { /* from index.html:114-121 */ }
html:not(.dark) { /* from index.html:123-130 */ }

/* ── Base ── */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { /* from index.html:137-145 */ }

/* ── Scrollbar ── */
/* from index.html:148-152 */

/* ── Components ── */
/* All .or-* class definitions from index.html:2527-3382 */
```

- [ ] **Step 3: Verify the file loads correctly**

```bash
# Quick syntax check — no CSS parse errors
node -e "const fs=require('fs'); const css=fs.readFileSync('css/openreel.css','utf8'); console.log('CSS length:', css.length, 'bytes'); console.log('Token count:', (css.match(/--[\w-]+:/g)||[]).length); console.log('Component classes:', (css.match(/\.or-[\w-]+/g)||[]).length);"
```

Expected: CSS length >10KB, Token count >40, Component classes >100.

- [ ] **Step 4: Commit**

```bash
git add css/openreel.css
git commit -m "feat: extract shared CSS to css/openreel.css"
```

---

### Task 2: Update all HTML files to use shared CSS

**Files:**
- Modify: All 20 HTML files in project root

- [ ] **Step 1: Update `index.html`**

In `index.html`, add a `<link>` to `css/openreel.css` in the `<head>` (after the Google Fonts link, before the first `<style>` tag):

```html
<link rel="stylesheet" href="css/openreel.css" />
```

Remove the duplicated token block and `.or-*` component classes from the inline `<style>` blocks. Keep page-specific styles (`.component-section`, `.component-card`, `.preview-box`, `.copy-btn`, animation-specific classes) inline.

- [ ] **Step 2: Update remaining 19 HTML files**

For each file (`playground.html`, `icons.html`, `templates.html`, `animations.html`, `forms.html`, `layouts.html`, `figma-handoff.html`, `a11y.html`, `theme-builder.html`, `data-viz.html`, `email-templates.html`, `changelog.html`, `mcp-guide.html`, `assistant.html`, `demo-dashboard.html`, `login.html`, `part-components.html`, `part-guidelines.html`, `part-shell.html`):

1. Add `<link rel="stylesheet" href="css/openreel.css" />` in `<head>`
2. Remove any duplicated `:root` token blocks from inline `<style>`
3. Remove any duplicated `.or-*` component class definitions
4. Keep page-specific styles inline

- [ ] **Step 3: Verify pages still render**

Open `index.html` in browser and visually confirm components render correctly. Spot-check `playground.html` and `forms.html`.

- [ ] **Step 4: Commit**

```bash
git add *.html
git commit -m "refactor: replace inline styles with shared openreel.css across all pages"
```

---

### Task 3: Fix MCP token naming collisions

**Files:**
- Modify: `mcp/index.js:67-93` (`generateTokensCSS`)
- Modify: `mcp/index.js:95-118` (`generateTokensSCSS`)
- Modify: `mcp/index.js:120-148` (`generateTokensTailwind`)

- [ ] **Step 1: Fix `generateTokensCSS()` at `mcp/index.js:67`**

Replace the current function with one that adds category-specific prefixes:

```js
function generateTokensCSS(category) {
  let lines = [":root {"];
  const cats = category ? { [category]: tokens[category] } : tokens;

  const prefixMap = {
    spacing: "space",
    borderRadius: "radius",
    shadows: "shadow",
  };

  for (const [cat, values] of Object.entries(cats)) {
    if (typeof values === "object" && !Array.isArray(values)) {
      lines.push(`  /* ── ${cat} ── */`);
      if (cat === "typography") {
        lines.push(`  --font-family: ${values.fontFamily};`);
        if (values.sizes) for (const [k, v] of Object.entries(values.sizes)) lines.push(`  --text-${k}: ${v};`);
        if (values.weights) for (const [k, v] of Object.entries(values.weights)) lines.push(`  --font-${k}: ${v};`);
        if (values.lineHeights) for (const [k, v] of Object.entries(values.lineHeights)) lines.push(`  --leading-${k}: ${v};`);
      } else {
        const prefix = prefixMap[cat] || "";
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === "object") {
            for (const [k2, v2] of Object.entries(v)) {
              lines.push(`  --${k}-${k2}: ${v2};`);
            }
          } else {
            const varName = prefix ? `${prefix}-${k}` : k;
            lines.push(`  --${varName}: ${v};`);
          }
        }
      }
    }
  }
  lines.push("}");
  return lines.join("\n");
}
```

Key change: `spacing` keys get `--space-` prefix, `borderRadius` keys get `--radius-` prefix, `shadows` keys get `--shadow-` prefix. Colors and typography already have proper names.

- [ ] **Step 2: Fix `generateTokensSCSS()` at `mcp/index.js:95`**

Apply the same prefix logic:

```js
function generateTokensSCSS(category) {
  let lines = [];
  const cats = category ? { [category]: tokens[category] } : tokens;
  const prefixMap = { spacing: "space", borderRadius: "radius", shadows: "shadow" };
  for (const [cat, values] of Object.entries(cats)) {
    if (typeof values === "object") {
      lines.push(`// ── ${cat} ──`);
      if (cat === "typography") {
        lines.push(`$font-family: ${values.fontFamily};`);
        if (values.sizes) for (const [k, v] of Object.entries(values.sizes)) lines.push(`$text-${k}: ${v};`);
        if (values.weights) for (const [k, v] of Object.entries(values.weights)) lines.push(`$font-${k}: ${v};`);
        if (values.lineHeights) for (const [k, v] of Object.entries(values.lineHeights)) lines.push(`$leading-${k}: ${v};`);
      } else {
        const prefix = prefixMap[cat] || "";
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === "object") {
            for (const [k2, v2] of Object.entries(v)) lines.push(`$${k}-${k2}: ${v2};`);
          } else {
            const varName = prefix ? `${prefix}-${k}` : k;
            lines.push(`$${varName}: ${v};`);
          }
        }
      }
    }
  }
  return lines.join("\n");
}
```

- [ ] **Step 3: Fix `generateTokensTailwind()` at `mcp/index.js:120`**

No collision issue in Tailwind format (uses nested objects), but update key names for consistency:

```js
function generateTokensTailwind(category) {
  const config = { theme: { extend: {} } };
  const ext = config.theme.extend;
  if (!category || category === "colors") {
    ext.colors = {};
    for (const [k, v] of Object.entries(tokens.colors)) ext.colors[k] = v;
  }
  if (!category || category === "spacing") {
    ext.spacing = {};
    for (const [k, v] of Object.entries(tokens.spacing)) ext.spacing[k] = v;
  }
  if (!category || category === "borderRadius") {
    ext.borderRadius = {};
    for (const [k, v] of Object.entries(tokens.borderRadius)) ext.borderRadius[k] = v;
  }
  if (!category || category === "boxShadow") {
    ext.boxShadow = {};
    for (const [k, v] of Object.entries(tokens.shadows)) ext.boxShadow[k] = v;
  }
  return "// tailwind.config.js\n" + JSON.stringify(config, null, 2);
}
```

- [ ] **Step 4: Verify no collisions**

```bash
cd /Users/sergio/Downloads/openreel-design-system
node -e "
const {readFileSync} = require('fs');
const reg = JSON.parse(readFileSync('mcp/registry.json','utf8'));
// Simulate generateTokensCSS
const tokens = reg.tokens;
const prefixMap = {spacing:'space',borderRadius:'radius',shadows:'shadow'};
const vars = [];
for (const [cat,vals] of Object.entries(tokens)) {
  if (typeof vals !== 'object') continue;
  if (cat === 'typography') continue;
  const prefix = prefixMap[cat] || '';
  for (const [k,v] of Object.entries(vals)) {
    if (typeof v === 'object') { for (const k2 of Object.keys(v)) vars.push(k+'-'+k2); }
    else vars.push(prefix ? prefix+'-'+k : k);
  }
}
const dupes = vars.filter((v,i) => vars.indexOf(v) !== i);
console.log('Total vars:', vars.length, '| Duplicates:', dupes.length);
if (dupes.length) console.log('COLLISIONS:', dupes);
else console.log('No collisions found');
"
```

Expected: `Duplicates: 0`, `No collisions found`.

- [ ] **Step 5: Commit**

```bash
git add mcp/index.js
git commit -m "fix: resolve token naming collisions in MCP generateTokensCSS/SCSS/Tailwind"
```

---

### Task 4: Fix MCP `get_css_setup` dark mode defaults

**Files:**
- Modify: `mcp/index.js:586-650` (`get_css_setup` tool)

- [ ] **Step 1: Update `get_css_setup` to read from `css/openreel.css`**

Replace the hardcoded CSS template in the `get_css_setup` tool handler (line 592-639) to read and return the actual `css/openreel.css` file:

```js
server.tool(
  "get_css_setup",
  "Get the complete CSS setup needed to use the OpenReel Design System in a project — tokens, base styles, and dark mode.",
  {},
  async () => {
    let css;
    try {
      css = readFileSync(join(__dirname, "..", "css", "openreel.css"), "utf-8");
    } catch {
      // Fallback to generated if file not found
      css = `/* OpenReel Design System — CSS Setup */\n\n@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');\n\n${generateTokensCSS()}\n\n/* Dark Mode */\nhtml.dark {\n  --bg-primary: ${tokens.dark["bg-primary"]};\n  --bg-secondary: ${tokens.dark["bg-secondary"]};\n  --bg-tertiary: ${tokens.dark["bg-tertiary"]};\n  --text-primary: ${tokens.dark["text-primary"]};\n  --text-secondary: ${tokens.dark["text-secondary"]};\n  --border-primary: ${tokens.dark["border-primary"]};\n}\n\nhtml:not(.dark) {\n  --bg-primary: #FFFFFF;\n  --bg-secondary: ${tokens.colors["gray-50"]};\n  --bg-tertiary: ${tokens.colors["gray-100"]};\n  --text-primary: ${tokens.colors["gray-900"]};\n  --text-secondary: ${tokens.colors["gray-500"]};\n  --border-primary: ${tokens.colors["gray-200"]};\n}\n\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: var(--font-family); font-size: var(--text-base); line-height: var(--leading-base); color: var(--text-primary); background: var(--bg-primary); -webkit-font-smoothing: antialiased; }`;
    }

    return {
      content: [{
        type: "text",
        text: `# OpenReel Design System — CSS Setup\n\nPaste this into your main CSS file to get started:\n\n\`\`\`css\n${css}\n\`\`\`\n\n**Next steps:**\n1. Add \`class="dark"\` to \`<html>\` for dark mode\n2. Use \`get_component\` to get code for specific components\n3. Use \`get_tokens\` for format-specific exports (SCSS, Tailwind, etc.)`,
      }],
    };
  }
);
```

This ensures `:root` has light defaults and `html.dark` overrides — matching the actual `openreel.css` file.

- [ ] **Step 2: Commit**

```bash
git add mcp/index.js
git commit -m "fix: get_css_setup reads shared openreel.css, correct light/dark defaults"
```

---

### Task 5: Add `element` field to all components in `registry.json`

**Files:**
- Modify: `mcp/registry.json` — each component object in the `components` array

- [ ] **Step 1: Add `element` field to every component**

For each of the 61 components, add `"element": "<tag>"` after the `"slug"` field. Mapping:

| Slug | Element |
|------|---------|
| `button` | `button` |
| `input` | `input` |
| `checkbox` | `input` |
| `radio` | `input` |
| `toggle-switch` | `button` |
| `select` | `select` |
| `file-upload` | `div` |
| `slider-range` | `input` |
| `date-picker` | `div` |
| `color-picker` | `div` |
| `otp-input` | `div` |
| `tag-input` | `div` |
| `badge` | `span` |
| `card` | `article` |
| `table` | `table` |
| `data-table-advanced` | `table` |
| `avatar` | `span` |
| `rating-stars` | `div` |
| `stat-card` | `article` |
| `timeline` | `ol` |
| `activity-feed` | `div` |
| `pills-chips` | `span` |
| `notification-badge` | `span` |
| `date-time-display` | `time` |
| `metadata-grid` | `dl` |
| `status-indicator` | `span` |
| `modal` | `dialog` |
| `toast-alert` | `div` |
| `progress-bar` | `div` |
| `loading-skeleton` | `div` |
| `empty-state` | `div` |
| `alert-banner` | `div` |
| `snackbar` | `div` |
| `tabs` | `nav` |
| `breadcrumbs` | `nav` |
| `pagination` | `nav` |
| `sidebar-nav` | `nav` |
| `tree-view` | `div` |
| `stepper` | `nav` |
| `mega-menu` | `nav` |
| `bottom-navigation` | `nav` |
| `segmented-control` | `div` |
| `section-header` | `header` |
| `cta-banner` | `section` |
| `divider` | `hr` |
| `drawer-sheet` | `aside` |
| `kanban-board` | `div` |
| `toolbar` | `div` |
| `image-gallery` | `div` |
| `audio-player` | `div` |
| `tooltip` | `div` |
| `dropdown-menu` | `div` |
| `popover` | `div` |
| `command-palette` | `div` |
| `accordion` | `div` |
| `comment-thread` | `article` |
| `notification-panel` | `aside` |
| `calendar-view` | `div` |
| `pricing-card` | `article` |
| `testimonial` | `blockquote` |
| `fab` | `button` |

Example diff for Button:

```json
{
  "name": "Button",
  "slug": "button",
  "element": "button",
  "category": "Form Controls",
  ...
}
```

- [ ] **Step 2: Commit**

```bash
git add mcp/registry.json
git commit -m "feat: add semantic element field to all 61 components in registry"
```

---

### Task 6: Fix React, Vue, and Svelte code generators

**Files:**
- Modify: `mcp/index.js:150-238` (all three generator functions)

- [ ] **Step 1: Update `generateReactComponent()` at line 150**

Replace with:

```js
function generateReactComponent(comp) {
  const name = comp.name.replace(/[\s/()-]/g, "");
  const el = comp.element || "div";
  const selfClosing = ["input", "img", "hr"].includes(el);
  const propsStr = comp.props
    .map((p) => {
      const def = p.default === null ? "undefined" : JSON.stringify(p.default);
      return `  ${p.name} = ${def}`;
    })
    .join(",\n");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;

  const classBlock = `  const classes = [
    '${classExpr}',
    variant ? \`${classExpr}-\${variant}\` : '',
    size ? \`${classExpr}-\${size}\` : '',
    className
  ].filter(Boolean).join(' ');`;

  if (selfClosing) {
    return `import React from 'react';

export function ${name}({
${propsStr},
  className,
  ...props
}) {
${classBlock}

  return <${el} className={classes} {...props} />;
}

${name}.displayName = '${name}';
`;
  }

  return `import React from 'react';

export function ${name}({
${propsStr},
  children,
  className,
  ...props
}) {
${classBlock}

  return (
    <${el} className={classes} {...props}>
      {children}
    </${el}>
  );
}

${name}.displayName = '${name}';
`;
}
```

- [ ] **Step 2: Update `generateVueComponent()` at line 185**

Replace with:

```js
function generateVueComponent(comp) {
  const name = comp.name.replace(/[\s/()-]/g, "");
  const el = comp.element || "div";
  const selfClosing = ["input", "img", "hr"].includes(el);
  const typeMap = { boolean: "Boolean", string: "String", number: "Number", array: "Array", object: "Object" };
  const propsStr = comp.props
    .map((p) => {
      const type = typeMap[p.type.split("|")[0]] || "String";
      const def = p.default === null ? "null" : JSON.stringify(p.default);
      return `  ${p.name}: { type: ${type}, default: ${def} }`;
    })
    .join(",\n");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;

  const templateTag = selfClosing
    ? `<${el} :class="classes" v-bind="$attrs" />`
    : `<${el} :class="classes">\n    <slot />\n  </${el}>`;

  return `<template>
  ${templateTag}
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
${propsStr}
});

const classes = computed(() => [
  '${classExpr}',
  props.variant ? \`${classExpr}-\${props.variant}\` : '',
  props.size ? \`${classExpr}-\${props.size}\` : ''
].filter(Boolean).join(' '));
</script>
`;
}
```

- [ ] **Step 3: Update `generateSvelteComponent()` at line 217**

Replace with Svelte 5 runes:

```js
function generateSvelteComponent(comp) {
  const el = comp.element || "div";
  const selfClosing = ["input", "img", "hr"].includes(el);
  const propsStr = comp.props
    .map((p) => {
      const def = p.default === null ? "undefined" : JSON.stringify(p.default);
      return `${p.name} = ${def}`;
    })
    .join(", ");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;

  const childrenPart = selfClosing ? "" : ", children";
  const templateTag = selfClosing
    ? `<${el} class={classes} {...rest} />`
    : `<${el} class={classes} {...rest}>\n  {@render children?.()}\n</${el}>`;

  return `<script>
  let { ${propsStr}${childrenPart}, class: className, ...rest } = $props();

  const classes = $derived([
    '${classExpr}',
    variant ? \`${classExpr}-\${variant}\` : '',
    size ? \`${classExpr}-\${size}\` : '',
    className
  ].filter(Boolean).join(' '));
</script>

${templateTag}
`;
}
```

- [ ] **Step 4: Verify generators produce correct output**

```bash
cd /Users/sergio/Downloads/openreel-design-system
node -e "
const {readFileSync} = require('fs');
const reg = JSON.parse(readFileSync('mcp/registry.json','utf8'));
// Quick check: button should render <button>, input should render <input>
const btn = reg.components.find(c => c.slug === 'button');
const inp = reg.components.find(c => c.slug === 'input');
console.log('Button element:', btn.element);
console.log('Input element:', inp.element);
// Verify they exist
if (btn.element !== 'button') console.error('FAIL: button missing element');
if (inp.element !== 'input') console.error('FAIL: input missing element');
console.log('OK');
"
```

- [ ] **Step 5: Commit**

```bash
git add mcp/index.js
git commit -m "fix: generators use semantic HTML elements, Svelte 5 runes, Vue type mapping"
```

---

### Task 7: Enrich MCP guidelines

**Files:**
- Modify: `mcp/registry.json` — `guidelines` object (line ~1340)

- [ ] **Step 1: Replace the `guidelines` object**

Replace the existing 1-line guidelines with expanded versions (200-400 words each). Each guideline includes concrete rules, code examples, and do/don't patterns.

The 7 guidelines to expand: `spacing`, `typography`, `color_usage`, `dark_mode`, `accessibility`, `responsive`, `motion`.

For example, the `spacing` guideline becomes:

```
"spacing": "Use the spacing scale consistently across all components...\n\n**Scale:** --space-1 (4px), --space-1h (6px), --space-2 (8px), --space-2h (10px), --space-3 (12px), --space-4 (16px), --space-5 (20px), --space-6 (24px), --space-8 (32px).\n\n**Rules:**\n- Component internal padding: --space-2 to --space-4 (8-16px)\n- Gap between sibling elements: --space-2 to --space-3 (8-12px)\n- Section spacing: --space-6 to --space-8 (24-32px)\n- Never use arbitrary pixel values outside the scale\n\n**Code example:**\n```css\n.or-card { padding: var(--space-6); gap: var(--space-4); }\n.or-btn-sm { padding: var(--space-1h) var(--space-3); }\n```\n\n**Do:** Use var(--space-4) for consistent 16px gaps.\n**Don't:** Use padding: 15px or margin: 13px — these break the 4px grid."
```

Expand all 7 topics to this depth. Also add a new `motion` guideline that documents the motion tokens from Tier 2.

- [ ] **Step 2: Add motion tokens to registry.json**

Add a new `motion` section to `tokens`:

```json
"motion": {
  "duration-instant": "50ms",
  "duration-fast": "100ms",
  "duration-normal": "200ms",
  "duration-slow": "300ms",
  "ease-default": "cubic-bezier(0.2, 0, 0, 1)",
  "ease-in": "cubic-bezier(0.4, 0, 1, 1)",
  "ease-out": "cubic-bezier(0, 0, 0.2, 1)",
  "ease-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)"
},
"coloredShadows": {
  "brand-sm": "0 2px 8px rgba(31, 18, 222, 0.15)",
  "brand-md": "0 4px 14px rgba(31, 18, 222, 0.2)",
  "brand-lg": "0 8px 24px rgba(31, 18, 222, 0.25)",
  "success-sm": "0 2px 8px rgba(23, 178, 106, 0.15)",
  "error-sm": "0 2px 8px rgba(240, 68, 56, 0.15)",
  "warning-sm": "0 2px 8px rgba(181, 71, 8, 0.15)"
}
```

- [ ] **Step 3: Commit**

```bash
git add mcp/registry.json
git commit -m "feat: enrich guidelines to 200-400 words, add motion/coloredShadow tokens"
```

---

### Task 8: Create token sync script

**Files:**
- Create: `scripts/sync-tokens.js`
- Modify: `tokens.json` (output)

- [ ] **Step 1: Create `scripts/sync-tokens.js`**

```bash
mkdir -p /Users/sergio/Downloads/openreel-design-system/scripts
```

Write a Node.js script that reads `mcp/registry.json`, extracts the tokens, and writes `tokens.json` in Tokens Studio v2 format:

```js
#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const registry = JSON.parse(readFileSync(join(root, "mcp", "registry.json"), "utf-8"));
const t = registry.tokens;

const tokensStudio = {
  openreel: {
    color: {
      brand: { value: t.colors.brand, type: "color" },
      "brand-hover": { value: t.colors["brand-hover"], type: "color" },
      "brand-light": { value: t.colors["brand-light"], type: "color" },
      blue: {},
      gray: {},
      success: {},
      error: {},
      warning: {},
      white: { value: "#FFFFFF", type: "color" },
      black: { value: "#000000", type: "color" },
    },
    typography: {
      fontFamily: { value: t.typography.fontFamily, type: "fontFamilies" },
      fontSize: {},
      fontWeight: {},
      lineHeight: {},
    },
    spacing: {},
    borderRadius: {},
    boxShadow: {},
    motion: {},
    coloredShadows: {},
    dark: {},
    light: {},
  },
  $themes: [],
  $metadata: { tokenSetOrder: ["openreel"] },
};

// Map flat color keys to nested groups
for (const [k, v] of Object.entries(t.colors)) {
  const match = k.match(/^(blue|gray|success|error|warning)-(.+)$/);
  if (match) {
    tokensStudio.openreel.color[match[1]][match[2]] = { value: v, type: "color" };
  }
}

// Typography
for (const [k, v] of Object.entries(t.typography.sizes)) {
  tokensStudio.openreel.typography.fontSize[k] = { value: v.replace("px", ""), type: "fontSizes" };
}
for (const [k, v] of Object.entries(t.typography.weights)) {
  tokensStudio.openreel.typography.fontWeight[k] = { value: String(v), type: "fontWeights" };
}
for (const [k, v] of Object.entries(t.typography.lineHeights)) {
  tokensStudio.openreel.typography.lineHeight[k] = { value: v.replace("px", ""), type: "lineHeights" };
}

// Spacing
for (const [k, v] of Object.entries(t.spacing)) {
  tokensStudio.openreel.spacing[k] = { value: v.replace("px", ""), type: "spacing" };
}

// Border radius
for (const [k, v] of Object.entries(t.borderRadius)) {
  tokensStudio.openreel.borderRadius[k] = { value: v.replace("px", ""), type: "borderRadius" };
}

// Shadows
for (const [k, v] of Object.entries(t.shadows)) {
  tokensStudio.openreel.boxShadow[k] = { value: v, type: "boxShadow" };
}

// Motion tokens (if present)
if (t.motion) {
  for (const [k, v] of Object.entries(t.motion)) {
    tokensStudio.openreel.motion[k] = { value: v, type: "other" };
  }
}

// Colored shadows (if present)
if (t.coloredShadows) {
  for (const [k, v] of Object.entries(t.coloredShadows)) {
    tokensStudio.openreel.coloredShadows[k] = { value: v, type: "boxShadow" };
  }
}

// Dark/Light
for (const [k, v] of Object.entries(t.dark)) {
  tokensStudio.openreel.dark[k] = { value: v, type: "color" };
}

writeFileSync(join(root, "tokens.json"), JSON.stringify(tokensStudio, null, 2) + "\n");
console.log("tokens.json synced from registry.json");
```

- [ ] **Step 2: Run the sync script**

```bash
cd /Users/sergio/Downloads/openreel-design-system
node scripts/sync-tokens.js
```

Expected: `tokens.json synced from registry.json`

- [ ] **Step 3: Verify output**

```bash
node -e "const t=JSON.parse(require('fs').readFileSync('tokens.json','utf8')); console.log('Has motion:', !!t.openreel.motion); console.log('Has coloredShadows:', !!t.openreel.coloredShadows); console.log('Color keys:', Object.keys(t.openreel.color).length);"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-tokens.js tokens.json
git commit -m "feat: add sync-tokens.js script, sync tokens.json from registry"
```

---

### Task 9: Create `css/openreel-motion.css` — Motion tokens and form control animations

**Files:**
- Create: `css/openreel-motion.css`

- [ ] **Step 1: Create the file with motion tokens and button/input animations**

```css
/* ===========================================
   OpenReel Design System — openreel-motion.css
   Motion layer: transitions, hovers, colored shadows
   Optional — import after openreel.css
   =========================================== */

/* ── Motion Tokens ── */
:root {
  --duration-instant: 50ms;
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;

  --ease-default: cubic-bezier(0.2, 0, 0, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Colored accent shadows */
  --shadow-brand-sm: 0 2px 8px rgba(31, 18, 222, 0.15);
  --shadow-brand-md: 0 4px 14px rgba(31, 18, 222, 0.2);
  --shadow-brand-lg: 0 8px 24px rgba(31, 18, 222, 0.25);
  --shadow-success-sm: 0 2px 8px rgba(23, 178, 106, 0.15);
  --shadow-error-sm: 0 2px 8px rgba(240, 68, 56, 0.15);
  --shadow-warning-sm: 0 2px 8px rgba(181, 71, 8, 0.15);
}

html.dark {
  --shadow-brand-sm: 0 2px 8px rgba(31, 18, 222, 0.25);
  --shadow-brand-md: 0 4px 14px rgba(31, 18, 222, 0.3);
  --shadow-brand-lg: 0 8px 24px rgba(31, 18, 222, 0.35);
  --shadow-success-sm: 0 2px 8px rgba(23, 178, 106, 0.25);
  --shadow-error-sm: 0 2px 8px rgba(240, 68, 56, 0.25);
  --shadow-warning-sm: 0 2px 8px rgba(181, 71, 8, 0.25);
}

/* ── Keyframes ── */
@keyframes or-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-3px); }
}

@keyframes or-spin {
  to { transform: rotate(360deg); }
}

@keyframes or-check-draw {
  from { stroke-dashoffset: 20; }
  to { stroke-dashoffset: 0; }
}

@keyframes or-skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes or-badge-bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

@keyframes or-dot-appear {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

@keyframes or-progress-stripe {
  0% { background-position: 1rem 0; }
  100% { background-position: 0 0; }
}

/* ── Buttons ── */
.or-btn {
  transition:
    transform var(--duration-normal) var(--ease-default),
    box-shadow var(--duration-normal) var(--ease-default),
    background-color var(--duration-fast) var(--ease-default),
    opacity var(--duration-normal) var(--ease-default);
}

.or-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.or-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
  transition-duration: var(--duration-fast);
}

.or-btn:focus-visible {
  box-shadow: 0 0 0 4px rgba(31, 18, 222, 0.15);
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.or-btn-primary:hover:not(:disabled) {
  box-shadow: var(--shadow-brand-sm);
}

.or-btn-success:hover:not(:disabled) {
  box-shadow: var(--shadow-success-sm);
}

.or-btn-destructive:hover:not(:disabled),
.or-btn-danger:hover:not(:disabled) {
  box-shadow: var(--shadow-error-sm);
}

.or-btn[data-loading] .or-btn-spinner {
  animation: or-spin 0.6s linear infinite;
}

.or-btn[data-loading] .or-btn-content {
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-default);
}

/* ── Inputs ── */
.or-input,
.or-select,
.or-textarea {
  transition:
    border-color var(--duration-fast) var(--ease-default),
    box-shadow var(--duration-fast) var(--ease-default);
}

.or-input:focus,
.or-select:focus,
.or-textarea:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 4px rgba(31, 18, 222, 0.12);
}

.or-input.error:focus,
.or-input.or-input-error:focus {
  border-color: var(--error-500);
  box-shadow: 0 0 0 4px rgba(240, 68, 56, 0.12);
}

.or-input.or-shake,
.or-select.or-shake {
  animation: or-shake 0.3s var(--ease-default);
}

.or-input::placeholder {
  transition: opacity var(--duration-normal) var(--ease-default);
  opacity: 0.7;
}

.or-input:focus::placeholder {
  opacity: 0.4;
}

/* ── Checkbox ── */
.or-checkbox-check {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
}

.or-checkbox:checked + .or-checkbox-icon .or-checkbox-check,
.or-checkbox.or-checkbox-checked .or-checkbox-check {
  animation: or-check-draw 0.2s var(--ease-out) forwards;
}

/* ── Toggle / Switch ── */
.or-toggle .or-toggle__thumb,
.or-toggle .or-toggle-thumb {
  transition: transform 0.25s var(--ease-spring);
}

.or-toggle {
  transition: background-color var(--duration-fast) var(--ease-default);
}

/* ── Select dropdown ── */
.or-select-dropdown,
.or-select-options {
  transform: translateY(-4px);
  opacity: 0;
  transition:
    transform var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out);
  pointer-events: none;
}

.or-select-open .or-select-dropdown,
.or-select-open .or-select-options {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}
```

- [ ] **Step 2: Commit partial**

```bash
git add css/openreel-motion.css
git commit -m "feat: openreel-motion.css — tokens, button/input/form animations"
```

---

### Task 10: Extend `openreel-motion.css` — Cards, modals, overlays, navigation

**Files:**
- Modify: `css/openreel-motion.css` (append)

- [ ] **Step 1: Append card, modal, drawer, toast, tooltip, dropdown, accordion animations**

Append to `css/openreel-motion.css`:

```css
/* ── Cards ── */
.or-card {
  transition:
    transform var(--duration-normal) var(--ease-default),
    box-shadow var(--duration-normal) var(--ease-default),
    border-color var(--duration-normal) var(--ease-default);
}

.or-card:hover {
  border-color: var(--gray-300);
}

.or-card[data-interactive]:hover,
.or-card.or-card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.or-card-img {
  transition: transform 0.3s var(--ease-default);
}

.or-card:hover .or-card-img {
  transform: scale(1.03);
}

/* ── Modal ── */
.or-modal-backdrop {
  opacity: 0;
  backdrop-filter: blur(0px);
  transition:
    opacity var(--duration-normal) var(--ease-out),
    backdrop-filter var(--duration-normal) var(--ease-out);
}

.or-modal-backdrop.or-active,
.or-modal-backdrop[open] {
  opacity: 1;
  backdrop-filter: blur(8px);
}

.or-modal-content,
.or-modal-box {
  transform: scale(0.95);
  opacity: 0;
  transition:
    transform var(--duration-normal) var(--ease-out),
    opacity var(--duration-normal) var(--ease-out);
}

.or-modal-backdrop.or-active .or-modal-content,
.or-modal-backdrop[open] .or-modal-box {
  transform: scale(1);
  opacity: 1;
}

/* Modal exit */
.or-modal-backdrop.or-closing {
  opacity: 0;
  transition-duration: var(--duration-fast);
}

.or-modal-backdrop.or-closing .or-modal-content,
.or-modal-backdrop.or-closing .or-modal-box {
  transform: scale(0.95);
  opacity: 0;
  transition-duration: var(--duration-fast);
  transition-timing-function: var(--ease-in);
}

/* ── Drawer / Sheet ── */
.or-drawer,
.or-drawer-sheet {
  transform: translateX(-100%);
  transition: transform 0.25s var(--ease-out);
}

.or-drawer.or-drawer-right,
.or-drawer-sheet.or-drawer-right {
  transform: translateX(100%);
}

.or-drawer.or-active,
.or-drawer-sheet.or-active,
.or-drawer[open],
.or-drawer-sheet[open] {
  transform: translateX(0);
}

.or-drawer-backdrop {
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-default);
}

.or-drawer-backdrop.or-active {
  opacity: 1;
}

/* ── Toast / Snackbar ── */
.or-toast,
.or-snackbar {
  transform: translateY(16px);
  opacity: 0;
  transition:
    transform 0.25s var(--ease-out),
    opacity 0.25s var(--ease-out);
}

.or-toast.or-active,
.or-snackbar.or-active,
.or-toast.or-visible,
.or-snackbar.or-visible {
  transform: translateY(0);
  opacity: 1;
}

.or-toast.or-exiting,
.or-snackbar.or-exiting {
  transform: translateX(100%);
  opacity: 0;
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-in);
}

/* ── Tooltip ── */
.or-tooltip {
  transform: translateY(4px);
  opacity: 0;
  transition:
    transform var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out);
  pointer-events: none;
}

.or-tooltip.or-active,
.or-tooltip.or-visible,
[data-tooltip]:hover .or-tooltip {
  transform: translateY(0);
  opacity: 1;
}

/* ── Dropdown Menu ── */
.or-dropdown,
.or-dropdown-menu {
  transform: scale(0.95);
  opacity: 0;
  transform-origin: top left;
  transition:
    transform 0.12s var(--ease-out),
    opacity 0.12s var(--ease-out);
  pointer-events: none;
}

.or-dropdown.or-active,
.or-dropdown-menu.or-active,
.or-dropdown.or-open,
.or-dropdown-menu[open] {
  transform: scale(1);
  opacity: 1;
  pointer-events: auto;
}

/* ── Accordion ── */
.or-accordion-content {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    max-height var(--duration-normal) var(--ease-default),
    opacity var(--duration-normal) var(--ease-default);
}

.or-accordion-item.or-active .or-accordion-content,
.or-accordion-item[open] .or-accordion-content {
  max-height: 500px;
  opacity: 1;
}

.or-accordion-chevron {
  transition: transform var(--duration-normal) var(--ease-default);
}

.or-accordion-item.or-active .or-accordion-chevron,
.or-accordion-item[open] .or-accordion-chevron {
  transform: rotate(180deg);
}

/* ── Tabs ── */
.or-tab-indicator {
  transition:
    left var(--duration-normal) var(--ease-default),
    width var(--duration-normal) var(--ease-default);
}

.or-tab-content {
  transition: opacity var(--duration-fast) var(--ease-default);
}

/* ── Popover ── */
.or-popover {
  transform: scale(0.95) translateY(-4px);
  opacity: 0;
  transition:
    transform var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out);
  pointer-events: none;
}

.or-popover.or-active,
.or-popover[open] {
  transform: scale(1) translateY(0);
  opacity: 1;
  pointer-events: auto;
}

/* ── Progress Bar ── */
.or-progress-fill {
  transition: width 0.3s var(--ease-out);
}

.or-progress-indeterminate .or-progress-fill {
  animation: or-progress-stripe 0.8s linear infinite;
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.15) 25%, transparent 25%,
    transparent 50%, rgba(255,255,255,0.15) 50%,
    rgba(255,255,255,0.15) 75%, transparent 75%
  );
  background-size: 1rem 1rem;
}

/* ── Skeleton ── */
.or-skeleton {
  background: linear-gradient(90deg, var(--gray-200) 25%, var(--gray-100) 50%, var(--gray-200) 75%);
  background-size: 200% 100%;
  animation: or-skeleton-shimmer 1.5s ease-in-out infinite;
}

html.dark .or-skeleton {
  background: linear-gradient(90deg, #1F242F 25%, #2B3040 50%, #1F242F 75%);
  background-size: 200% 100%;
}

/* ── Badge ── */
.or-badge.or-badge-updated {
  animation: or-badge-bounce 0.2s var(--ease-spring);
}

/* ── Notification dot ── */
.or-notification-dot {
  animation: or-dot-appear 0.25s var(--ease-spring);
}

/* ── Colored Shadow Utilities ── */
.or-shadow-brand { box-shadow: var(--shadow-brand-sm); }
.or-shadow-brand-md { box-shadow: var(--shadow-brand-md); }
.or-shadow-brand-lg { box-shadow: var(--shadow-brand-lg); }
.or-shadow-success { box-shadow: var(--shadow-success-sm); }
.or-shadow-error { box-shadow: var(--shadow-error-sm); }
.or-shadow-warning { box-shadow: var(--shadow-warning-sm); }

.or-hover-shadow-brand { transition: box-shadow var(--duration-normal) var(--ease-default); }
.or-hover-shadow-brand:hover { box-shadow: var(--shadow-brand-sm); }
.or-hover-shadow-success { transition: box-shadow var(--duration-normal) var(--ease-default); }
.or-hover-shadow-success:hover { box-shadow: var(--shadow-success-sm); }
.or-hover-shadow-error { transition: box-shadow var(--duration-normal) var(--ease-default); }
.or-hover-shadow-error:hover { box-shadow: var(--shadow-error-sm); }

/* ── Reduced Motion ── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Add motion CSS link to all HTML files**

In each of the 20 HTML files, add after the `openreel.css` link:

```html
<link rel="stylesheet" href="css/openreel-motion.css" />
```

- [ ] **Step 3: Commit**

```bash
git add css/openreel-motion.css *.html
git commit -m "feat: complete openreel-motion.css — all component animations, colored shadows, reduced motion"
```

---

### Task 11: Create `js/openreel-effects.js` — GSAP scroll animations

**Files:**
- Create: `js/openreel-effects.js`

- [ ] **Step 1: Create directory and file with GSAP loader + scroll animations**

```bash
mkdir -p /Users/sergio/Downloads/openreel-design-system/js
```

Write `js/openreel-effects.js`:

```js
/* ===========================================
   OpenReel Design System — openreel-effects.js
   Advanced effects: GSAP, Three.js, WebGL
   Optional — load with defer, activates via data-or-* attributes
   =========================================== */

(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── CDN URLs ──
  const CDNS = {
    gsap: "https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js",
    scrollTrigger: "https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js",
    three: "https://cdn.jsdelivr.net/npm/three@0.170/build/three.module.min.js",
  };

  // ── Lazy loader ──
  const loaded = {};
  function loadScript(url) {
    if (loaded[url]) return loaded[url];
    loaded[url] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return loaded[url];
  }

  // ── GSAP Scroll Animations ──
  async function initScrollAnimations() {
    const els = document.querySelectorAll("[data-or-animate]");
    if (!els.length) return;

    await loadScript(CDNS.gsap);
    await loadScript(CDNS.scrollTrigger);

    const { gsap } = window;
    gsap.registerPlugin(window.ScrollTrigger);

    els.forEach((el) => {
      const type = el.dataset.orAnimate;
      const delay = parseFloat(el.dataset.orDelay) || 0;
      const duration = reducedMotion ? 0.01 : 0.6;

      const base = {
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        duration,
        delay,
        ease: "power2.out",
      };

      switch (type) {
        case "fade-up":
          gsap.from(el, { ...base, y: 24, opacity: 0 });
          break;
        case "fade-down":
          gsap.from(el, { ...base, y: -24, opacity: 0 });
          break;
        case "fade-left":
          gsap.from(el, { ...base, x: -24, opacity: 0 });
          break;
        case "fade-right":
          gsap.from(el, { ...base, x: 24, opacity: 0 });
          break;
        case "fade-in":
          gsap.from(el, { ...base, opacity: 0 });
          break;
        case "scale-up":
          gsap.from(el, { ...base, scale: 0.9, opacity: 0 });
          break;
        case "stagger":
          gsap.from(el.children, {
            ...base,
            y: 16,
            opacity: 0,
            stagger: 0.08,
          });
          break;
        case "split-chars": {
          const text = el.textContent;
          el.textContent = "";
          el.style.display = "inline-block";
          [...text].forEach((char) => {
            const span = document.createElement("span");
            span.textContent = char === " " ? "\u00A0" : char;
            span.style.display = "inline-block";
            span.style.opacity = "0";
            el.appendChild(span);
          });
          gsap.to(el.children, {
            ...base,
            opacity: 1,
            y: 0,
            stagger: 0.03,
          });
          gsap.set(el.children, { y: 8 });
          break;
        }
      }
    });
  }

  // ── Init on DOM ready ──
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    initScrollAnimations();
    initParticles();
    initGradient();
    initParallax();
  }
```

- [ ] **Step 2: Commit partial**

```bash
git add js/openreel-effects.js
git commit -m "feat: openreel-effects.js — GSAP scroll animations with lazy loading"
```

---

### Task 12: Extend `openreel-effects.js` — Three.js particles, WebGL gradient, parallax

**Files:**
- Modify: `js/openreel-effects.js` (append before closing `})();`)

- [ ] **Step 1: Add Three.js particle field**

Append to `js/openreel-effects.js` (before the closing `})();`):

```js
  // ── Three.js Particle Field ──
  async function initParticles() {
    const containers = document.querySelectorAll("[data-or-particles]");
    if (!containers.length) return;

    await loadScript(CDNS.three);
    const THREE = window.THREE;

    containers.forEach((container) => {
      container.style.position = "relative";
      const count = parseInt(container.dataset.orParticleCount) || 60;
      const color = container.dataset.orParticleColor || "#1F12DE";
      const size = parseFloat(container.dataset.orParticleSize) || 2;
      const speed = parseFloat(container.dataset.orParticleSpeed) || 0.5;
      const baseOpacity = parseFloat(container.dataset.orParticleOpacity) || 0.4;
      const showLines = container.dataset.orParticleLines === "true";

      const canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;";
      container.insertBefore(canvas, container.firstChild);

      // Ensure content is above canvas
      Array.from(container.children).forEach((child) => {
        if (child !== canvas) child.style.position = child.style.position || "relative";
        if (child !== canvas) child.style.zIndex = child.style.zIndex || "1";
      });

      const ctx = canvas.getContext("2d");
      let w, h, particles, animId;

      function resize() {
        w = canvas.width = container.offsetWidth;
        h = canvas.height = container.offsetHeight;
      }

      function createParticles() {
        particles = Array.from({ length: count }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
        }));
      }

      let mouseX = w / 2, mouseY = h / 2;
      container.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      });

      function draw() {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = color;
        ctx.globalAlpha = baseOpacity;

        particles.forEach((p) => {
          if (!reducedMotion) {
            // Subtle mouse attraction
            const dx = mouseX - p.x;
            const dy = mouseY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
              p.vx += dx * 0.00005;
              p.vy += dy * 0.00005;
            }

            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
        });

        if (showLines) {
          ctx.strokeStyle = color;
          ctx.globalAlpha = baseOpacity * 0.3;
          ctx.lineWidth = 0.5;
          for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
              const dx = particles[i].x - particles[j].x;
              const dy = particles[i].y - particles[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 100) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
              }
            }
          }
        }

        animId = requestAnimationFrame(draw);
      }

      // IntersectionObserver — pause when not visible
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          if (!animId) draw();
        } else {
          cancelAnimationFrame(animId);
          animId = null;
        }
      });

      resize();
      createParticles();
      observer.observe(container);
      window.addEventListener("resize", () => { resize(); createParticles(); });
    });
  }
```

- [ ] **Step 2: Add WebGL animated gradient**

Continue appending:

```js
  // ── WebGL Animated Gradient ──
  function initGradient() {
    const containers = document.querySelectorAll("[data-or-gradient]");
    if (!containers.length) return;

    containers.forEach((container) => {
      container.style.position = "relative";
      const colorsStr = container.dataset.orGradientColors || "#1F12DE,#2970FF,#17B26A";
      const colors = colorsStr.split(",").map((c) => c.trim());
      const speed = parseFloat(container.dataset.orGradientSpeed) || 1;

      const canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;border-radius:inherit;";
      container.insertBefore(canvas, container.firstChild);

      Array.from(container.children).forEach((child) => {
        if (child !== canvas) {
          child.style.position = child.style.position || "relative";
          child.style.zIndex = child.style.zIndex || "1";
        }
      });

      const gl = canvas.getContext("webgl");
      if (!gl) {
        // Fallback: CSS gradient
        canvas.remove();
        container.style.background = `linear-gradient(135deg, ${colors.join(", ")})`;
        return;
      }

      function resize() {
        canvas.width = container.offsetWidth * window.devicePixelRatio;
        canvas.height = container.offsetHeight * window.devicePixelRatio;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      const vertSrc = `attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0,1);}`;
      const fragSrc = `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_res;
        uniform vec3 u_c0, u_c1, u_c2;
        void main(){
          vec2 uv = gl_FragCoord.xy / u_res;
          float t = u_time * 0.15;
          float n = sin(uv.x*3.0+t)*0.5+sin(uv.y*2.5-t*0.7)*0.5;
          n = n*0.5+0.5;
          vec3 col = mix(mix(u_c0, u_c1, uv.x+sin(t)*0.2), u_c2, uv.y+n*0.3);
          gl_FragColor = vec4(col, 1.0);
        }
      `;

      function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      const uTime = gl.getUniformLocation(prog, "u_time");
      const uRes = gl.getUniformLocation(prog, "u_res");

      // Parse hex colors to vec3
      function hexToVec3(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
      }

      const c = colors.map(hexToVec3);
      gl.uniform3fv(gl.getUniformLocation(prog, "u_c0"), c[0] || [0.12, 0.07, 0.87]);
      gl.uniform3fv(gl.getUniformLocation(prog, "u_c1"), c[1] || [0.16, 0.44, 1]);
      gl.uniform3fv(gl.getUniformLocation(prog, "u_c2"), c[2] || [0.09, 0.7, 0.42]);

      let animId;
      function draw(t) {
        if (reducedMotion) t = 0;
        gl.uniform1f(uTime, t * 0.001 * speed);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animId = requestAnimationFrame(draw);
      }

      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { if (!animId) draw(0); }
        else { cancelAnimationFrame(animId); animId = null; }
      });

      resize();
      observer.observe(container);
      window.addEventListener("resize", resize);
    });
  }
```

- [ ] **Step 3: Add parallax**

Continue appending:

```js
  // ── Parallax ──
  function initParallax() {
    const els = document.querySelectorAll("[data-or-parallax]");
    if (!els.length || reducedMotion) return;

    function update() {
      const scrollY = window.scrollY;
      els.forEach((el) => {
        const factor = parseFloat(el.dataset.orParallax) || 0.3;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + scrollY - window.innerHeight / 2) * factor;
        el.style.transform = `translate3d(0, ${-offset}px, 0)`;
      });
    }

    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => { update(); ticking = false; });
        ticking = true;
      }
    });
    update();
  }
```

Then close the IIFE with `})();`.

- [ ] **Step 4: Commit**

```bash
git add js/openreel-effects.js
git commit -m "feat: openreel-effects.js — Three.js particles, WebGL gradient, parallax"
```

---

### Task 13: Update CLAUDE.md with new structure

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update project structure section**

Add the new files to the project structure in `CLAUDE.md`:

```markdown
openreel-design-system/
├── css/
│   ├── openreel.css          # Base: tokens + reset + component styles
│   └── openreel-motion.css   # Motion: transitions, hovers, colored shadows (optional)
├── js/
│   └── openreel-effects.js   # Advanced: GSAP, Three.js, WebGL (optional, opt-in)
├── scripts/
│   └── sync-tokens.js        # Generates tokens.json from mcp/registry.json
├── index.html                # Main DS documentation (61 components)
├── ...
```

- [ ] **Step 2: Add Motion Tokens section**

After the existing Shadows section, add:

```markdown
### Motion

\`\`\`css
--duration-instant: 50ms;  --duration-fast: 100ms;
--duration-normal: 200ms;  --duration-slow: 300ms;

--ease-default: cubic-bezier(0.2, 0, 0, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
\`\`\`

### Colored Shadows (Accent)

\`\`\`css
--shadow-brand-sm: 0 2px 8px rgba(31, 18, 222, 0.15);
--shadow-brand-md: 0 4px 14px rgba(31, 18, 222, 0.2);
--shadow-brand-lg: 0 8px 24px rgba(31, 18, 222, 0.25);
--shadow-success-sm: 0 2px 8px rgba(23, 178, 106, 0.15);
--shadow-error-sm: 0 2px 8px rgba(240, 68, 56, 0.15);
--shadow-warning-sm: 0 2px 8px rgba(181, 71, 8, 0.15);
\`\`\`
```

- [ ] **Step 3: Add Advanced Effects section**

```markdown
## Advanced Effects (Optional)

Load `js/openreel-effects.js` for GSAP/Three.js/WebGL effects. All activate via `data-or-*` attributes:

| Attribute | Effect |
|-----------|--------|
| `data-or-animate="fade-up"` | GSAP scroll-triggered fade up |
| `data-or-animate="stagger"` | Children stagger in on scroll |
| `data-or-animate="split-chars"` | Character-by-character text reveal |
| `data-or-particles` | Three.js floating particle field |
| `data-or-gradient` | WebGL animated mesh gradient |
| `data-or-parallax="0.3"` | Scroll parallax (factor 0-1) |
```

- [ ] **Step 4: Update Rules Summary**

Add to the rules:
```markdown
11. **ALWAYS** use motion tokens (`--duration-*`, `--ease-*`) for transitions, never hardcoded ms/bezier values
12. **ALWAYS** respect `prefers-reduced-motion` — use `openreel-motion.css` which handles this globally
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with motion tokens, colored shadows, advanced effects"
```

---

### Task 14: Final verification

- [ ] **Step 1: Verify MCP server starts without errors**

```bash
cd /Users/sergio/Downloads/openreel-design-system
node -e "
const {readFileSync} = require('fs');
const reg = JSON.parse(readFileSync('mcp/registry.json','utf8'));
console.log('Components:', reg.components.length);
console.log('With element field:', reg.components.filter(c => c.element).length);
console.log('Guideline topics:', Object.keys(reg.guidelines).length);
console.log('Token categories:', Object.keys(reg.tokens).length);
console.log('Has motion tokens:', !!reg.tokens.motion);
console.log('Has colored shadows:', !!reg.tokens.coloredShadows);
"
```

Expected:
```
Components: 61
With element field: 61
Guideline topics: 7
Token categories: 8 (or more)
Has motion tokens: true
Has colored shadows: true
```

- [ ] **Step 2: Verify CSS files exist and have content**

```bash
ls -la css/ js/ scripts/
wc -l css/openreel.css css/openreel-motion.css js/openreel-effects.js
```

Expected: `openreel.css` >200 lines, `openreel-motion.css` >200 lines, `openreel-effects.js` >200 lines.

- [ ] **Step 3: Open index.html in browser**

Verify visually that:
- Components render correctly
- Dark mode toggle works
- Hover states are animated (buttons lift, cards elevate)
- Input focus shows brand-colored ring

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat: OpenReel DS 2.0 — complete upgrade with motion layer and advanced effects"
```
