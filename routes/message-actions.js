import { Hono } from "hono";
import { z } from "zod";
import db from "../db.js";
import { broadcast } from "../ws.js";

const app = new Hono();

const editSchema = z.object({
  text: z.string().min(1).max(4096),
});

/** PUT /api/messages/:msgId — edit a message */
app.put("/:msgId", async (c) => {
  const msgId = parseInt(c.req.param("msgId"));
  const body = await c.req.json().catch(() => null);
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 422);

  const msg = db.prepare(
    "SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL"
  ).get(msgId);
  if (!msg) return c.json({ error: "message not found or deleted" }, 404);

  db.prepare(
    "UPDATE messages SET text = ?, text_latin = strip_accents(?), edited_at = datetime('now') WHERE id = ?"
  ).run(parsed.data.text, parsed.data.text, msgId);

  const updated = db.prepare("SELECT * FROM messages WHERE id = ?").get(msgId);
  broadcast(msg.group_id, { event: "edit_message", message: updated });
  return c.json(updated);
});

/** DELETE /api/messages/:msgId — soft delete */
app.delete("/:msgId", (c) => {
  const msgId = parseInt(c.req.param("msgId"));
  const msg = db.prepare(
    "SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL"
  ).get(msgId);
  if (!msg) return c.json({ error: "message not found or already deleted" }, 404);

  db.prepare(
    "UPDATE messages SET deleted_at = datetime('now') WHERE id = ?"
  ).run(msgId);

  broadcast(msg.group_id, { event: "delete_message", message_id: msgId });
  return c.json({ ok: true });
});

export default app;
