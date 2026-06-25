import { Hono } from "hono";
import { z } from "zod";
import db from "../db.js";

const app = new Hono();

const groupSchema = z.object({ name: z.string().min(1).max(255) });

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 422);

  const stmt = db.prepare("INSERT INTO groups (name) VALUES (?)");
  const result = stmt.run(parsed.data.name);
  const row = db.prepare("SELECT * FROM groups WHERE id = ?").get(result.lastInsertRowid);
  return c.json(row, 201);
});

app.get("/", (c) => {
  const groups = db.prepare("SELECT * FROM groups ORDER BY id").all();
  return c.json(groups);
});

app.delete("/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const info = db.prepare("DELETE FROM groups WHERE id = ?").run(id);
  if (info.changes === 0) return c.json({ error: "not found" }, 404);
  return c.json({ ok: true });
});

export default app;
