# Command Palette Design

## Overview
Add a VS Code-style command palette triggered by `Cmd+K` / `Ctrl+K`. Users type to fuzzy-filter commands, select with arrow keys + Enter, dismiss with Escape.

## Trigger
- `Cmd+K` on Mac, `Ctrl+K` on Windows/Linux
- Opens a centered modal overlay with search input

## UI
- Dark semi-transparent overlay covers viewport
- Centered modal: search input on top, scrollable command list below
- Input auto-focused on open
- Commands filtered in real-time as user types (fuzzy substring match)
- Arrow Up/Down to navigate, Enter to execute, Escape to close
- Click on command also works

## Commands

| # | Command | Icon | Action |
|---|---------|------|--------|
| 1 | Search messages | 🔍 | Focus `#search-input` |
| 2 | Switch theme | 🎨 | Cycle: dark → oldschool → yahoo |
| 3 | Create group | ➕ | Prompt name, call `createGroup()`, refresh sidebar |
| 4 | Switch user | 👤 | Cycle through `#user-id` options |
| 5 | Toggle sidebar | 📂 | Toggle `#sidebar` open/close |
| 6 | Focus message input | ✏️ | Focus `#msg-text` |
| 7 | Clear search | ❌ | Call `clearSearch()`, restore messages |

## File Structure

### `static/command-palette.js` (~100 lines)
Single file containing:
- `COMMANDS` array — each entry: `{ name, icon, action }`
- `openPalette()` — creates overlay + input + list, appends to body
- `closePalette()` — removes overlay
- `filterCommands(query)` — filters COMMANDS by substring match
- `renderList(filtered)` — renders command items
- `executeCommand(cmd)` — runs command action, closes palette
- Keyboard handling: Escape, ArrowUp, ArrowDown, Enter
- Export `initCommandPalette()` — registers `Cmd+K` / `Ctrl+K` listener

### Changes to existing files
- `static/base.css` — add palette styles (~30 lines)
- `static/events.js` — import + call `initCommandPalette()` in `wireEvents()`
- `static/index.html` — no changes needed (palette is injected via JS)

## CSS Design
- Overlay: `position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000`
- Modal: centered, `max-width: 500px`, dark background, rounded corners
- Input: full width, no border, dark bg, large font
- List items: padding, hover highlight, active state for keyboard nav
- Responsive: works on mobile too

## Dependencies
Imports from existing modules:
- `theme.js` — `switchTheme()`, `getSaved()`
- `ui.js` — `toggleSidebar()`
- `api.js` — `createGroup()`, `loadGroups()`
- `state.js` — `me`, `currentGroup`, `setMe`
- `search.js` — `showSearch()`, `clearSearch()`
- `messages.js` — `renderMsgs()`
- `actions.js` — `sendMsg()`

## Testing
1. Cmd+K opens palette
2. Type to filter commands
3. Arrow keys navigate, Enter executes
4. Escape closes
5. Each command works correctly
6. No console errors
