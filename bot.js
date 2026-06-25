import db from "./db.js";
import { broadcast } from "./ws.js";

// Bot config: { bot_user_id: { trigger: "text", reply: "text" } }
const bots = {
  2: { trigger: "hi", reply: "hello" },
};

/** Run after every new message. Checks if any bot should reply. */
export function runBots(groupId, message) {
  for (const [botIdStr, rule] of Object.entries(bots)) {
    const botId = parseInt(botIdStr);
    // Don't reply to self
    if (message.user_id === botId) continue;

    const text = (message.text || "").toLowerCase().trim();
    if (text !== rule.trigger.toLowerCase()) continue;

    const stmt = db.prepare(
      "INSERT INTO messages (group_id, user_id, text, reply_to) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(groupId, botId, rule.reply, null);
    const reply = db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);

    broadcast(groupId, { event: "new_message", message: reply });
  }
}
