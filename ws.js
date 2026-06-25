import { Server } from "socket.io";
import { sendMessage } from "./lib/send-message.js";
import db from "./db.js";

let io;
const clients = new Map(); // socketId -> { groupId, userId }

// Bot config: { bot_user_id: { trigger: "text", reply: "text" } }
const bots = {
  3: { trigger: "hi", reply: "hello" },
};

function getOnlineIds() {
  const ids = new Set();
  for (const [, info] of clients) {
    if (info.userId) ids.add(info.userId);
  }
  return [...ids];
}

function broadcastPresence() {
  io.emit("presence", { online: getOnlineIds() });
}

function runBots(groupId, message) {
  for (const [botIdStr, rule] of Object.entries(bots)) {
    const botId = parseInt(botIdStr);
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

/** Initialize socket.io on existing HTTP server */
export function initSocket(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    clients.set(socket.id, { groupId: null, userId: null });

    socket.on("typing", (data) => {
      const info = clients.get(socket.id);
      if (!info?.groupId) return;
      socket.to(`group:${info.groupId}`).emit("typing", {
        event: "typing",
        group_id: info.groupId,
        user_id: data.user_id,
        _ts: Date.now(),
      });
    });

    socket.on("join", (data) => {
      const info = clients.get(socket.id) || {};
      info.userId = data.user_id;
      clients.set(socket.id, info);
      broadcastPresence();
    });

    socket.on("subscribe", (data) => {
      const info = clients.get(socket.id) || {};
      if (info.groupId) socket.leave(`group:${info.groupId}`);
      info.groupId = data.group_id;
      clients.set(socket.id, info);
      socket.join(`group:${data.group_id}`);
    });

    socket.on("send", (data) => {
      const groupId = data.group_id;
      const userId = data.user_id;
      const text = data.text;
      const replyTo = data.reply_to;
      const clientMsgId = data.client_msg_id;

      if (!groupId || !userId || !text) return;

      try {
        const msg = sendMessage(groupId, userId, text, replyTo, clientMsgId);
        broadcast(groupId, { event: "new_message", message: msg });
        runBots(groupId, msg);
      } catch (e) {
        socket.emit("error", { event: "error", error: e.message });
      }
    });

    socket.on("disconnect", () => {
      clients.delete(socket.id);
      broadcastPresence();
    });
  });

  return io;
}

/** Broadcast an event to all clients in the given group room */
export function broadcast(groupId, event) {
  if (!io) return;
  io.to(`group:${groupId}`).emit(event.event, { ...event, group_id: groupId });
}
