// ── WebSocket ──
let ws = null;
let joinUserId = null;

export function getWS() { return ws; }

export function setJoinUser(id) { joinUserId = id; }

export function connectWS(onMessage) {
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onopen = () => {
    if (joinUserId) ws.send(JSON.stringify({ type: "join", user_id: joinUserId }));
  };
  ws.onmessage = ev => {
    let data;
    try { data = JSON.parse(ev.data); } catch { return; }
    onMessage(data);
  };
  ws.onclose = () => setTimeout(() => connectWS(onMessage), 2000);
}
