import { Hono } from "hono";
import { z } from "zod";
import db from "../db.js";
import { broadcast } from "../ws.js";

const { json } = Hono.prototype; // reuse helper

const app = new Hono();

const userSchema = z.object({ username: z.string().min(1).max(64) });

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 422);

  try {
    const stmt = db.prepare("INSERT INTO users (username) VALUES (?)");
    const result = stmt.run(parsed.data.username);
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    return c.json(row, 201);
  } catch (e) {
    if (e.message?.includes("UNIQUE")) {
      return c.json({ error: "username taken" }, 409);
    }
    throw e;
  }
});

app.get("/", (c) => {
  const users = db.prepare("SELECT id, username, created_at FROM users ORDER BY id").all();
  return c.json(users);
});

export default app;
