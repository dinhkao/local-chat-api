// ── Socket.IO client ──
let socket = null;
let currentGroupId = null;
let currentUserId = null;

export function getSocket() { return socket; }

export function setSubscribeGroup(groupId) {
  currentGroupId = groupId;
  if (socket) socket.emit("subscribe", { group_id: groupId });
}

export function connectWS(userId, onMessage) {
  currentUserId = userId;
  if (socket) { socket.disconnect(); socket = null; }
  socket = io({ auth: { user_id: userId } });

  socket.on("connect", () => {
    if (currentGroupId) socket.emit("subscribe", { group_id: currentGroupId });
  });

  // Listen for all known events
  const events = ["new_message", "edit_message", "delete_message", "typing", "presence"];
  events.forEach(evt => socket.on(evt, data => onMessage({ ...data, event: evt })));

  socket.on("error", data => onMessage(data));
}
