import { me, currentGroup, replyTo, setReplyTo, getMsgs, setMe } from "./state.js";
import { renderMsgs } from "./messages.js";
import { getWS } from "./net.js";
import { editMessage, deleteMessage } from "./api.js";

let tempId = 0;

export function sendMsg() {
  const text = document.getElementById("msg-text").value.trim();
  if (!text || !currentGroup || !me) return;
  const clientMsgId = `c_${Date.now()}_${tempId++}`;
  const rep = replyTo;
  const msg = { id: `_pending_${tempId}`, client_msg_id: clientMsgId, group_id: currentGroup, user_id: me, text, reply_to: rep, _optimistic: true };
  getMsgs(currentGroup).push(msg);
  renderMsgs("#msgs", getMsgs(currentGroup), me, true);
  document.getElementById("msg-text").value = "";
  setReplyTo(null);
  document.getElementById("reply-bar").classList.add("hidden");
  const ws = getWS();
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify({ type: "send", group_id: currentGroup, user_id: me, text, reply_to: rep, client_msg_id: clientMsgId }));
  }
}

export async function editMsg(id) {
  const text = prompt("Edit message:");
  if (!text) return;
  const cache = getMsgs(currentGroup);
  const idx = cache.findIndex(m => m.id === id);
  if (idx >= 0) { cache[idx] = { ...cache[idx], text, edited_at: new Date().toISOString() }; renderMsgs("#msgs", cache, me); }
  await editMessage(id, text);
}

export async function deleteMsg(id) {
  if (!confirm("Delete?")) return;
  const cache = getMsgs(currentGroup);
  const idx = cache.findIndex(m => m.id === id);
  if (idx >= 0) { cache.splice(idx, 1); renderMsgs("#msgs", cache, me); }
  await deleteMessage(id);
}

export function startReply(id) {
  setReplyTo(id);
  const cache = getMsgs(currentGroup);
  const m = cache.find(x => x.id === id);
  document.getElementById("reply-preview").textContent = "↳ " + (m ? (m.text || "").slice(0, 40) : "");
  document.getElementById("reply-bar").classList.remove("hidden");
  document.getElementById("msg-text").focus();
}
