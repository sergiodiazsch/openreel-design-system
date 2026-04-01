#!/usr/bin/env node
/**
 * sync-tokens.js
 * Reads mcp/registry.json and generates tokens.json in Tokens Studio v2 format.
 * Run: node scripts/sync-tokens.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const registry = JSON.parse(readFileSync(resolve(ROOT, 'mcp/registry.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip "px" suffix and return numeric string (e.g. "14px" → "14") */
function stripPx(value) {
  if (typeof value === 'string' && value.endsWith('px')) {
    return value.slice(0, -2);
  }
  return String(value);
}

/**
 * Parse a flat key like "gray-500" into a group + sub-key pair.
 * Returns { group, key } — e.g. { group: "gray", key: "500" }
 * If there's no "-" it returns { group: null, key: originalKey }.
 *
 * Only groups with numeric or named scale sub-keys are nested.
 * Brand variants (brand-hover, brand-light) stay flat at the root.
 */
function splitColorKey(flatKey) {
  // Only these groups get nested sub-keys (scale-based groups)
  const scaleGroups = ['gray', 'blue', 'success', 'error', 'warning'];
  for (const g of scaleGroups) {
    if (flatKey.startsWith(g + '-')) {
      return { group: g, key: flatKey.slice(g.length + 1) };
    }
  }
  return { group: null, key: flatKey };
}

// ---------------------------------------------------------------------------
// Build colors section
// ---------------------------------------------------------------------------
function buildColors(colors) {
  const result = {};

  for (const [flatKey, hexValue] of Object.entries(colors)) {
    const { group, key } = splitColorKey(flatKey);

    if (group) {
      // Nested: openreel.color.gray["500"]
      if (!result[group]) result[group] = {};
      result[group][key] = { value: hexValue, type: 'color' };
    } else {
      // Flat: openreel.color.brand, openreel.color.white, etc.
      result[key] = { value: hexValue, type: 'color' };
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build typography section
// ---------------------------------------------------------------------------
function buildTypography(typography) {
  return {
    fontFamily: { value: typography.fontFamily, type: 'fontFamilies' },
    fontSize: Object.fromEntries(
      Object.entries(typography.sizes).map(([k, v]) => [k, { value: stripPx(v), type: 'fontSizes' }])
    ),
    fontWeight: Object.fromEntries(
      Object.entries(typography.weights).map(([k, v]) => [k, { value: String(v), type: 'fontWeights' }])
    ),
    lineHeight: Object.fromEntries(
      Object.entries(typography.lineHeights).map(([k, v]) => [k, { value: stripPx(v), type: 'lineHeights' }])
    ),
  };
}

// ---------------------------------------------------------------------------
// Build spacing section
// ---------------------------------------------------------------------------
function buildSpacing(spacing) {
  return Object.fromEntries(
    Object.entries(spacing).map(([k, v]) => [k, { value: stripPx(v), type: 'spacing' }])
  );
}

// ---------------------------------------------------------------------------
// Build borderRadius section
// ---------------------------------------------------------------------------
function buildBorderRadius(borderRadius) {
  return Object.fromEntries(
    Object.entries(borderRadius).map(([k, v]) => [k, { value: stripPx(v), type: 'borderRadius' }])
  );
}

// ---------------------------------------------------------------------------
// Build shadows section (string values → boxShadow type)
// ---------------------------------------------------------------------------
function buildShadows(shadows) {
  return Object.fromEntries(
    Object.entries(shadows).map(([k, v]) => [k, { value: v, type: 'boxShadow' }])
  );
}

// ---------------------------------------------------------------------------
// Build dark/light semantic tokens
// ---------------------------------------------------------------------------
function buildSemanticColors(tokenSet, type = 'color') {
  return Object.fromEntries(
    Object.entries(tokenSet).map(([k, v]) => [k, { value: v, type }])
  );
}

// ---------------------------------------------------------------------------
// Build motion section
// ---------------------------------------------------------------------------
function buildMotion(motion) {
  const result = {};
  for (const [k, v] of Object.entries(motion)) {
    if (k.startsWith('duration-')) {
      result[k] = { value: v, type: 'other' };
    } else if (k.startsWith('ease-')) {
      result[k] = { value: v, type: 'other' };
    } else {
      result[k] = { value: v, type: 'other' };
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Build coloredShadows section
// ---------------------------------------------------------------------------
function buildColoredShadows(coloredShadows) {
  return Object.fromEntries(
    Object.entries(coloredShadows).map(([k, v]) => [k, { value: v, type: 'boxShadow' }])
  );
}

// ---------------------------------------------------------------------------
// Assemble full tokens.json output
// ---------------------------------------------------------------------------
const tokens = registry.tokens;

const output = {
  openreel: {
    color: buildColors(tokens.colors),
    typography: buildTypography(tokens.typography),
    spacing: buildSpacing(tokens.spacing),
    borderRadius: buildBorderRadius(tokens.borderRadius),
    boxShadow: buildShadows(tokens.shadows),
    dark: buildSemanticColors(tokens.dark),
    motion: buildMotion(tokens.motion),
    coloredShadows: buildColoredShadows(tokens.coloredShadows),
  },
  $themes: [],
  $metadata: {
    tokenSetOrder: ['openreel'],
  },
};

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
const outPath = resolve(ROOT, 'tokens.json');
writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`tokens.json written to ${outPath}`);
