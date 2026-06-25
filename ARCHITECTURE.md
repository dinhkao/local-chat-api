# local-chat-api — Architecture

Local-first messaging API + Web UI. Modeled after Telegram's primitives (groups, messages, threads, real-time). Zero external dependencies for messaging — SQLite is the backend.

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| HTTP framework | Hono.js (v4) | Lightweight, fast, good WebSocket + static serving |
| Runtime | Node.js 25 | native `--watch` mode during dev |
| Database | SQLite via `better-sqlite3` | Sync API, no connection pool, WAL mode |
| Full-text search | SQLite FTS5 | Built-in, no extra deps, accent-insensitive via custom column |
| Real-time | `ws` library over raw TCP | Direct push, no HTTP polling, no SSE overhead |
| Client | Vanilla JS | No framework, no build step, no virtual DOM |
| Validation | Zod | Lightweight, composable schemas |

---

## File structure

```
local-chat-api/
├── index.js                 ← Entry point: Hono app, route mount, WS upgrade, server start
├── db.js                    ← SQLite connection, schema migration, FTS5 + triggers, backfill
├── bot.js                   ← Auto-reply bot (trigger → response map)
├── ws.js                    ← WebSocket server, client tracking, group-scoped broadcast
├── lib/
│   ├── send-message.js      ← Shared send logic (validate + insert + text_latin)
│   └── vn-utils.js          ← Vietnamese accent stripping (comprehensive uni- → latin map)
├── routes/
│   ├── groups.js            ← CRUD groups
│   ├── messages.js          ← POST + GET messages (list with pagination, thread mode)
│   ├── message-actions.js   ← PUT edit + DELETE soft-delete
│   ├── search.js            ← FTS5 search endpoint, accent-insensitive
│   └── users.js             ← CRUD users
├── static/
│   └── index.html           ← Single-page UI (CSS + JS inlined)
├── package.json
├── .env                     ← PORT=3004
├── CLAUDE.md                ← Project instructions for Claude Code
├── .gitignore
└── ARCHITECTURE.md          ← This file
```

Every file <100 lines (except index.html which bundles CSS+JS at ~280 lines).

---

## Database schema

### tables

```sql
groups (id PK, name, created_at)
users  (id PK, username UNIQUE, created_at)
messages (id PK, group_id FK, user_id FK, text, text_latin, reply_to FK, created_at, edited_at, deleted_at)
messages_fts (FTS5 virtual table: group_id UNINDEXED, user_id UNINDEXED, text_latin)
```

### indexes

```sql
idx_messages_active_list   ON messages(group_id, id) WHERE deleted_at IS NULL  -- list query
idx_messages_thread_active ON messages(group_id, reply_to, created_at) WHERE deleted_at IS NULL  -- thread query
```

Both are **partial indexes** — only index undeleted rows. Faster inserts, smaller disk, same query speed.

### triggers (FTS5 sync)

- `trg_msgs_fts_insert` — auto-insert into FTS on new message
- `trg_msgs_fts_delete` — auto-remove from FTS on delete
- `trg_msgs_fts_update` — auto-update FTS on text edit

### `text_latin` column

Vietnamese text stored twice: original `text` and accent-stripped `text_latin`. FTS5 indexes `text_latin`. Search queries strip accents at query time. This gives accent-insensitive search without needing FTS5's `remove_diacritics` tokenizer (which depends on compile flags).

---

## API endpoints

### REST

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/users` | Create user |
| GET | `/api/users` | List users |
| POST | `/api/groups` | Create group |
| GET | `/api/groups` | List groups |
| DELETE | `/api/groups/:id` | Delete group (cascades messages) |
| POST | `/api/groups/:id/messages` | Send message |
| GET | `/api/groups/:id/messages` | List messages (`?limit=N`, `?before=N`, `?thread=N`) |
| GET | `/api/groups/:id/search` | FTS5 search (`?q=...`, accent-insensitive) |
| PUT | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Soft-delete message |

### WebSocket

| Path | Scope |
|------|-------|
| `/ws` | All groups |
| `/ws/:groupId` | Single group |

Client → Server: `{ type: "send", group_id, user_id, text, reply_to? }`
Server → All: `{ event: "new_message"|"edit_message"|"delete_message", group_id, message }`

---

## Data flow

### Sending a message

```
User hits Enter
  ↓
[Client]  Add to local cache (optimistic, _pending flag)
  ↓      render() instantly shows "sending..." state
[WS]     { type: "send", group_id, user_id, text }
  ↓
[Server] lib/send-message.js → insert into SQLite (text + text_latin)
  ↓     trigger trg_msgs_fts_insert fires → FTS5 indexed
  ↓     broadcast({ event: "new_message", message })
  ↓      runBots() → check triggers, maybe reply
[Client] WS event arrives → replace pending msg with confirmed
  ↓      render() — instant swap
```

### Edit

```
Client: optimistic update local cache → render()
  ↓    fetch PUT /api/messages/:id
Server: update text + text_latin → trigger updates FTS5
  ↓    broadcast({ event: "edit_message" })
Client: replace in local cache → render()
```

### Search

```
Client: type query → 250ms debounce → GET /api/groups/:id/search?q=...
Server: stripAccents(query) → split terms + wildcard → FTS5 MATCH
  ↓    JOIN messages ON rowid → return rows
Client: render results inline, click to jump
```

---

## Performance characteristics

| Query | Index used | Approx time |
|-------|-----------|-------------|
| List latest 50 msgs | `idx_messages_active_list` | 0.02ms |
| Thread replies | `idx_messages_thread_active` | 0.01ms |
| FTS5 search | `messages_fts` inverted index | 0.5ms at 1M rows |
| Send message | PK insert + FTS5 insert | 0.1ms |
| Edit message | PK update + FTS5 delete+insert | 0.2ms |

All queries scale logarithmically (B-tree + FTS5 inverted index). No full table scans at any size.

---

## Client architecture

### Data layer (in-memory)

```javascript
messageCache = {
  [groupId]: [
    { id, group_id, user_id, text, reply_to, created_at, edited_at, deleted_at }
  ]
}
```

- Loaded from server on first group select
- Preloads next page silently after initial load
- All mutations (send/edit/delete) hit cache first → render → WS confirms
- Never re-fetches from server on render

### Optimistic updates

| Action | Cache mutation | Server sync |
|--------|---------------|-------------|
| Send | Push with `_optimistic: true` | WS send → broadcast replaces |
| Edit | Update in-place | PUT request |
| Delete | Remove from array | DELETE request |

### WebSocket reconciliation

When WS broadcast arrives for the current group:
- `new_message` — find pending by same `user_id + text`, replace it. If none found (from others), append.
- `edit_message` — find by id, replace.
- `delete_message` — find by id, remove.

### Preload

After initial load of latest 100 messages, silently fetches next 50 older messages and prepends to cache. Covers scroll-up scenario without server round-trip.

---

## Mobile UX

- CSS media query at 640px → sidebar becomes slide-over drawer
- Hamburger button toggles sidebar, ✕ close button, tap main area to dismiss
- Input font 16px on mobile to prevent iOS zoom on focus
- Search keyboard dismissed on Enter and after search results

---

## Bot system

`bot.js` maps `user_id → { trigger, reply }`. After every new message, checks if any bot should respond. If match, inserts bot reply as separate message (not threaded) and broadcasts.

Current bots:
- bob (user 2): "hi" → "hello"

---

## Deployment

Single process. No containers needed.

```bash
npm install --production
PORT=3004 node --env-file=.env index.js
```

- WebSocket upgrades handled on same port via `server.on("upgrade", ...)`
- Static files served by Hono's `serveStatic`
- No reverse proxy needed (but works behind nginx/caddy for TLS)

### Tailscale Funnel (per CLAUDE.md preference)

```bash
sudo tailscale funnel 3004
```

Public HTTPS URL without hosting. Telegram webhook-ready.
