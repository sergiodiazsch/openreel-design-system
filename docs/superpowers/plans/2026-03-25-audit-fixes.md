# OpenReel Design System — Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 22 audit issues found in the OpenReel Design System, prioritized by severity (Critical > High > Medium).

**Architecture:** Static HTML site with no build tools. Each HTML file is self-contained with its own `<style>` block and inline tokens. Fixes must be applied per-file. No shared CSS file exists — all changes are inline within each HTML page.

**Tech Stack:** Static HTML, CSS custom properties, vanilla JS, Tailwind CDN, Inter font

---

## Task 1: Skip-to-Content Links (Critical — WCAG 2.4.1 Level A)

**Files to modify (19 pages — login.html excluded since it has no nav):**
- `index.html`, `playground.html`, `forms.html`, `animations.html`, `a11y.html`
- `data-viz.html`, `icons.html`, `templates.html`, `layouts.html`
- `figma-handoff.html`, `email-templates.html`, `changelog.html`, `mcp-guide.html`
- `assistant.html`, `demo-dashboard.html`, `theme-builder.html`
- `part-components.html`, `part-guidelines.html`, `part-shell.html`

- [ ] **Step 1: Add sr-only CSS class and skip link to index.html**

In the `<style>` block (before `</style>`), add:

```css
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
.sr-only:focus {
  position: fixed; top: 8px; left: 8px; z-index: 9999;
  width: auto; height: auto; padding: 12px 24px;
  margin: 0; overflow: visible; clip: auto;
  background: var(--brand); color: #fff;
  font-size: 14px; font-weight: 600;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  white-space: normal;
}
```

Immediately after `<body>`, add:

```html
<a href="#main-content" class="sr-only">Skip to content</a>
```

Add `id="main-content"` to the content div after the sidebar (the main content wrapper inside the flex layout at ~line 1500). If a `<main>` element exists, use that instead.

- [ ] **Step 2: Verify skip link works**

Open index.html in browser, press Tab — the "Skip to content" link should appear at top-left with brand color background. Press Enter — focus should jump to main content area.

- [ ] **Step 3: Add skip link to batch 1 (6 files)**

Apply the same pattern to: `playground.html`, `forms.html`, `animations.html`, `a11y.html`, `data-viz.html`, `icons.html`.

For each file:
1. Add `.sr-only` and `.sr-only:focus` CSS rules to `<style>` block
2. Add `<a href="#main-content" class="sr-only">Skip to content</a>` after `<body>`
3. Add `id="main-content"` to the `<main>` element or primary content wrapper

- [ ] **Step 4: Add skip link to batch 2 (6 files)**

Apply to: `templates.html`, `layouts.html`, `figma-handoff.html`, `email-templates.html`, `changelog.html`, `mcp-guide.html`.

- [ ] **Step 5: Add skip link to batch 3 (6 files)**

Apply to: `assistant.html`, `demo-dashboard.html`, `theme-builder.html`, `part-components.html`, `part-guidelines.html`, `part-shell.html`.

- [ ] **Step 6: Commit**

```bash
git add *.html
git commit -m "a11y: add skip-to-content links to all pages (WCAG 2.4.1)"
```

---

## Task 2: Semantic HTML — Span to Button (Critical — WCAG 4.1.2 Level A)

**Files:**
- Modify: `index.html` lines 1043, 1073
- Modify: `mcp-guide.html` lines 316, 342

- [ ] **Step 1: Fix index.html dropdown triggers**

Replace the two `<span>` dropdown triggers with `<button>` elements:

**Line 1043** — change:
```html
<span class="header-nav-link" tabindex="0">
```
to:
```html
<button class="header-nav-link" type="button" aria-haspopup="true" aria-expanded="false">
```

**Line 1073** — same change. Update both closing tags from `</span>` to `</button>`.

Add CSS to reset button styles (in the `<style>` block):

```css
button.header-nav-link {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  padding: inherit;
}
```

- [ ] **Step 2: Fix mcp-guide.html dropdown triggers**

Same changes at lines 316 and 342. Add the same `button.header-nav-link` CSS reset.

- [ ] **Step 3: Verify dropdowns still work**

Open both pages, hover/click Tools and Resources dropdowns — they should still open/close. Tab to them — should be focusable and announced as buttons.

- [ ] **Step 4: Commit**

```bash
git add index.html mcp-guide.html
git commit -m "a11y: replace span dropdown triggers with semantic buttons"
```

---

## Task 3: Modal Accessibility (Critical — WCAG 2.4.3 Level A)

**Files:**
- Modify: `index.html` lines 1155-1165 (modal markup) and lines 970-987 (keyboard handler)

- [ ] **Step 1: Add ARIA attributes to modal markup**

Replace the modal at line 1155:

```html
<div id="kbd-shortcuts-modal" class="kbd-modal-overlay" onclick="if(event.target===this)this.classList.remove('open')">
  <div class="kbd-modal">
    <h3>Keyboard Shortcuts</h3>
```

with:

```html
<div id="kbd-shortcuts-modal" class="kbd-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="kbd-modal-title" onclick="if(event.target===this)closeKbdModal()">
  <div class="kbd-modal" tabindex="-1">
    <h3 id="kbd-modal-title">Keyboard Shortcuts</h3>
```

- [ ] **Step 2: Add open/close functions and refactor existing keyboard handler**

Add these functions in the `<script>` section:

```javascript
function openKbdModal() {
  var modal = document.getElementById('kbd-shortcuts-modal');
  modal.classList.add('open');
  modal.querySelector('.kbd-modal').focus();
}

function closeKbdModal() {
  var modal = document.getElementById('kbd-shortcuts-modal');
  modal.classList.remove('open');
}
```

Then update the existing keyboard handler at line 970-987. Change line 973:
```javascript
// Before:
if (kbdModal) kbdModal.classList.remove('open');
// After:
if (kbdModal && kbdModal.classList.contains('open')) { closeKbdModal(); return; }
```

Change line 987:
```javascript
// Before:
if (kbdModal) kbdModal.classList.toggle('open');
// After:
if (kbdModal) {
  if (kbdModal.classList.contains('open')) closeKbdModal();
  else openKbdModal();
}
```

**Note:** This modal has no interactive children (only displays shortcut text), so a full focus trap is not needed — the modal itself receives focus and Escape closes it. The commit message should reflect this accurately.

- [ ] **Step 3: Verify modal behavior**

Open index.html, press `?` — modal should open with focus on the modal container. Press Escape — modal closes. Click overlay — modal closes. Screen reader should announce "Keyboard Shortcuts" dialog.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "a11y: add ARIA dialog role, focus management, and Escape handler to shortcuts modal"
```

---

## Task 4: ARIA on Sidebar Groups (High — WCAG 4.1.2)

**Files:**
- Modify: `index.html` lines 1218, 1263, 1314, 1344, 1380, 1413, 1437

- [ ] **Step 1: Add aria-expanded and aria-controls to all 7 sidebar group buttons**

Update all 7 buttons. Example for first one at line 1218:

```html
<!-- Before -->
<button class="sidebar-group collapsed" data-group="form-controls" onclick="toggleSidebarGroup(this)">

<!-- After -->
<button class="sidebar-group collapsed" data-group="form-controls" onclick="toggleSidebarGroup(this)" aria-expanded="false" aria-controls="group-form-controls">
```

And add matching `id` to each `<div class="sidebar-group-items">`:

```html
<div class="sidebar-group-items" id="group-form-controls" style="max-height:0">
```

Full mapping:
| Line | data-group | id to add on items div |
|------|-----------|------------------------|
| 1218 | form-controls | group-form-controls |
| 1263 | data-display | group-data-display |
| 1314 | feedback | group-feedback |
| 1344 | navigation | group-navigation |
| 1380 | layout | group-layout |
| 1413 | overlay | group-overlay |
| 1437 | content | group-content |

- [ ] **Step 2: Update toggleSidebarGroup() to toggle aria-expanded**

Find the `toggleSidebarGroup` function in the `<script>` section and add after the collapsed class toggle:

```javascript
btn.setAttribute('aria-expanded', !btn.classList.contains('collapsed'));
```

- [ ] **Step 3: Verify**

Open index.html, click each sidebar group — inspect DOM to confirm `aria-expanded` toggles between `true`/`false`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "a11y: add aria-expanded and aria-controls to sidebar groups"
```

---

## Task 5: Touch Targets — Increase to 44px Minimum (High — WCAG 2.5.5)

**All 14 files with `.dm-toggle`:**
- `index.html`, `playground.html`, `forms.html`, `a11y.html`, `animations.html`
- `changelog.html`, `data-viz.html`, `email-templates.html`, `figma-handoff.html`
- `icons.html`, `layouts.html`, `mcp-guide.html`, `templates.html`, `part-shell.html`

**Note:** Some files use `36px` (a11y, data-viz, email-templates, forms) while others use `40px`.

- [ ] **Step 1: Fix .dm-toggle in batch 1 (7 files)**

In `index.html`, `playground.html`, `animations.html`, `changelog.html`, `icons.html`, `layouts.html`, `mcp-guide.html` — find the `.dm-toggle` CSS rule and change width/height to `44px`:

```css
.dm-toggle {
  width: 44px;
  height: 44px;
}
```

- [ ] **Step 2: Fix .dm-toggle in batch 2 (7 files)**

In `forms.html`, `a11y.html`, `data-viz.html`, `email-templates.html`, `figma-handoff.html`, `templates.html`, `part-shell.html` — same fix.

- [ ] **Step 3: Fix sidebar link minimum height in index.html**

Add to the `.nav-link` styles:

```css
.nav-link {
  min-height: 44px;
  display: flex;
  align-items: center;
}
```

- [ ] **Step 4: Verify touch targets**

Open Chrome DevTools, toggle device toolbar, inspect button dimensions — all should be >= 44x44px.

- [ ] **Step 5: Commit**

```bash
git add *.html
git commit -m "a11y: increase touch targets to 44px minimum (WCAG 2.5.5)"
```

---

## Task 6: Nav Dot Inline Styles to CSS Classes (High — Maintainability)

**Files:**
- Modify: `index.html` lines 1224-1460 (all `cat-dot` elements)

**Note:** These category colors don't have existing CSS token variables. We define them as classes — an improvement over inline styles even though they use hex values. Creating new token variables for sidebar-only colors is out of scope.

- [ ] **Step 1: Add CSS classes for category colors**

In the `<style>` block of index.html, add:

```css
.cat-dot--form-controls { background: #2970FF; }
.cat-dot--data-display  { background: #17B26A; }
.cat-dot--feedback      { background: #F5A623; }
.cat-dot--navigation    { background: #7C3AED; }
.cat-dot--layout        { background: #98A2B3; }
.cat-dot--overlay       { background: #EC4899; }
.cat-dot--content       { background: #F97316; }
```

- [ ] **Step 2: Replace all inline styles with classes**

Use find-and-replace in index.html:
- `<span class="cat-dot" style="background:#2970FF">` → `<span class="cat-dot cat-dot--form-controls">` (12 items, lines 1224-1259)
- `<span class="cat-dot" style="background:#17B26A">` → `<span class="cat-dot cat-dot--data-display">` (14 items, lines 1269-1310)
- `<span class="cat-dot" style="background:#F5A623">` → `<span class="cat-dot cat-dot--feedback">` (7 items, lines 1320-1340)
- `<span class="cat-dot" style="background:#7C3AED">` → `<span class="cat-dot cat-dot--navigation">` (9 items, lines 1350-1376)
- `<span class="cat-dot" style="background:#98A2B3">` → `<span class="cat-dot cat-dot--layout">` (8 items, lines 1386-1409)
- `<span class="cat-dot" style="background:#EC4899">` → `<span class="cat-dot cat-dot--overlay">` (5 items, lines 1419-1433)
- `<span class="cat-dot" style="background:#F97316">` → `<span class="cat-dot cat-dot--content">` (6 items, lines 1443-1460+)

- [ ] **Step 3: Verify sidebar renders identically**

Open index.html, expand each sidebar group — dots should show the same colors as before.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "refactor: replace 61 cat-dot inline styles with CSS classes"
```

---

## Task 7: Heading Hierarchy Fixes (High — WCAG 1.3.1)

**Files:**
- Modify: `a11y.html` (6 specific h3 tags)
- Modify: `assistant.html` line 1259

- [ ] **Step 1: Fix a11y.html heading hierarchy**

Change these 6 `<h3>` elements to `<h2>` (they follow `<h1>` with no intervening `<h2>`):

| Line | Current | Change to |
|------|---------|-----------|
| 265 | `<h3>Color Blindness Simulator</h3>` | `<h2>Color Blindness Simulator</h2>` |
| 285 | `<h3>Keyboard Navigation Tester</h3>` | `<h2>Keyboard Navigation Tester</h2>` |
| 383 | `<h3>Focus Order Visualizer</h3>` | `<h2>Focus Order Visualizer</h2>` |
| 465 | `<h3>Touch Target Checker</h3>` | `<h2>Touch Target Checker</h2>` |
| 488 | `<h3>WCAG 2.5.5 Reference</h3>` | `<h2>WCAG 2.5.5 Reference</h2>` |
| 498 | `<h3>ARIA Roles & Patterns Reference</h3>` | `<h2>ARIA Roles & Patterns Reference</h2>` |

**Do NOT change** these h3 tags (they are correctly nested inside modals/subsections):
- Line 368: `<h3 id="modal-title"...>Demo Modal</h3>` — inside a dialog
- Line 509: `<h3>ARIA Roles</h3>` — inside a subsection of the ARIA reference

If any of these h2 elements look visually too large, add an inline style to match the previous h3 size: `style="font-size:var(--text-lg)"`.

- [ ] **Step 2: Fix assistant.html heading hierarchy**

At line 1259, first check what headings precede it. Read lines ~1080-1260 to verify the heading chain. If the hierarchy is h1 → h3 (skipping h2), change to `<h2>`. If there's a valid h2 parent, keep as h3.

- [ ] **Step 3: Commit**

```bash
git add a11y.html assistant.html
git commit -m "a11y: fix heading hierarchy — no skipped h2 levels"
```

---

## Task 8: MCP Server Error Handling (High — Reliability)

**Files:**
- Modify: `mcp/index.js` lines 14-21

- [ ] **Step 1: Wrap registry loading in try-catch**

Replace lines 14-21:

```javascript
const registry = JSON.parse(
  readFileSync(join(__dirname, "registry.json"), "utf-8")
);

const components = registry.components;
const tokens = registry.tokens;
const guidelines = registry.guidelines;
const templates = registry.templates;
```

with:

```javascript
let registry;
try {
  registry = JSON.parse(
    readFileSync(join(__dirname, "registry.json"), "utf-8")
  );
} catch (err) {
  console.error(`Failed to load registry.json: ${err.message}`);
  process.exit(1);
}

const components = registry.components;
const tokens = registry.tokens;
const guidelines = registry.guidelines;
const templates = registry.templates;
```

- [ ] **Step 2: Verify MCP server starts**

```bash
cd /Users/sergio/Downloads/openreel-design-system/mcp && node index.js
```

Expected: Server starts without errors (will hang waiting for stdio input — Ctrl+C to exit).

- [ ] **Step 3: Commit**

```bash
git add mcp/index.js
git commit -m "fix: add error handling to MCP server registry loading"
```

---

## Task 9: prefers-reduced-motion on Missing Files (Medium — WCAG 2.3.3)

**Files:**
- Modify: `data-viz.html`
- Modify: `forms.html`
- Modify: `icons.html`

- [ ] **Step 1: Add reduced motion media query to data-viz.html**

In the `<style>` block, add before `</style>`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Add to forms.html and icons.html**

Same CSS block added to each file's `<style>` section.

- [ ] **Step 3: Commit**

```bash
git add data-viz.html forms.html icons.html
git commit -m "a11y: add prefers-reduced-motion to data-viz, forms, icons"
```

---

## Task 10: Expensive Animations — Replace height/width with transforms (Medium — Performance)

**Files:**
- Modify: `data-viz.html` only (the `barGrow` and `hbarGrow` keyframes exist here, NOT in animations.html)

- [ ] **Step 1: Fix vertical bar chart animation in data-viz.html**

Find `@keyframes barGrow` (~line 89) and replace:

```css
/* Before */
@keyframes barGrow { from { height: 0 !important; } }

/* After */
@keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
```

Add `transform-origin: bottom;` to the `.bar` rule.

**Visual note:** `scaleY` will compress border-radius during animation. If the bars have `border-radius: 6px 6px 0 0`, this may look slightly squished. Alternative: use `clip-path: inset(100% 0 0 0)` to `clip-path: inset(0)` instead of scaleY for pixel-perfect results.

- [ ] **Step 2: Fix horizontal bar chart animation**

Find `@keyframes hbarGrow` (~line 105) and replace:

```css
/* Before */
@keyframes hbarGrow { from { width: 0 !important; } }

/* After */
@keyframes hbarGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
```

Add `transform-origin: left;` to `.hbar` elements.

- [ ] **Step 3: Verify animations look correct**

Open data-viz.html and check that bar charts animate smoothly from bottom/left.

- [ ] **Step 4: Commit**

```bash
git add data-viz.html
git commit -m "perf: replace height/width animations with transforms in data-viz"
```

---

## Task 11: Fix outline:none Without Alternative (Medium — WCAG 2.4.7)

**Files:**
- Modify: `a11y.html`
- Modify: `animations.html`
- Modify: `changelog.html`

- [ ] **Step 1: Audit and fix a11y.html outline:none declarations**

Check each `outline:none` and determine if it's in a `<style>` block or inline:

| Line | Selector / Location | Type | Fix |
|------|---------------------|------|-----|
| 135 | `.search-input` | `<style>` block | Add `.search-input:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }` |
| 165 | `.demo-dropdown-btn:focus` | `<style>` block | Change to `.demo-dropdown-btn:focus { outline: none; }` + `.demo-dropdown-btn:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }` |
| 270 | hex input | inline style | Remove `outline:none` from inline style; add `.hex-input:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }` to `<style>` block |
| 307 | email input | inline style | Same approach — move to class, add focus-visible |
| 405, 420, 421 | form inputs | `<style>` block | Add corresponding `:focus-visible` rules |

- [ ] **Step 2: Fix animations.html**

Lines 364, 392: Add `:focus-visible` rules for each selector that has `outline:none`.

- [ ] **Step 3: Fix changelog.html**

Lines 389, 650: Same approach.

- [ ] **Step 4: Verify focus indicators**

Tab through each page — every interactive element should show a visible focus ring.

- [ ] **Step 5: Commit**

```bash
git add a11y.html animations.html changelog.html
git commit -m "a11y: add focus-visible indicators where outline:none removes them"
```
