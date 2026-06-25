// ── Socket.IO client ──
let socket = null;
let joinUserId = null;
let currentGroupId = null;

export function getSocket() { return socket; }

export function setJoinUser(id) { joinUserId = id; }

export function setSubscribeGroup(groupId) {
  currentGroupId = groupId;
  if (socket) socket.emit("subscribe", { group_id: groupId });
}

export function connectWS(onMessage) {
  socket = io();

  socket.on("connect", () => {
    if (joinUserId) socket.emit("join", { user_id: joinUserId });
    if (currentGroupId) socket.emit("subscribe", { group_id: currentGroupId });
  });

  // Listen for all known events
  const events = ["new_message", "edit_message", "delete_message", "typing", "presence"];
  events.forEach(evt => socket.on(evt, data => onMessage({ ...data, event: evt })));

  socket.on("error", data => onMessage(data));
}
