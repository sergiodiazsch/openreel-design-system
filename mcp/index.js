#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Load registry ──────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────

function fuzzyMatch(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // simple edit-distance check for typos
  if (q.length > 3 && t.length > 3) {
    for (let i = 0; i <= t.length - q.length + 1; i++) {
      let matches = 0;
      for (let j = 0; j < q.length; j++) {
        if (t[i + j] === q[j]) matches++;
      }
      if (matches >= q.length * 0.7) return true;
    }
  }
  return false;
}

function findComponent(name) {
  const slug = name.toLowerCase().replace(/[\s_]/g, "-");
  return components.find(
    (c) =>
      c.slug === slug ||
      c.name.toLowerCase() === name.toLowerCase() ||
      c.slug.includes(slug) ||
      slug.includes(c.slug)
  );
}

function suggestComponents(name) {
  const slug = name.toLowerCase();
  return components
    .filter((c) => fuzzyMatch(slug, c.name) || fuzzyMatch(slug, c.slug) || fuzzyMatch(slug, c.category))
    .slice(0, 5)
    .map((c) => c.name);
}

const prefixMap = { spacing: "space", borderRadius: "radius", shadows: "shadow" };

function generateTokensCSS(category) {
  let lines = [":root {"];
  const cats = category ? { [category]: tokens[category] } : tokens;
  for (const [cat, values] of Object.entries(cats)) {
    if (typeof values === "object" && !Array.isArray(values)) {
      lines.push(`  /* ── ${cat} ── */`);
      if (cat === "typography") {
        lines.push(`  --font-family: ${values.fontFamily};`);
        if (values.sizes) for (const [k, v] of Object.entries(values.sizes)) lines.push(`  --text-${k}: ${v};`);
        if (values.weights) for (const [k, v] of Object.entries(values.weights)) lines.push(`  --font-${k}: ${v};`);
        if (values.lineHeights) for (const [k, v] of Object.entries(values.lineHeights)) lines.push(`  --leading-${k}: ${v};`);
      } else if (cat === "colors" || cat === "dark") {
        // Colors already have descriptive names (--brand, --gray-500, --bg-primary)
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === "object") {
            for (const [k2, v2] of Object.entries(v)) lines.push(`  --${k}-${k2}: ${v2};`);
          } else {
            lines.push(`  --${k}: ${v};`);
          }
        }
      } else {
        // Use prefix to avoid collisions: --space-1, --radius-sm, --shadow-xs
        const prefix = prefixMap[cat] || cat;
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === "object") {
            for (const [k2, v2] of Object.entries(v)) lines.push(`  --${prefix}-${k}-${k2}: ${v2};`);
          } else {
            lines.push(`  --${prefix}-${k}: ${v};`);
          }
        }
      }
    }
  }
  lines.push("}");
  return lines.join("\n");
}

function generateTokensSCSS(category) {
  let lines = [];
  const cats = category ? { [category]: tokens[category] } : tokens;
  for (const [cat, values] of Object.entries(cats)) {
    if (typeof values === "object") {
      lines.push(`// ── ${cat} ──`);
      if (cat === "typography") {
        lines.push(`$font-family: ${values.fontFamily};`);
        if (values.sizes) for (const [k, v] of Object.entries(values.sizes)) lines.push(`$text-${k}: ${v};`);
        if (values.weights) for (const [k, v] of Object.entries(values.weights)) lines.push(`$font-${k}: ${v};`);
        if (values.lineHeights) for (const [k, v] of Object.entries(values.lineHeights)) lines.push(`$leading-${k}: ${v};`);
      } else if (cat === "colors" || cat === "dark") {
        // Colors already have descriptive names ($brand, $gray-500, $bg-primary)
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === "object") {
            for (const [k2, v2] of Object.entries(v)) lines.push(`$${k}-${k2}: ${v2};`);
          } else {
            lines.push(`$${k}: ${v};`);
          }
        }
      } else {
        // Use prefix to avoid collisions: $space-1, $radius-sm, $shadow-xs
        const prefix = prefixMap[cat] || cat;
        for (const [k, v] of Object.entries(values)) {
          if (typeof v === "object") {
            for (const [k2, v2] of Object.entries(v)) lines.push(`$${prefix}-${k}-${k2}: ${v2};`);
          } else {
            lines.push(`$${prefix}-${k}: ${v};`);
          }
        }
      }
    }
  }
  return lines.join("\n");
}

function generateTokensTailwind(category) {
  const config = { theme: { extend: {} } };
  const ext = config.theme.extend;
  if (!category || category === "colors") {
    ext.colors = {};
    for (const [k, v] of Object.entries(tokens.colors)) {
      ext.colors[k] = v;
    }
  }
  if (!category || category === "spacing") {
    ext.spacing = {};
    for (const [k, v] of Object.entries(tokens.spacing)) {
      ext.spacing[k] = v;
    }
  }
  if (!category || category === "borderRadius") {
    ext.borderRadius = {};
    for (const [k, v] of Object.entries(tokens.borderRadius)) {
      ext.borderRadius[k] = v;
    }
  }
  if (!category || category === "shadows") {
    ext.boxShadow = {};
    for (const [k, v] of Object.entries(tokens.shadows)) {
      ext.boxShadow[k] = v;
    }
  }
  return "// tailwind.config.js\n" + JSON.stringify(config, null, 2);
}

const selfClosingTags = new Set(["input", "img", "hr", "br", "area", "base", "col", "embed", "link", "meta", "param", "source", "track", "wbr"]);

function generateReactComponent(comp) {
  const name = comp.name.replace(/[\s/()-]/g, "");
  const tag = comp.element || "div";
  const propsStr = comp.props
    .map((p) => {
      const def = p.default === null ? "undefined" : JSON.stringify(p.default);
      return `  ${p.name} = ${def}`;
    })
    .join(",\n");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;
  const isSelfClosing = selfClosingTags.has(tag);
  const innerContent = isSelfClosing
    ? `    <${tag} className={classes} {...props} />`
    : `    <${tag} className={classes} {...props}>\n      {children}\n    </${tag}>`;
  const childrenProp = isSelfClosing ? "" : "\n  children,";
  return `import React from 'react';

export function ${name}({
${propsStr},${childrenProp}
  className,
  ...props
}) {
  const classes = [
    '${classExpr}',
    variant ? \`${classExpr}-\${variant}\` : '',
    size ? \`${classExpr}-\${size}\` : '',
    className
  ].filter(Boolean).join(' ');

  return (
${innerContent}
  );
}

${name}.displayName = '${name}';
`;
}

function generateVueComponent(comp) {
  const name = comp.name.replace(/[\s/()-]/g, "");
  const tag = comp.element || "div";
  const typeMap = { boolean: "Boolean", string: "String", number: "Number", array: "Array", object: "Object" };
  const propsStr = comp.props
    .map((p) => {
      const baseType = p.type.split("|")[0].trim();
      const type = typeMap[baseType] || "String";
      const def = p.default === null ? "null" : JSON.stringify(p.default);
      return `  ${p.name}: { type: ${type}, default: ${def} }`;
    })
    .join(",\n");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;
  const isSelfClosing = selfClosingTags.has(tag);
  const templateContent = isSelfClosing
    ? `  <${tag} :class="classes" />`
    : `  <${tag} :class="classes">\n    <slot />\n  </${tag}>`;
  return `<template>
${templateContent}
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

function generateSvelteComponent(comp) {
  const tag = comp.element || "div";
  const propNames = comp.props.map((p) => p.name);
  const propsDestructure = [...propNames, "children", "...rest"].join(", ");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;
  const isSelfClosing = selfClosingTags.has(tag);
  const templateContent = isSelfClosing
    ? `<${tag} class={classes} {...rest} />`
    : `<${tag} class={classes} {...rest}>\n  {@render children?.()}\n</${tag}>`;
  return `<script>
  let { ${propsDestructure} } = $props();

  const classes = $derived([
    '${classExpr}',
    variant ? \`${classExpr}-\${variant}\` : '',
    size ? \`${classExpr}-\${size}\` : ''
  ].filter(Boolean).join(' '));
</script>

${templateContent}
`;
}


// ── MCP Server ─────────────────────────────────────────────────

const server = new McpServer({
  name: "openreel-design-system",
  version: "1.0.0",
});

// ── HTML Examples Map ─────────────────────────────────────────
// Real, copy-pasteable HTML for get_component format:"html"

const htmlExamples = {
  button: `<button class="or-btn or-btn--primary or-btn--md">Primary Button</button>
<button class="or-btn or-btn--secondary or-btn--md">Secondary</button>
<button class="or-btn or-btn--tertiary or-btn--md">Tertiary</button>
<button class="or-btn or-btn--destructive or-btn--md">Delete</button>
<button class="or-btn or-btn--primary or-btn--sm">Small</button>
<button class="or-btn or-btn--primary or-btn--lg">Large</button>
<button class="or-btn or-btn--primary or-btn--md" disabled>Disabled</button>`,

  input: `<div class="or-input-group">
  <label class="or-label">Email address</label>
  <input class="or-input" type="email" placeholder="you@example.com" />
  <span class="or-input-hint">We'll never share your email.</span>
</div>
<div class="or-input-group">
  <label class="or-label">Password</label>
  <input class="or-input or-input--error" type="password" placeholder="Min. 8 characters" />
  <span class="or-input-error">Password must be at least 8 characters.</span>
</div>`,

  checkbox: `<label class="or-checkbox-wrap">
  <input type="checkbox" class="or-checkbox" id="terms" />
  <span class="or-checkbox-label">I agree to the terms and conditions</span>
</label>
<label class="or-checkbox-wrap">
  <input type="checkbox" class="or-checkbox" checked id="newsletter" />
  <span class="or-checkbox-label">Subscribe to newsletter</span>
</label>
<label class="or-checkbox-wrap">
  <input type="checkbox" class="or-checkbox" disabled id="disabled-opt" />
  <span class="or-checkbox-label">Disabled option</span>
</label>`,

  radio: `<fieldset class="or-radio-group">
  <legend class="or-label">Choose a plan</legend>
  <label class="or-radio-wrap">
    <input type="radio" class="or-radio" name="plan" value="free" />
    <span class="or-radio-label">Free</span>
  </label>
  <label class="or-radio-wrap">
    <input type="radio" class="or-radio" name="plan" value="pro" checked />
    <span class="or-radio-label">Pro</span>
  </label>
  <label class="or-radio-wrap">
    <input type="radio" class="or-radio" name="plan" value="enterprise" />
    <span class="or-radio-label">Enterprise</span>
  </label>
</fieldset>`,

  toggle: `<button class="or-toggle" role="switch" aria-checked="false" aria-label="Enable notifications">
  <span class="or-toggle__thumb"></span>
</button>
<button class="or-toggle or-toggle--active" role="switch" aria-checked="true" aria-label="Dark mode">
  <span class="or-toggle__thumb"></span>
</button>`,

  "toggle-switch": `<label class="or-toggle-switch">
  <input type="checkbox" />
  <span class="or-toggle-switch__track">
    <span class="or-toggle-switch__thumb"></span>
  </span>
  <span class="or-toggle-switch__label">Enable feature</span>
</label>`,

  select: `<div class="or-select-wrap">
  <label class="or-label">Country</label>
  <select class="or-select">
    <option value="" disabled selected>Select a country…</option>
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
    <option value="ca">Canada</option>
  </select>
</div>`,

  "file-upload": `<div class="or-file-upload">
  <input type="file" id="file-input" class="or-file-upload__input" multiple accept="image/*,.pdf" />
  <label for="file-input" class="or-file-upload__zone">
    <span class="or-file-upload__icon">&#8679;</span>
    <span class="or-file-upload__text"><strong>Click to upload</strong> or drag and drop</span>
    <span class="or-file-upload__hint">PNG, JPG, PDF up to 10MB</span>
  </label>
</div>`,

  slider: `<div class="or-slider-wrap">
  <label class="or-label">Volume</label>
  <input type="range" class="or-slider" min="0" max="100" value="60" />
  <div class="or-slider-labels"><span>0</span><span>100</span></div>
</div>`,

  badge: `<span class="or-badge or-badge--success">Success</span>
<span class="or-badge or-badge--error">Error</span>
<span class="or-badge or-badge--warning">Warning</span>
<span class="or-badge or-badge--brand">Brand</span>
<span class="or-badge or-badge--gray">Default</span>`,

  card: `<div class="or-card" style="width:280px;">
  <div class="or-card__header">
    <h3 class="or-card__title">Card Title</h3>
    <p class="or-card__subtitle">Subtitle or meta info</p>
  </div>
  <div class="or-card__body">
    <p>Card body content goes here. This is where the main information lives.</p>
  </div>
  <div class="or-card__footer">
    <button class="or-btn or-btn--secondary or-btn--sm">Cancel</button>
    <button class="or-btn or-btn--primary or-btn--sm">Confirm</button>
  </div>
</div>`,

  table: `<table class="or-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Date</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Alice Johnson</td>
      <td><span class="or-badge or-badge--success">Active</span></td>
      <td>Jan 12, 2025</td>
      <td><button class="or-btn or-btn--tertiary or-btn--sm">Edit</button></td>
    </tr>
    <tr>
      <td>Bob Smith</td>
      <td><span class="or-badge or-badge--gray">Inactive</span></td>
      <td>Mar 3, 2025</td>
      <td><button class="or-btn or-btn--tertiary or-btn--sm">Edit</button></td>
    </tr>
  </tbody>
</table>`,

  avatar: `<!-- Single avatar -->
<div class="or-avatar or-avatar--md">
  <img src="avatar.jpg" alt="Alice Johnson" />
</div>

<!-- Avatar with initials fallback -->
<div class="or-avatar or-avatar--md or-avatar--initials">AJ</div>

<!-- Avatar sizes -->
<div class="or-avatar or-avatar--xs">AJ</div>
<div class="or-avatar or-avatar--sm">AJ</div>
<div class="or-avatar or-avatar--md">AJ</div>
<div class="or-avatar or-avatar--lg">AJ</div>
<div class="or-avatar or-avatar--xl">AJ</div>`,

  tabs: `<div class="or-tabs">
  <div class="or-tabs__list" role="tablist">
    <button class="or-tabs__tab or-tabs__tab--active" role="tab" aria-selected="true" aria-controls="panel-overview">Overview</button>
    <button class="or-tabs__tab" role="tab" aria-selected="false" aria-controls="panel-analytics">Analytics</button>
    <button class="or-tabs__tab" role="tab" aria-selected="false" aria-controls="panel-settings">Settings</button>
  </div>
  <div class="or-tabs__panel" id="panel-overview" role="tabpanel">
    <p>Overview content here.</p>
  </div>
  <div class="or-tabs__panel" id="panel-analytics" role="tabpanel" hidden>
    <p>Analytics content here.</p>
  </div>
  <div class="or-tabs__panel" id="panel-settings" role="tabpanel" hidden>
    <p>Settings content here.</p>
  </div>
</div>`,

  "toast-alert": `<!-- Success toast -->
<div class="or-toast or-toast--success" role="alert">
  <span class="or-toast__icon">&#10003;</span>
  <div class="or-toast__body">
    <div class="or-toast__title">Success!</div>
    <div class="or-toast__message">Your changes have been saved.</div>
  </div>
  <button class="or-toast__close" aria-label="Dismiss">&times;</button>
</div>

<!-- Error toast -->
<div class="or-toast or-toast--error" role="alert">
  <span class="or-toast__icon">&#9888;</span>
  <div class="or-toast__body">
    <div class="or-toast__title">Error</div>
    <div class="or-toast__message">Something went wrong. Please try again.</div>
  </div>
  <button class="or-toast__close" aria-label="Dismiss">&times;</button>
</div>`,

  modal: `<div class="or-modal-backdrop or-active">
  <div class="or-modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title" style="max-width:480px;margin:auto;padding:24px;">
    <div class="or-modal__header">
      <h3 id="modal-title" class="or-modal__title">Confirm Action</h3>
      <button class="or-modal__close" aria-label="Close dialog">&times;</button>
    </div>
    <div class="or-modal__body">
      <p>Are you sure you want to delete this item? This action cannot be undone.</p>
    </div>
    <div class="or-modal__footer">
      <button class="or-btn or-btn--secondary or-btn--sm">Cancel</button>
      <button class="or-btn or-btn--destructive or-btn--sm">Delete</button>
    </div>
  </div>
</div>`,

  "progress-bar": `<!-- Determinate -->
<div class="or-progress" role="progressbar" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100">
  <div class="or-progress__bar" style="width:65%"></div>
</div>

<!-- With label -->
<div class="or-progress-labeled">
  <div class="or-progress-header">
    <span class="or-progress-label">Uploading files…</span>
    <span class="or-progress-value">65%</span>
  </div>
  <div class="or-progress" role="progressbar" aria-valuenow="65" aria-valuemin="0" aria-valuemax="100">
    <div class="or-progress__bar" style="width:65%"></div>
  </div>
</div>`,

  accordion: `<div class="or-accordion">
  <div class="or-accordion__item">
    <button class="or-accordion__trigger" aria-expanded="true" aria-controls="acc-1">
      <span>What is the return policy?</span>
      <span class="or-accordion__icon">&#9660;</span>
    </button>
    <div class="or-accordion__panel" id="acc-1">
      <p>You can return any item within 30 days of purchase for a full refund.</p>
    </div>
  </div>
  <div class="or-accordion__item">
    <button class="or-accordion__trigger" aria-expanded="false" aria-controls="acc-2">
      <span>How long does shipping take?</span>
      <span class="or-accordion__icon">&#9660;</span>
    </button>
    <div class="or-accordion__panel" id="acc-2" hidden>
      <p>Standard shipping takes 5–7 business days. Express shipping is 1–2 days.</p>
    </div>
  </div>
</div>`,

  tooltip: `<!-- Tooltip via attribute (JS-powered) -->
<button class="or-btn or-btn--secondary or-btn--sm" data-tooltip="This action cannot be undone" data-tooltip-placement="top">
  Hover me
</button>

<!-- Pure CSS tooltip -->
<span class="or-tooltip-wrap">
  <button class="or-btn or-btn--secondary or-btn--sm">Info</button>
  <span class="or-tooltip" role="tooltip">Helpful information here</span>
</span>`,

  "dropdown-menu": `<div class="or-dropdown">
  <button class="or-btn or-btn--secondary or-btn--md or-dropdown__trigger" aria-haspopup="menu" aria-expanded="false">
    Options &#9660;
  </button>
  <ul class="or-dropdown__menu" role="menu">
    <li role="menuitem"><a class="or-dropdown__item" href="#">View details</a></li>
    <li role="menuitem"><a class="or-dropdown__item" href="#">Edit</a></li>
    <li class="or-dropdown__divider" role="separator"></li>
    <li role="menuitem"><a class="or-dropdown__item or-dropdown__item--danger" href="#">Delete</a></li>
  </ul>
</div>`,

  pagination: `<nav class="or-pagination" aria-label="Page navigation">
  <button class="or-pagination__btn" aria-label="Previous page">&larr;</button>
  <button class="or-pagination__btn">1</button>
  <button class="or-pagination__btn or-pagination__btn--active" aria-current="page">2</button>
  <button class="or-pagination__btn">3</button>
  <span class="or-pagination__ellipsis">&hellip;</span>
  <button class="or-pagination__btn">12</button>
  <button class="or-pagination__btn" aria-label="Next page">&rarr;</button>
</nav>`,

  breadcrumbs: `<nav class="or-breadcrumbs" aria-label="Breadcrumb">
  <ol class="or-breadcrumbs__list">
    <li class="or-breadcrumbs__item"><a class="or-breadcrumbs__link" href="/">Home</a></li>
    <li class="or-breadcrumbs__separator" aria-hidden="true">/</li>
    <li class="or-breadcrumbs__item"><a class="or-breadcrumbs__link" href="/products">Products</a></li>
    <li class="or-breadcrumbs__separator" aria-hidden="true">/</li>
    <li class="or-breadcrumbs__item or-breadcrumbs__item--current" aria-current="page">Widget Pro</li>
  </ol>
</nav>`,

  "stat-card": `<div class="or-stat-card">
  <div class="or-stat-card__label">Total Revenue</div>
  <div class="or-stat-card__value">$84,320</div>
  <div class="or-stat-card__change or-stat-card__change--up">
    &#8593; 12.5% vs last month
  </div>
</div>`,

  "metric-card": `<div class="or-metric">
  <div class="or-metric-label">Monthly Active Users</div>
  <div class="or-metric-value">42,580</div>
  <span class="or-metric-change or-metric-change--up">+8.3%</span>
</div>`,

  "feature-card": `<div class="or-feature-card">
  <div class="or-feature-card__icon" aria-hidden="true">&#9733;</div>
  <div class="or-feature-card__title">Lightning Fast</div>
  <div class="or-feature-card__desc">Built for performance. Pages load in under 100ms with our edge network.</div>
</div>`,

  "radio-card": `<div class="or-radio-card or-radio-card--selected">
  <div class="or-radio-card__indicator" aria-hidden="true"></div>
  <div>
    <div class="or-radio-card__title">Professional Plan</div>
    <div class="or-radio-card__desc">$29/mo &mdash; Unlimited projects, 10GB storage, priority support.</div>
  </div>
</div>
<div class="or-radio-card">
  <div class="or-radio-card__indicator" aria-hidden="true"></div>
  <div>
    <div class="or-radio-card__title">Starter Plan</div>
    <div class="or-radio-card__desc">$9/mo &mdash; Up to 3 projects, 1GB storage.</div>
  </div>
</div>`,

  "code-block": `<div class="or-code-block">
  <div class="or-code-block__header">
    <span class="or-code-block__lang">HTML</span>
    <button class="or-code-block__copy" aria-label="Copy code">Copy</button>
  </div>
  <pre class="or-code-block__body"><code>&lt;div class="or-card"&gt;
  &lt;div class="or-card__body"&gt;Hello world&lt;/div&gt;
&lt;/div&gt;</code></pre>
</div>`,

  callout: `<div class="or-callout or-callout--info">
  <span class="or-callout__icon" aria-hidden="true">&#9432;</span>
  <div class="or-callout__content">
    <div class="or-callout__title">Information</div>
    <div class="or-callout__text">This action will affect all team members in your workspace.</div>
  </div>
</div>
<div class="or-callout or-callout--warning">
  <span class="or-callout__icon" aria-hidden="true">&#9888;</span>
  <div class="or-callout__content">
    <div class="or-callout__title">Warning</div>
    <div class="or-callout__text">Your trial expires in 3 days. Upgrade to keep access.</div>
  </div>
</div>`,

  "loading-overlay": `<div style="position:relative;">
  <p>Your content here…</p>
  <div class="or-loading-overlay" aria-busy="true" aria-label="Loading">
    <div class="or-loading-spinner"></div>
  </div>
</div>`,

  "cookie-banner": `<div class="or-cookie-banner or-active" role="dialog" aria-live="polite" aria-label="Cookie consent">
  <div class="or-cookie-banner__title">We use cookies</div>
  <div class="or-cookie-banner__text">We use cookies to improve your browsing experience and analyse site traffic.</div>
  <div class="or-cookie-banner__actions">
    <button class="or-btn or-btn--primary or-btn--sm">Accept all</button>
    <button class="or-btn or-btn--secondary or-btn--sm">Manage preferences</button>
  </div>
</div>`,

  combobox: `<div class="or-combobox">
  <label class="or-label" for="combobox-input">Assign to</label>
  <div class="or-combobox__wrap">
    <input class="or-combobox__input" id="combobox-input" placeholder="Search team members…" role="combobox" aria-autocomplete="list" aria-expanded="true" />
    <div class="or-combobox__list" role="listbox">
      <div class="or-combobox__option or-combobox__option--focused" role="option" aria-selected="false">Alice Johnson</div>
      <div class="or-combobox__option" role="option" aria-selected="false">Bob Smith</div>
      <div class="or-combobox__option" role="option" aria-selected="false">Carol White</div>
    </div>
  </div>
</div>`,

  "video-player": `<div class="or-video-player">
  <video id="or-player" playsinline controls preload="metadata">
    <source src="video.mp4" type="video/mp4" />
    <track kind="captions" src="captions.vtt" srclang="en" label="English" />
  </video>
</div>
<!-- Optional: Plyr enhancement -->
<script>
  if (window.Plyr) {
    const player = new Plyr('#or-player');
  }
</script>`,

  "video-card": `<div class="or-video-card">
  <div class="or-video-card__thumb">
    <img src="thumbnail.jpg" alt="How to get started in 5 minutes" />
    <div class="or-video-card__overlay">
      <button class="or-video-card__play-btn" aria-label="Play video">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21"/></svg>
      </button>
    </div>
    <span class="or-video-card__duration">5:42</span>
  </div>
  <div class="or-video-card__info">
    <div class="or-video-card__title">Getting started in 5 minutes</div>
    <div class="or-video-card__meta">3.4K views &middot; 2 days ago</div>
  </div>
</div>`,

  carousel: `<div class="or-carousel" aria-roledescription="carousel">
  <div class="or-carousel__track">
    <div class="or-carousel__slide" aria-roledescription="slide" aria-label="Slide 1 of 3">
      <img src="slide1.jpg" alt="Slide 1" />
    </div>
    <div class="or-carousel__slide" aria-roledescription="slide" aria-label="Slide 2 of 3">
      <img src="slide2.jpg" alt="Slide 2" />
    </div>
    <div class="or-carousel__slide" aria-roledescription="slide" aria-label="Slide 3 of 3">
      <img src="slide3.jpg" alt="Slide 3" />
    </div>
  </div>
  <button class="or-carousel__prev" aria-label="Previous slide">&larr;</button>
  <button class="or-carousel__next" aria-label="Next slide">&rarr;</button>
  <div class="or-carousel__dots" role="tablist">
    <button class="or-carousel__dot or-carousel__dot--active" role="tab" aria-label="Go to slide 1" aria-selected="true"></button>
    <button class="or-carousel__dot" role="tab" aria-label="Go to slide 2" aria-selected="false"></button>
    <button class="or-carousel__dot" role="tab" aria-label="Go to slide 3" aria-selected="false"></button>
  </div>
</div>`,

  "alert-banner": `<div class="or-alert-banner or-alert-banner--warning" role="alert">
  <span class="or-alert-banner__icon" aria-hidden="true">&#9888;</span>
  <span class="or-alert-banner__message">Your subscription renews on May 15, 2025. <a href="/billing" class="or-alert-banner__link">Manage billing</a></span>
  <button class="or-alert-banner__close" aria-label="Dismiss">&times;</button>
</div>`,

  skeleton: `<!-- Text skeleton -->
<div class="or-skeleton or-skeleton--text" style="width:60%;height:16px;"></div>
<div class="or-skeleton or-skeleton--text" style="width:80%;height:16px;margin-top:8px;"></div>
<div class="or-skeleton or-skeleton--text" style="width:40%;height:16px;margin-top:8px;"></div>

<!-- Card skeleton -->
<div class="or-card" style="width:280px;">
  <div class="or-skeleton" style="width:100%;height:160px;border-radius:8px;"></div>
  <div style="padding:16px;">
    <div class="or-skeleton or-skeleton--text" style="width:70%;height:18px;"></div>
    <div class="or-skeleton or-skeleton--text" style="width:90%;height:14px;margin-top:8px;"></div>
  </div>
</div>`,

  "empty-state": `<div class="or-empty-state">
  <div class="or-empty-state__icon" aria-hidden="true">&#128193;</div>
  <h3 class="or-empty-state__title">No results found</h3>
  <p class="or-empty-state__desc">Try adjusting your search or filters to find what you're looking for.</p>
  <button class="or-btn or-btn--primary or-btn--md">Clear filters</button>
</div>`,

  "sidebar-nav": `<nav class="or-sidebar-nav" aria-label="Main navigation">
  <div class="or-sidebar-nav__logo">
    <img src="logo.svg" alt="Brand" />
  </div>
  <ul class="or-sidebar-nav__list">
    <li><a class="or-sidebar-nav__item or-sidebar-nav__item--active" href="/dashboard" aria-current="page">
      <span class="or-sidebar-nav__icon" aria-hidden="true">&#9632;</span> Dashboard
    </a></li>
    <li><a class="or-sidebar-nav__item" href="/analytics">
      <span class="or-sidebar-nav__icon" aria-hidden="true">&#9650;</span> Analytics
    </a></li>
    <li><a class="or-sidebar-nav__item" href="/settings">
      <span class="or-sidebar-nav__icon" aria-hidden="true">&#9881;</span> Settings
    </a></li>
  </ul>
</nav>`,

  stepper: `<ol class="or-stepper" aria-label="Order progress">
  <li class="or-stepper__step or-stepper__step--complete">
    <span class="or-stepper__indicator" aria-hidden="true">&#10003;</span>
    <span class="or-stepper__label">Cart</span>
  </li>
  <li class="or-stepper__step or-stepper__step--active" aria-current="step">
    <span class="or-stepper__indicator" aria-hidden="true">2</span>
    <span class="or-stepper__label">Shipping</span>
  </li>
  <li class="or-stepper__step">
    <span class="or-stepper__indicator" aria-hidden="true">3</span>
    <span class="or-stepper__label">Payment</span>
  </li>
  <li class="or-stepper__step">
    <span class="or-stepper__indicator" aria-hidden="true">4</span>
    <span class="or-stepper__label">Review</span>
  </li>
</ol>`,

  drawer: `<!-- Trigger -->
<button class="or-btn or-btn--secondary or-btn--md" id="open-drawer">Open Drawer</button>

<!-- Drawer overlay + panel -->
<div class="or-drawer-backdrop" id="drawer-backdrop">
  <aside class="or-drawer or-drawer--right" role="dialog" aria-modal="true" aria-label="Settings drawer" id="settings-drawer">
    <div class="or-drawer__header">
      <h2 class="or-drawer__title">Settings</h2>
      <button class="or-drawer__close" aria-label="Close drawer">&times;</button>
    </div>
    <div class="or-drawer__body">
      <p>Drawer content goes here.</p>
    </div>
    <div class="or-drawer__footer">
      <button class="or-btn or-btn--primary or-btn--md">Save changes</button>
    </div>
  </aside>
</div>`,

  "pricing-card": `<div class="or-pricing-card or-pricing-card--featured">
  <div class="or-pricing-card__badge">Most Popular</div>
  <div class="or-pricing-card__name">Professional</div>
  <div class="or-pricing-card__price">
    <span class="or-pricing-card__currency">$</span>
    <span class="or-pricing-card__amount">29</span>
    <span class="or-pricing-card__period">/month</span>
  </div>
  <ul class="or-pricing-card__features">
    <li>&#10003; Unlimited projects</li>
    <li>&#10003; 10GB storage</li>
    <li>&#10003; Priority support</li>
    <li>&#10003; Custom domain</li>
  </ul>
  <button class="or-btn or-btn--primary or-btn--md" style="width:100%;">Get started</button>
</div>`,
};

// ── Tool: list_components ──────────────────────────────────────

server.tool(
  "list_components",
  "List all available components in the OpenReel Design System, optionally filtered by category. Categories: Form Controls, Data Display, Feedback, Navigation, Layout, Overlay, Content.",
  { category: z.string().optional().describe("Filter by category name (e.g. 'Form Controls', 'Feedback')") },
  async ({ category }) => {
    let filtered = components;
    if (category) {
      filtered = components.filter(
        (c) => c.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (filtered.length === 0) {
      const cats = [...new Set(components.map((c) => c.category))];
      return {
        content: [
          {
            type: "text",
            text: `No components found in category "${category}".\n\nAvailable categories:\n${cats.map((c) => `  - ${c}`).join("\n")}`,
          },
        ],
      };
    }

    // Group by category
    const grouped = {};
    for (const c of filtered) {
      if (!grouped[c.category]) grouped[c.category] = [];
      grouped[c.category].push(c);
    }

    let output = `# OpenReel Design System — ${filtered.length} Components\n\n`;
    for (const [cat, comps] of Object.entries(grouped)) {
      output += `## ${cat} (${comps.length})\n`;
      for (const c of comps) {
        output += `- **${c.name}** (\`${c.slug}\`) — ${c.description} [${c.status}]\n`;
      }
      output += "\n";
    }

    output += `\n_Use \`get_component\` with a component slug to get full details._`;

    return { content: [{ type: "text", text: output }] };
  }
);

// ── Tool: get_component ────────────────────────────────────────

server.tool(
  "get_component",
  "Get full details for a specific component including CSS classes, variants, props, usage guidelines, and code in HTML/React/Vue/Svelte format.",
  {
    name: z.string().describe("Component slug or name (e.g. 'button', 'toggle', 'stat-card')"),
    format: z
      .enum(["html", "react", "vue", "svelte"])
      .optional()
      .describe("Code output format. Default: html"),
  },
  async ({ name, format = "html" }) => {
    const comp = findComponent(name);

    if (!comp) {
      const suggestions = suggestComponents(name);
      return {
        content: [
          {
            type: "text",
            text: `Component "${name}" not found.\n\n${
              suggestions.length
                ? `Did you mean:\n${suggestions.map((s) => `  - ${s}`).join("\n")}`
                : "Use `list_components` to see all available components."
            }`,
          },
        ],
      };
    }

    let output = `# ${comp.name}\n\n`;
    output += `**Category:** ${comp.category}\n`;
    output += `**Status:** ${comp.status}\n`;
    output += `**Description:** ${comp.description}\n\n`;

    // Props
    output += `## Props / API\n\n`;
    output += `| Prop | Type | Default | Options |\n`;
    output += `|------|------|---------|--------|\n`;
    for (const p of comp.props) {
      const opts = p.options ? p.options.join(", ") : "—";
      output += `| \`${p.name}\` | ${p.type} | ${JSON.stringify(p.default)} | ${opts} |\n`;
    }

    // CSS Classes
    output += `\n## CSS Classes\n\n`;
    output += comp.cssClasses.map((c) => `\`${c}\``).join("  ·  ");

    // Variants
    if (comp.variants?.length) {
      output += `\n\n## Variants\n${comp.variants.join(", ")}`;
    }
    if (comp.sizes?.length) {
      output += `\n\n## Sizes\n${comp.sizes.join(", ")}`;
    }

    // Code
    output += `\n\n## Code (${format})\n\n`;
    if (format === "html") {
      output += "```html\n";
      if (htmlExamples[comp.slug]) {
        output += htmlExamples[comp.slug] + "\n";
      } else {
        // Fallback for components without a dedicated example
        const el = comp.element || "div";
        const base = comp.cssClasses?.[0] || `or-${comp.slug}`;
        const selfClosing = ["input", "img", "hr"].includes(el);
        if (selfClosing) {
          output += `<${el} class="${base}" />\n`;
        } else {
          output += `<${el} class="${base}">\n  <!-- ${comp.name} content -->\n</${el}>\n`;
        }
      }
      output += "```\n";
    } else if (format === "react") {
      output += "```jsx\n" + generateReactComponent(comp) + "```\n";
    } else if (format === "vue") {
      output += "```vue\n" + generateVueComponent(comp) + "```\n";
    } else if (format === "svelte") {
      output += "```svelte\n" + generateSvelteComponent(comp) + "```\n";
    }

    // Usage
    output += `\n## Usage Guidelines\n${comp.usage}\n`;
    output += `\n## Accessibility\n${comp.a11y}\n`;

    return { content: [{ type: "text", text: output }] };
  }
);

// ── Tool: get_tokens ───────────────────────────────────────────

server.tool(
  "get_tokens",
  "Get design tokens for the OpenReel Design System in CSS, SCSS, JSON, or Tailwind format.",
  {
    format: z
      .enum(["css", "scss", "json", "tailwind"])
      .optional()
      .describe("Token output format. Default: css"),
    category: z
      .string()
      .optional()
      .describe("Filter by token category: colors, typography, spacing, borderRadius, shadows, dark"),
  },
  async ({ format = "css", category }) => {
    if (category && !tokens[category]) {
      return {
        content: [
          {
            type: "text",
            text: `Token category "${category}" not found.\n\nAvailable: ${Object.keys(tokens).join(", ")}`,
          },
        ],
      };
    }

    let output;
    switch (format) {
      case "css":
        output = generateTokensCSS(category);
        break;
      case "scss":
        output = generateTokensSCSS(category);
        break;
      case "json":
        output = JSON.stringify(category ? tokens[category] : tokens, null, 2);
        break;
      case "tailwind":
        output = generateTokensTailwind(category);
        break;
    }

    return {
      content: [
        {
          type: "text",
          text: `# OpenReel Tokens — ${format.toUpperCase()}${category ? ` (${category})` : ""}\n\n\`\`\`${format === "tailwind" ? "js" : format}\n${output}\n\`\`\``,
        },
      ],
    };
  }
);

// ── Tool: search ───────────────────────────────────────────────

server.tool(
  "search",
  "Search across all components, tokens, and guidelines in the OpenReel Design System.",
  {
    query: z.string().describe("Search query (e.g. 'button', 'spacing', 'dark mode', 'form')"),
  },
  async ({ query }) => {
    const results = { components: [], tokens: [], guidelines: [] };

    // Search components
    for (const c of components) {
      if (
        fuzzyMatch(query, c.name) ||
        fuzzyMatch(query, c.description) ||
        fuzzyMatch(query, c.category) ||
        fuzzyMatch(query, c.slug) ||
        c.cssClasses?.some((cls) => fuzzyMatch(query, cls)) ||
        c.props?.some((p) => fuzzyMatch(query, p.name))
      ) {
        results.components.push(c);
      }
    }

    // Search tokens
    for (const [cat, values] of Object.entries(tokens)) {
      if (fuzzyMatch(query, cat)) {
        results.tokens.push({ category: cat, match: "category name" });
      } else if (typeof values === "object") {
        for (const [k, v] of Object.entries(values)) {
          if (fuzzyMatch(query, k) || (typeof v === "string" && fuzzyMatch(query, v))) {
            results.tokens.push({ category: cat, key: k, value: v });
          }
        }
      }
    }

    // Search guidelines
    for (const [topic, text] of Object.entries(guidelines)) {
      if (fuzzyMatch(query, topic) || fuzzyMatch(query, text)) {
        results.guidelines.push({ topic, excerpt: text.slice(0, 150) + "..." });
      }
    }

    let output = `# Search results for "${query}"\n\n`;

    if (results.components.length) {
      output += `## Components (${results.components.length})\n`;
      for (const c of results.components) {
        output += `- **${c.name}** (\`${c.slug}\`) — ${c.description}\n`;
      }
      output += "\n";
    }

    if (results.tokens.length) {
      output += `## Tokens (${results.tokens.length})\n`;
      for (const t of results.tokens) {
        output += t.key
          ? `- ${t.category} → \`${t.key}\`: ${typeof t.value === "object" ? JSON.stringify(t.value) : t.value}\n`
          : `- Category: **${t.category}**\n`;
      }
      output += "\n";
    }

    if (results.guidelines.length) {
      output += `## Guidelines (${results.guidelines.length})\n`;
      for (const g of results.guidelines) {
        output += `- **${g.topic}**: ${g.excerpt}\n`;
      }
      output += "\n";
    }

    if (!results.components.length && !results.tokens.length && !results.guidelines.length) {
      output += "_No results found. Try a different search term._\n";
    }

    return { content: [{ type: "text", text: output }] };
  }
);

// ── Tool: get_guidelines ───────────────────────────────────────

server.tool(
  "get_guidelines",
  "Get usage guidelines for a specific topic: spacing, typography, color_usage, dark_mode, accessibility, responsive, motion.",
  {
    topic: z.string().describe("Guideline topic (e.g. 'spacing', 'accessibility', 'dark_mode')"),
  },
  async ({ topic }) => {
    const key = topic.toLowerCase().replace(/[\s-]/g, "_");
    const text = guidelines[key];

    if (!text) {
      return {
        content: [
          {
            type: "text",
            text: `Guideline "${topic}" not found.\n\nAvailable topics:\n${Object.keys(guidelines)
              .map((k) => `  - ${k}`)
              .join("\n")}`,
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: `# Guidelines: ${topic}\n\n${text}` }],
    };
  }
);

// ── Tool: get_page_template ────────────────────────────────────

server.tool(
  "get_page_template",
  "Get a pre-built page template with layout description and required components.",
  {
    template: z.string().describe("Template slug (e.g. 'dashboard', 'settings', 'login', 'profile')"),
  },
  async ({ template }) => {
    const slug = template.toLowerCase().replace(/[\s_]/g, "-");
    const tmpl = templates.find(
      (t) => t.slug === slug || t.name.toLowerCase().includes(template.toLowerCase())
    );

    if (!tmpl) {
      return {
        content: [
          {
            type: "text",
            text: `Template "${template}" not found.\n\nAvailable templates:\n${templates
              .map((t) => `  - **${t.name}** (\`${t.slug}\`) — ${t.description}`)
              .join("\n")}`,
          },
        ],
      };
    }

    let output = `# Template: ${tmpl.name}\n\n`;
    output += `**Description:** ${tmpl.description}\n\n`;
    output += `## Components Used\n`;
    for (const slug of tmpl.components_used) {
      const comp = findComponent(slug);
      output += comp
        ? `- **${comp.name}** (\`${slug}\`) — ${comp.description}\n`
        : `- \`${slug}\`\n`;
    }
    output += `\n_Use \`get_component\` for each component to get the code._\n`;
    output += `_Use \`get_css_setup\` to get the base CSS needed._\n`;

    return { content: [{ type: "text", text: output }] };
  }
);

// ── Tool: get_css_setup ────────────────────────────────────────

server.tool(
  "get_css_setup",
  "Get the complete CSS setup needed to use the OpenReel Design System in a project — tokens, base styles, and dark mode.",
  {},
  async () => {
    let css;
    try {
      css = readFileSync(join(__dirname, "..", "css", "openreel.css"), "utf-8");
    } catch {
      css = "/* Error: css/openreel.css not found. Run from project root. */";
    }
    return {
      content: [{
        type: "text",
        text: `# OpenReel Design System — CSS Setup\n\nPaste this into your main CSS file:\n\n\`\`\`css\n${css}\n\`\`\`\n\n**Next steps:**\n1. Add \`class="dark"\` to \`<html>\` for dark mode\n2. Use \`get_component\` to get code for specific components\n3. Use \`get_tokens\` for format-specific exports (SCSS, Tailwind, etc.)`,
      }],
    };
  }
);

// ── Start server ───────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
