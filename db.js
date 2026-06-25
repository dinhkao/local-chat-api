import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripAccents } from "./lib/vn-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "chat.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("mmap_size = 268435456");
db.pragma("cache_size = -20000");
db.pragma("temp_store = MEMORY");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT NOT NULL UNIQUE,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    text        TEXT NOT NULL,
    text_latin  TEXT,
    client_msg_id TEXT UNIQUE,
    reply_to    INTEGER REFERENCES messages(id),
    created_at  TEXT DEFAULT (datetime('now')),
    edited_at   TEXT,
    deleted_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS message_reactions (
    message_id  INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    emoji       TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (message_id, user_id, emoji)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_group
    ON messages(group_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_messages_thread
    ON messages(reply_to);
  CREATE INDEX IF NOT EXISTS idx_messages_active_list
    ON messages(group_id, id) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_messages_thread_active
    ON messages(group_id, reply_to, created_at) WHERE deleted_at IS NULL;
`);

try { db.exec("ALTER TABLE messages ADD COLUMN text_latin TEXT"); } catch {}
try { db.exec("ALTER TABLE messages ADD COLUMN client_msg_id TEXT"); } catch {}
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_msg ON messages(client_msg_id)"); } catch {}

{const rows = db.prepare("SELECT id, text FROM messages WHERE text_latin IS NULL").all();
for (const r of rows) db.prepare("UPDATE messages SET text_latin = ? WHERE id = ?").run(stripAccents(r.text), r.id);}

export default db;
