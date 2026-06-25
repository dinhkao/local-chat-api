import { Hono } from "hono";
import db from "../db.js";
import { stripAccents } from "../lib/vn-utils.js";

const app = new Hono();

/** GET /api/groups/:id/search?q=... — FTS5 search within a group */
app.get("/", (c) => {
  const groupId = parseInt(c.req.param("id"));
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json({ error: "query required" }, 422);

  const group = db.prepare("SELECT id FROM groups WHERE id = ?").get(groupId);
  if (!group) return c.json({ error: "group not found" }, 404);

  // Strip accents from query, escape FTS5 special chars, make each word a prefix
  const cleaned = stripAccents(q);
  const ftsQuery = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(t => t.replace(/["()*^\-\\]/g, "") + "*")
    .join(" ");

  if (!ftsQuery) return c.json({ results: [] });

  const rows = db.prepare(`
    SELECT m.id, m.group_id, m.user_id, m.text, m.reply_to,
           m.created_at, m.edited_at, m.deleted_at
    FROM messages m
    JOIN messages_fts fts ON m.id = fts.rowid
    WHERE fts.text_latin MATCH ?
      AND fts.group_id = ?
    ORDER BY rank
    LIMIT 50
  `).all(ftsQuery, groupId);

  return c.json({ query: q, results: rows });
});

export default app;
