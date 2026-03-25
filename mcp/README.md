# OpenReel Design System — MCP Server

Enables AI assistants (Claude Code, Cursor, Windsurf, etc.) to build interfaces using the OpenReel Design System. Like shadcn's MCP, but for OpenReel.

## What it does

The AI can query 61 components, design tokens, guidelines, and page templates — then generate code in HTML, React, Vue, or Svelte that follows the design system perfectly.

## Setup

```bash
cd mcp
npm install
```

### Claude Code

Add to your project's `.claude/settings.json` or `~/.claude.json`:

```json
{
  "mcpServers": {
    "openreel-ds": {
      "command": "node",
      "args": ["/absolute/path/to/openreel-design-system/mcp/index.js"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "openreel-ds": {
      "command": "node",
      "args": ["/absolute/path/to/openreel-design-system/mcp/index.js"]
    }
  }
}
```

### Windsurf / Other MCP Clients

Same pattern — point to the `index.js` file as a stdio MCP server.

## Available Tools

| Tool | Description |
|------|-------------|
| `list_components` | List all 61 components, optionally by category |
| `get_component` | Get details + code for any component (HTML/React/Vue/Svelte) |
| `get_tokens` | Export tokens in CSS/SCSS/JSON/Tailwind format |
| `search` | Search across components, tokens, and guidelines |
| `get_guidelines` | Usage guidelines (spacing, typography, a11y, etc.) |
| `get_page_template` | Get pre-built page templates with component lists |
| `get_css_setup` | Get the complete CSS needed to start a project |

## Example Prompts

Once the MCP is connected, you can ask the AI:

- "Build me a settings page using the OpenReel Design System"
- "Create a dashboard with stat cards and a data table"
- "Show me the button component in React"
- "What are the spacing tokens?"
- "Search for components related to navigation"
- "Give me the CSS setup for a new project"

## Components (61)

| Category | Count | Components |
|----------|-------|------------|
| Form Controls | 12 | Button, Input, Checkbox, Radio, Toggle, Select, File Upload, Slider, Date Picker, Color Picker, OTP Input, Tag Input |
| Data Display | 14 | Badge, Card, Table, Data Table, Avatar, Rating, Stat Card, Timeline, Activity Feed, Pills, Notification Badge, Date/Time, Metadata Grid, Status Indicator |
| Feedback | 7 | Modal, Toast, Progress Bar, Skeleton, Empty State, Alert Banner, Snackbar |
| Navigation | 9 | Tabs, Breadcrumbs, Pagination, Sidebar Nav, Tree View, Stepper, Mega Menu, Bottom Nav, Segmented Control |
| Layout | 8 | Section Header, CTA Banner, Divider, Drawer, Kanban Board, Toolbar, Image Gallery, Audio Player |
| Overlay | 5 | Tooltip, Dropdown, Popover, Command Palette, Accordion |
| Content | 6 | Comments, Notifications, Calendar, Pricing Card, Testimonial, FAB |

## Tokens

- **38 colors** (brand, gray, blue, success, error, warning)
- **16 typography** (sizes, weights, line-heights)
- **9 spacing** values (4px → 32px)
- **5 border-radius** (4px → 9999px)
- **6 shadows** (xs → 2xl)
- **6 dark mode** overrides
