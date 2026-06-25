import { Server } from "socket.io";
import { sendMessage } from "./lib/send-message.js";
import { runBots } from "./lib/bot-runner.js";
import db from "./db.js";

let io;
const clients = new Map(); // socketId -> { groupId }
function getOnlineIds() {
  const ids = new Set();
  for (const [, info] of clients) {
    if (info.userId) ids.add(info.userId);
  }
  return [...ids];
}

let presenceTimer = null;
function broadcastPresence() {
  clearTimeout(presenceTimer);
  presenceTimer = setTimeout(() => io.emit("presence", { online: getOnlineIds() }), 50);
}
/** Initialize socket.io on existing HTTP server */
export function initSocket(server) {
  io = new Server(server, { cors: { origin: "*" } });

  // ── Auth middleware ──
  io.use((socket, next) => {
    const userId = socket.handshake.auth.user_id;
    if (!userId) return next(new Error("missing user_id"));
    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    if (!user) return next(new Error("invalid user_id"));
    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    clients.set(socket.id, { groupId: null, userId });
    broadcastPresence();

    socket.on("typing", (data) => {
      const info = clients.get(socket.id);
      if (!info?.groupId) return;
      socket.to(`group:${info.groupId}`).emit("typing", {
        event: "typing",
        group_id: info.groupId,
        user_id: userId,
        _ts: Date.now(),
      });
    });

    socket.on("subscribe", (data) => {
      const info = clients.get(socket.id) || {};
      if (info.groupId === data.group_id) return; // already in room
      if (info.groupId) socket.leave(`group:${info.groupId}`);
      info.groupId = data.group_id;
      clients.set(socket.id, info);
      socket.join(`group:${data.group_id}`);
    });

    // ── Acknowledgement: server replies to sender only ──
    socket.on("send", (data, callback) => {
      const groupId = data.group_id;
      const text = data.text;
      const replyTo = data.reply_to;
      const clientMsgId = data.client_msg_id;

      if (!groupId || !userId || !text) {
        if (callback) callback({ error: "missing fields" });
        return;
      }

      try {
        const msg = sendMessage(groupId, userId, text, replyTo, clientMsgId);
        // Ack to sender only
        if (typeof callback === "function") callback(msg);
        // Broadcast to others in the room
        socket.to(`group:${groupId}`).emit("new_message", {
          event: "new_message",
          message: msg,
          group_id: groupId,
        });
        runBots(groupId, msg);
      } catch (e) {
        if (typeof callback === "function") callback({ error: e.message });
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
