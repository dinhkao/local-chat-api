import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripAccents } from "./lib/vn-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "chat.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.function("strip_accents", stripAccents);

// Phase 1: Tables + indexes (no FTS5 triggers yet)
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
    reply_to    INTEGER REFERENCES messages(id),
    created_at  TEXT DEFAULT (datetime('now')),
    edited_at   TEXT,
    deleted_at  TEXT
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

// Phase 2: Add column if missing, backfill latin BEFORE FTS5
try { db.exec("ALTER TABLE messages ADD COLUMN text_latin TEXT"); } catch {}

db.exec("UPDATE messages SET text_latin = strip_accents(text) WHERE text_latin IS NULL OR text_latin = ''");

// Phase 3: FTS5 + triggers (after backfill, so triggers don't interfere)
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts
    USING fts5(group_id UNINDEXED, user_id UNINDEXED, text_latin);

  CREATE TRIGGER IF NOT EXISTS trg_msgs_fts_insert
    AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, group_id, user_id, text_latin)
      VALUES (new.id, new.group_id, new.user_id, new.text_latin);
    END;

  CREATE TRIGGER IF NOT EXISTS trg_msgs_fts_delete
    AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, group_id, user_id, text_latin)
      VALUES ('delete', old.id, old.group_id, old.user_id, old.text_latin);
    END;

  CREATE TRIGGER IF NOT EXISTS trg_msgs_fts_update
    AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, group_id, user_id, text_latin)
      VALUES ('delete', old.id, old.group_id, old.user_id, old.text_latin);
      INSERT INTO messages_fts(rowid, group_id, user_id, text_latin)
      VALUES (new.id, new.group_id, new.user_id, new.text_latin);
    END;
`);

// Phase 4: Backfill FTS for existing rows
const ftsCount = db.prepare("SELECT count(*) AS c FROM messages_fts").get();
const msgCount = db.prepare("SELECT count(*) AS c FROM messages WHERE text_latin IS NOT NULL").get();
if (ftsCount.c < msgCount.c) {
  db.exec(`
    INSERT OR IGNORE INTO messages_fts(rowid, group_id, user_id, text_latin)
    SELECT id, group_id, user_id, text_latin FROM messages WHERE text_latin IS NOT NULL
  `);
}

export default db;
