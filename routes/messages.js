import { Hono } from "hono";
import { z } from "zod";
import db from "../db.js";
import { broadcast } from "../ws.js";
import { runBots } from "../bot.js";
import { sendMessage } from "../lib/send-message.js";

const app = new Hono();

const sendSchema = z.object({
  user_id: z.number().int().positive(),
  text: z.string().min(1).max(4096),
  reply_to: z.number().int().positive().optional(),
  client_msg_id: z.string().max(64).optional(),
});

/** POST /api/groups/:id/messages — send a new message */
app.post("/", async (c) => {
  const groupId = parseInt(c.req.param("id"));
  const body = await c.req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 422);

  try {
    const msg = sendMessage(groupId, parsed.data.user_id, parsed.data.text, parsed.data.reply_to, parsed.data.client_msg_id);
    broadcast(groupId, { event: "new_message", message: msg });
    runBots(groupId, msg);
    return c.json(msg, 201);
  } catch (e) {
    return c.json({ error: e.message }, e.status || 500);
  }
});

/** GET /api/groups/:id/messages — list messages with pagination + thread filter */
app.get("/", (c) => {
  const groupId = parseInt(c.req.param("id"));
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query("limit") || "50")));
  const before = parseInt(c.req.query("before") || "0");
  const thread = parseInt(c.req.query("thread") || "0");

  const group = db.prepare("SELECT id FROM groups WHERE id = ?").get(groupId);
  if (!group) return c.json({ error: "group not found" }, 404);

  if (thread) {
    const root = db.prepare(
      "SELECT * FROM messages WHERE id = ? AND group_id = ? AND deleted_at IS NULL"
    ).get(thread, groupId);
    if (!root) return c.json({ error: "thread root not found" }, 404);

    const replies = db.prepare(`
      SELECT * FROM messages
      WHERE group_id = ? AND reply_to = ? AND deleted_at IS NULL
      ORDER BY created_at
    `).all(groupId, thread);
    return c.json({ root, replies });
  }

  const whereClause = before
    ? "group_id = ? AND id < ? AND deleted_at IS NULL"
    : "group_id = ? AND deleted_at IS NULL";
  const params = before ? [groupId, before, limit] : [groupId, limit];

  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE ${whereClause}
    ORDER BY id DESC LIMIT ?
  `).all(...params);

  const hasMore = rows.length === limit;
  return c.json({ messages: rows.reverse(), has_more: hasMore });
});

export default app;
