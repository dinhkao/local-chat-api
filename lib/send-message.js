import db from "../db.js";
import { stripAccents } from "./vn-utils.js";

/** Validate + insert a message. Returns msg row or throws with status/error. */
export function sendMessage(groupId, userId, text, replyTo) {
  const group = db.prepare("SELECT id FROM groups WHERE id = ?").get(groupId);
  if (!group) throw Object.assign(new Error("group not found"), { status: 404 });

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) throw Object.assign(new Error("user not found"), { status: 404 });

  if (replyTo) {
    const parent = db.prepare(
      "SELECT id FROM messages WHERE id = ? AND group_id = ? AND deleted_at IS NULL"
    ).get(replyTo, groupId);
    if (!parent) throw Object.assign(new Error("reply target not found"), { status: 404 });
  }

  const textLatin = stripAccents(text);
  const stmt = db.prepare(
    "INSERT INTO messages (group_id, user_id, text, text_latin, reply_to) VALUES (?, ?, ?, ?, ?)"
  );
  const result = stmt.run(groupId, userId, text, textLatin, replyTo ?? null);
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);
}
