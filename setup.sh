#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  OpenReel Design System — MCP Setup Script
#  Automatically configures the MCP server for Claude Code, Cursor,
#  Windsurf, and VS Code (Cline).
#
#  Usage:
#    ./setup.sh              Install / configure
#    ./setup.sh --uninstall  Remove all MCP configurations
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors & Helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

info()    { printf "${BLUE}ℹ${RESET}  %s\n" "$1"; }
success() { printf "${GREEN}✅${RESET} %s\n" "$1"; }
warn()    { printf "${YELLOW}⚠️${RESET}  %s\n" "$1"; }
error()   { printf "${RED}❌${RESET} %s\n" "$1"; }
step()    { printf "\n${MAGENTA}${BOLD}▸ %s${RESET}\n" "$1"; }
dim()     { printf "${DIM}   %s${RESET}\n" "$1"; }

# ── Resolve paths ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="${SCRIPT_DIR}/mcp"
MCP_SERVER="${MCP_DIR}/index.js"
MCP_NAME="openreel-design-system"

# ── Banner ───────────────────────────────────────────────────────────────────
banner() {
  printf "\n"
  printf "${CYAN}${BOLD}"
  printf "  ╔══════════════════════════════════════════════════╗\n"
  printf "  ║                                                  ║\n"
  printf "  ║   🎬  OpenReel Design System — MCP Setup         ║\n"
  printf "  ║                                                  ║\n"
  printf "  ╚══════════════════════════════════════════════════╝\n"
  printf "${RESET}\n"
}

# ── Require: jq or python for JSON manipulation ─────────────────────────────
# We use a small Python helper so the script works on stock macOS (no jq needed)
json_tool=""

detect_json_tool() {
  if command -v jq &>/dev/null; then
    json_tool="jq"
  elif command -v python3 &>/dev/null; then
    json_tool="python3"
  elif command -v python &>/dev/null; then
    json_tool="python"
  else
    error "No JSON tool found. Install jq or Python 3."
    exit 1
  fi
}

# ── JSON helpers (work with jq OR python) ────────────────────────────────────

# Read a file, set a nested key, write back.  Creates file if missing.
# Usage: json_set_mcp <file> <path_to_mcpServers_object>
#   e.g. json_set_mcp ~/.cursor/mcp.json ".mcpServers"
json_set_mcp() {
  local file="$1"
  local jpath="$2"

  if [[ "$json_tool" == "jq" ]]; then
    local tmp
    tmp="$(mktemp)"
    if [[ -f "$file" ]]; then
      jq "${jpath}.\"${MCP_NAME}\" = {\"command\": \"node\", \"args\": [\"${MCP_SERVER}\"]}" "$file" > "$tmp"
    else
      echo '{}' | jq "${jpath}.\"${MCP_NAME}\" = {\"command\": \"node\", \"args\": [\"${MCP_SERVER}\"]}" > "$tmp"
    fi
    mv "$tmp" "$file"
  else
    # Python fallback
    $json_tool - "$file" "$jpath" "$MCP_NAME" "$MCP_SERVER" <<'PYEOF'
import sys, json, os

_, filepath, jpath, name, server = sys.argv

# Read or create
if os.path.isfile(filepath):
    with open(filepath) as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            data = {}
else:
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    data = {}

# Navigate / create the nested path
keys = [k for k in jpath.strip(".").split(".") if k]
obj = data
for k in keys:
    if k not in obj or not isinstance(obj[k], dict):
        obj[k] = {}
    obj = obj[k]

obj[name] = {"command": "node", "args": [server]}

with open(filepath, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF
  fi
}

# Check if MCP is already configured in a file at a given path
json_has_mcp() {
  local file="$1"
  local jpath="$2"

  [[ ! -f "$file" ]] && return 1

  if [[ "$json_tool" == "jq" ]]; then
    jq -e "${jpath}.\"${MCP_NAME}\"" "$file" &>/dev/null
  else
    $json_tool - "$file" "$jpath" "$MCP_NAME" <<'PYEOF'
import sys, json
_, filepath, jpath, name = sys.argv
try:
    with open(filepath) as f:
        data = json.load(f)
    keys = [k for k in jpath.strip(".").split(".") if k]
    obj = data
    for k in keys:
        obj = obj[k]
    sys.exit(0 if name in obj else 1)
except Exception:
    sys.exit(1)
PYEOF
  fi
}

# Remove the MCP entry from a file
json_remove_mcp() {
  local file="$1"
  local jpath="$2"

  [[ ! -f "$file" ]] && return 0

  if [[ "$json_tool" == "jq" ]]; then
    local tmp
    tmp="$(mktemp)"
    jq "del(${jpath}.\"${MCP_NAME}\")" "$file" > "$tmp"
    mv "$tmp" "$file"
  else
    $json_tool - "$file" "$jpath" "$MCP_NAME" <<'PYEOF'
import sys, json
_, filepath, jpath, name = sys.argv
try:
    with open(filepath) as f:
        data = json.load(f)
    keys = [k for k in jpath.strip(".").split(".") if k]
    obj = data
    for k in keys:
        obj = obj[k]
    obj.pop(name, None)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
except Exception:
    pass
PYEOF
  fi
}

# ── IDE Definitions ──────────────────────────────────────────────────────────
# Each IDE: name, emoji, detection method, config file, json path

declare -a IDE_NAMES=()
declare -a IDE_ICONS=()
declare -a IDE_CONFIGS=()
declare -a IDE_PATHS=()
declare -a IDE_DETECTED=()

register_ides() {
  # Claude Code
  IDE_NAMES+=("Claude Code")
  IDE_ICONS+=("🤖")
  IDE_CONFIGS+=("${HOME}/.claude.json")
  IDE_PATHS+=(".mcpServers")

  # Cursor
  IDE_NAMES+=("Cursor")
  IDE_ICONS+=("⚡")
  IDE_CONFIGS+=("${HOME}/.cursor/mcp.json")
  IDE_PATHS+=(".mcpServers")

  # Windsurf
  IDE_NAMES+=("Windsurf")
  IDE_ICONS+=("🏄")
  IDE_CONFIGS+=("${HOME}/.windsurf/mcp.json")
  IDE_PATHS+=(".mcpServers")

  # VS Code + Cline
  IDE_NAMES+=("VS Code (Cline)")
  IDE_ICONS+=("💻")
  IDE_CONFIGS+=("${HOME}/.vscode/settings.json")
  IDE_PATHS+=(".mcpServers")
}

detect_ide() {
  local idx="$1"
  local name="${IDE_NAMES[$idx]}"

  case "$name" in
    "Claude Code")
      # Claude Code CLI
      command -v claude &>/dev/null && return 0
      [[ -f "${HOME}/.claude.json" ]] && return 0
      [[ -d "${HOME}/.claude" ]] && return 0
      return 1
      ;;
    "Cursor")
      # Cursor app or config dir
      if [[ "$(uname)" == "Darwin" ]]; then
        [[ -d "/Applications/Cursor.app" ]] && return 0
      fi
      command -v cursor &>/dev/null && return 0
      [[ -d "${HOME}/.cursor" ]] && return 0
      return 1
      ;;
    "Windsurf")
      if [[ "$(uname)" == "Darwin" ]]; then
        [[ -d "/Applications/Windsurf.app" ]] && return 0
      fi
      command -v windsurf &>/dev/null && return 0
      [[ -d "${HOME}/.windsurf" ]] && return 0
      return 1
      ;;
    "VS Code (Cline)")
      if [[ "$(uname)" == "Darwin" ]]; then
        [[ -d "/Applications/Visual Studio Code.app" ]] && return 0
      fi
      command -v code &>/dev/null && return 0
      [[ -d "${HOME}/.vscode" ]] && return 0
      return 1
      ;;
  esac
  return 1
}

# ── Install ──────────────────────────────────────────────────────────────────
do_install() {
  banner
  local configured=()

  # Step 1: Check Node.js
  step "Checking Node.js..."
  if command -v node &>/dev/null; then
    local node_ver
    node_ver="$(node --version)"
    success "Node.js ${node_ver} found"
  else
    error "Node.js is not installed!"
    printf "\n"
    info "Download it from: ${BOLD}${CYAN}https://nodejs.org${RESET}"
    info "Or install via Homebrew:  ${BOLD}brew install node${RESET}"
    printf "\n"
    exit 1
  fi

  # Step 2: Detect JSON tool
  detect_json_tool
  dim "Using ${json_tool} for JSON operations"

  # Step 3: npm install
  step "Installing MCP server dependencies..."
  if [[ -d "${MCP_DIR}/node_modules" ]] && [[ -f "${MCP_DIR}/node_modules/.package-lock.json" ]]; then
    success "Dependencies already installed"
    dim "${MCP_DIR}"
  else
    (cd "$MCP_DIR" && npm install --no-fund --no-audit 2>&1) | while IFS= read -r line; do
      dim "$line"
    done
    success "Dependencies installed"
  fi

  # Step 4: Verify MCP server exists
  step "Verifying MCP server..."
  if [[ -f "$MCP_SERVER" ]]; then
    success "MCP server found at:"
    dim "${MCP_SERVER}"
  else
    error "MCP server not found at ${MCP_SERVER}"
    exit 1
  fi

  # Step 5: Detect IDEs
  step "Detecting installed IDEs..."
  register_ides

  local any_detected=false
  for i in "${!IDE_NAMES[@]}"; do
    if detect_ide "$i"; then
      IDE_DETECTED+=("true")
      any_detected=true
      success "${IDE_ICONS[$i]}  ${IDE_NAMES[$i]} detected"
    else
      IDE_DETECTED+=("false")
      dim "   ${IDE_NAMES[$i]} — not found, skipping"
    fi
  done

  if [[ "$any_detected" == "false" ]]; then
    warn "No supported IDEs detected!"
    info "Manually add this to your IDE's MCP config:"
    printf "\n"
    printf '  {\n'
    printf '    "mcpServers": {\n'
    printf '      "%s": {\n' "$MCP_NAME"
    printf '        "command": "node",\n'
    printf '        "args": ["%s"]\n' "$MCP_SERVER"
    printf '      }\n'
    printf '    }\n'
    printf '  }\n'
    printf "\n"
    exit 0
  fi

  # Step 6: Configure each detected IDE
  step "Configuring MCP server..."

  for i in "${!IDE_NAMES[@]}"; do
    [[ "${IDE_DETECTED[$i]}" != "true" ]] && continue

    local name="${IDE_NAMES[$i]}"
    local icon="${IDE_ICONS[$i]}"
    local config="${IDE_CONFIGS[$i]}"
    local jpath="${IDE_PATHS[$i]}"

    if json_has_mcp "$config" "$jpath"; then
      warn "${icon}  ${name} — already configured, skipping"
      dim "   ${config}"
      configured+=("${name} (already existed)")
    else
      # Ensure parent directory exists
      mkdir -p "$(dirname "$config")"
      json_set_mcp "$config" "$jpath"
      success "${icon}  ${name} — configured!"
      dim "   ${config}"
      configured+=("${name}")
    fi
  done

  # Step 7: Summary
  printf "\n"
  printf "${GREEN}${BOLD}"
  printf "  ╔══════════════════════════════════════════════════╗\n"
  printf "  ║                                                  ║\n"
  printf "  ║   🎉  Setup complete!                            ║\n"
  printf "  ║                                                  ║\n"
  printf "  ╚══════════════════════════════════════════════════╝\n"
  printf "${RESET}\n"

  info "Configured for:"
  for c in "${configured[@]}"; do
    printf "     ${GREEN}•${RESET} %s\n" "$c"
  done

  printf "\n"
  info "${BOLD}Next steps:${RESET}"
  printf "     ${CYAN}1.${RESET} Restart your IDE to pick up the new MCP server\n"
  printf "     ${CYAN}2.${RESET} Ask your AI assistant to ${BOLD}list_components${RESET} to verify\n"
  printf "     ${CYAN}3.${RESET} Start building with the OpenReel Design System! 🎬\n"
  printf "\n"
  dim "MCP server: ${MCP_SERVER}"
  dim "To remove:  ./setup.sh --uninstall"
  printf "\n"
}

# ── Uninstall ────────────────────────────────────────────────────────────────
do_uninstall() {
  banner
  printf "${YELLOW}${BOLD}  Removing OpenReel Design System MCP configuration...${RESET}\n\n"

  detect_json_tool
  register_ides

  local removed=()

  for i in "${!IDE_NAMES[@]}"; do
    local name="${IDE_NAMES[$i]}"
    local icon="${IDE_ICONS[$i]}"
    local config="${IDE_CONFIGS[$i]}"
    local jpath="${IDE_PATHS[$i]}"

    if json_has_mcp "$config" "$jpath"; then
      json_remove_mcp "$config" "$jpath"
      success "${icon}  ${name} — removed from ${config}"
      removed+=("${name}")
    else
      dim "   ${name} — not configured, nothing to remove"
    fi
  done

  printf "\n"
  if [[ ${#removed[@]} -gt 0 ]]; then
    success "Uninstall complete. Removed from:"
    for r in "${removed[@]}"; do
      printf "     ${RED}•${RESET} %s\n" "$r"
    done
    printf "\n"
    info "Restart your IDE to apply the changes."
  else
    info "Nothing to remove — MCP was not configured in any IDE."
  fi
  printf "\n"
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  case "${1:-}" in
    --uninstall|-u|uninstall)
      do_uninstall
      ;;
    --help|-h|help)
      banner
      printf "  ${BOLD}Usage:${RESET}\n"
      printf "    ./setup.sh              Install & configure MCP for detected IDEs\n"
      printf "    ./setup.sh --uninstall  Remove MCP configuration from all IDEs\n"
      printf "    ./setup.sh --help       Show this help message\n"
      printf "\n"
      printf "  ${BOLD}Supported IDEs:${RESET}\n"
      printf "    🤖  Claude Code     ~/.claude.json\n"
      printf "    ⚡  Cursor          ~/.cursor/mcp.json\n"
      printf "    🏄  Windsurf        ~/.windsurf/mcp.json\n"
      printf "    💻  VS Code (Cline) ~/.vscode/settings.json\n"
      printf "\n"
      ;;
    "")
      do_install
      ;;
    *)
      error "Unknown option: $1"
      info "Run ./setup.sh --help for usage"
      exit 1
      ;;
  esac
}

main "$@"
