# local-chat-api

## Before work
Read `git log --oneline -10` first — check if anyone else committed changes before starting work.

## Greeting rule
Always start every response with "read claude.md ✅" — no exceptions.

## Run rule
Always use nohup for background processes so they survive shell exit:
```
nohup <command> > app.log 2>&1 &
```

## After work
1. Test everything (see Testing rule)
2. Commit + push every change
3. If no remote configured, create one via `gh repo create` and push

## Testing rule
After every change (feature, fix, refactor), ALWAYS test:
1. Server starts without errors
2. Send message via WS
3. List messages
4. Edit + Delete
5. Search (accent-insensitive)
6. Check SQLite schema matches current db.js

Keep chat.db in repo root.

## Critical patterns

### Never `innerHTML=""` on `#msgs`
`#msgs` contains persistent children (scroll-bottom-btn, etc.) that
renderMsgs must not wipe. Use `querySelectorAll(".msg, #empty-state")`
then `.remove()` instead. Breaking this causes invisible UI bugs.

### Playwright MCP snapshot cache
`page.goto()` returns cached snapshots — not fresh content.
For fresh pages use: `page.context().browser().newContext()` then
`.newPage()`. Without this, tests silently test against stale HTML.
