// ── WebSocket ──
let ws = null;

export function getWS() { return ws; }

export function connectWS(onMessage) {
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = ev => {
    let data;
    try { data = JSON.parse(ev.data); } catch { return; }
    onMessage(data);
  };
  ws.onclose = () => setTimeout(() => connectWS(onMessage), 2000);
}
