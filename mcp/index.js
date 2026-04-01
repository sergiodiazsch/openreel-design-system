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

function generateReactComponent(comp) {
  const name = comp.name.replace(/[\s/()-]/g, "");
  const propsStr = comp.props
    .map((p) => {
      const def = p.default === null ? "undefined" : JSON.stringify(p.default);
      return `  ${p.name} = ${def}`;
    })
    .join(",\n");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;
  return `import React from 'react';

export function ${name}({
${propsStr},
  children,
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
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

${name}.displayName = '${name}';
`;
}

function generateVueComponent(comp) {
  const name = comp.name.replace(/[\s/()-]/g, "");
  const propsStr = comp.props
    .map((p) => {
      const type = p.type === "boolean" ? "Boolean" : p.type === "string" ? "String" : "String";
      const def = p.default === null ? "null" : JSON.stringify(p.default);
      return `  ${p.name}: { type: ${type}, default: ${def} }`;
    })
    .join(",\n");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;
  return `<template>
  <div :class="classes">
    <slot />
  </div>
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
  const propsStr = comp.props
    .map((p) => {
      const def = p.default === null ? "undefined" : JSON.stringify(p.default);
      return `  export let ${p.name} = ${def};`;
    })
    .join("\n");
  const classExpr = comp.cssClasses?.[0] || `or-${comp.slug}`;
  return `<script>
${propsStr}

  $: classes = [
    '${classExpr}',
    variant ? \`${classExpr}-\${variant}\` : '',
    size ? \`${classExpr}-\${size}\` : ''
  ].filter(Boolean).join(' ');
</script>

<div class={classes}>
  <slot />
</div>
`;
}

// ── MCP Server ─────────────────────────────────────────────────

const server = new McpServer({
  name: "openreel-design-system",
  version: "1.0.0",
});

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
      const base = comp.cssClasses?.[0] || `or-${comp.slug}`;
      const variantClass = comp.variants?.[0] ? ` ${base}-${comp.variants[0]}` : "";
      output += "```html\n";
      output += `<div class="${base}${variantClass}">\n  <!-- ${comp.name} content -->\n</div>\n`;
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
