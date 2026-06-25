import { Hono } from "hono";
import db from "../db.js";
import { stripAccents } from "../lib/vn-utils.js";

const app = new Hono();

/** GET /api/groups/:id/search?q=... — accent-insensitive search via text_latin LIKE */
app.get("/", (c) => {
  const groupId = parseInt(c.req.param("id"));
  const q = (c.req.query("q") || "").trim();
  if (!q) return c.json({ error: "query required" }, 422);

  const group = db.prepare("SELECT id FROM groups WHERE id = ?").get(groupId);
  if (!group) return c.json({ error: "group not found" }, 404);

  const cleaned = stripAccents(q);
  const pattern = `%${cleaned}%`;

  const rows = db.prepare(`
    SELECT id, group_id, user_id, text, reply_to, created_at, edited_at, deleted_at
    FROM messages
    WHERE group_id = ? AND deleted_at IS NULL AND text_latin LIKE ?
    ORDER BY id DESC
    LIMIT 50
  `).all(groupId, pattern);

  return c.json({ query: q, results: rows });
});

export default app;
