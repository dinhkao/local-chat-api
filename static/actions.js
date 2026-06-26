import { me, currentGroup, replyTo, setReplyTo, getMsgs, setMe } from "./state.js";
import { appendMsg, renderMsgs, replaceMsg } from "./messages.js";
import { getSocket } from "./net.js";
import { editMessage, deleteMessage } from "./api.js";

let tempId = 0;

export function sendMsg() {
  const text = document.getElementById("msg-text").value.trim();
  if (!text || !currentGroup || !me) return;
  const clientMsgId = `c_${Date.now()}_${tempId++}`;
  const rep = replyTo;
  const msg = { id: `_pending_${tempId}`, client_msg_id: clientMsgId, group_id: currentGroup, user_id: me, text, reply_to: rep, _optimistic: true };
  getMsgs(currentGroup).push(msg);
  appendMsg("#msgs", msg, me, getMsgs(currentGroup));
  document.querySelector("#msgs").scrollTop = document.querySelector("#msgs").scrollHeight;
  const inp = document.getElementById("msg-text");
  inp.value = "";
  inp.style.height = "auto";
  setReplyTo(null);
  document.getElementById("reply-bar").classList.add("hidden");
  const socket = getSocket();
  const sentGroup = currentGroup; // capture at emit time, not callback time
  let acked = false;
  if (socket?.connected) {
    socket.emit("send", { group_id: currentGroup, user_id: me, text, reply_to: rep, client_msg_id: clientMsgId }, (savedMsg) => {
      acked = true;
      if (savedMsg?.error) return console.error("send failed:", savedMsg.error);
      // Replace optimistic with real message from server ack
      const cache = getMsgs(sentGroup);
      const idx = cache.findIndex(m => m._optimistic && m.client_msg_id === clientMsgId);
      if (idx >= 0) { cache[idx] = savedMsg; replaceMsg("#msgs", savedMsg, me, cache); }
    });
    // Timeout: if ack never arrives (stale connection), mark as failed
    setTimeout(() => {
      if (acked) return;
      const cache = getMsgs(sentGroup);
      const idx = cache.findIndex(m => m._optimistic && m.client_msg_id === clientMsgId);
      if (idx >= 0) {
        cache[idx] = { ...cache[idx], _failed: true, _optimistic: false };
        replaceMsg("#msgs", cache[idx], me, cache);
      }
    }, 5000);
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
