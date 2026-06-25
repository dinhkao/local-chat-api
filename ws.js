import { WebSocketServer } from "ws";
import { sendMessage } from "./lib/send-message.js";
import { runBots } from "./bot.js";

const wss = new WebSocketServer({ noServer: true });
const clients = new Map(); // ws -> { groupId: number | null, userId: number | null }

function getOnlineIds() {
  const ids = new Set();
  for (const [, info] of clients) {
    if (info.userId) ids.add(info.userId);
  }
  return [...ids];
}

function broadcastPresence() {
  const payload = JSON.stringify({ event: "presence", online: getOnlineIds() });
  for (const [ws] of clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

wss.on("connection", (ws) => {
  clients.set(ws, { groupId: null, userId: null });

  ws.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }

    if (data.type === "typing") {
      broadcastTyping(data.group_id, data.user_id);
      return;
    }

    if (data.type === "join") {
      clients.set(ws, { ...clients.get(ws), userId: data.user_id });
      broadcastPresence();
      return;
    }

    if (data.type === "send") {
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
        ws.send(JSON.stringify({ event: "error", error: e.message }));
      }
    }
  });

  ws.on("close", () => { clients.delete(ws); broadcastPresence(); });
});

/** Attach group-scope info to a client on upgrade */
export function setClientGroup(ws, groupId) {
  const prev = clients.get(ws) || {};
  clients.set(ws, { ...prev, groupId });
}

/** Broadcast typing event without persisting */
function broadcastTyping(groupId, userId) {
  const payload = JSON.stringify({ event: "typing", group_id: groupId, user_id: userId, _ts: Date.now() });
  for (const [ws, info] of clients) {
    if (ws.readyState === 1 && (info.groupId === null || info.groupId === groupId)) {
      ws.send(payload);
    }
  }
}

/** Broadcast an event to all clients subscribed to the given group_id */
export function broadcast(groupId, event) {
  const payload = JSON.stringify({ ...event, group_id: groupId });
  for (const [ws, info] of clients) {
    if (ws.readyState === 1 && (info.groupId === null || info.groupId === groupId)) {
      ws.send(payload);
    }
  }
}

/** Handle HTTP->WS upgrade for Hono */
export function handleUpgrade(server) {
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/ws(?:\/(\d+))?$/);
    if (!match) { socket.destroy(); return; }
    const groupId = match[1] ? parseInt(match[1]) : null;
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (groupId) setClientGroup(ws, groupId);
      wss.emit("connection", ws, req);
    });
  });
}
