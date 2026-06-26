import { avatarHTML, esc, relativeTime } from "./ui.js";

// Build message DOM element (no event handlers)
export function msgEl(m, userId, cache) {
  if (m._optimistic) {
    const el = document.createElement("div");
    el.className = "msg mine pending";
    el.id = `msg-${m.id}`;
    if (m.client_msg_id) el.dataset.clientMsgId = m.client_msg_id;
    el.innerHTML = `<div class="author">${avatarHTML(userId, "You")} You</div>
      <div class="text">${esc(m.text)}</div>
      <div class="meta"><span>sending...</span></div>`;
    return el;
  }
  if (m._failed) {
    const el = document.createElement("div");
    el.className = "msg mine failed";
    el.id = `msg-${m.id}`;
    if (m.client_msg_id) el.dataset.clientMsgId = m.client_msg_id;
    el.innerHTML = `<div class="author">${avatarHTML(userId, "You")} You</div>
      <div class="text">${esc(m.text)}</div>
      <div class="meta"><span style="color:#e74c3c">⚠ failed to send</span></div>`;
    return el;
  }
  const el = document.createElement("div");
  el.className = `msg${m.user_id === userId ? " mine" : ""}${m.deleted_at ? " deleted" : ""}`;
  el.id = `msg-${m.id}`;

  let replyHtml = "";
  if (m.reply_to) {
    const parent = (cache || []).find(x => x.id === m.reply_to);
    const pt = parent ? (parent.text || "").slice(0, 60) : "deleted";
    replyHtml = `<div class="reply" data-reply="${m.reply_to}">↳ ${esc(pt)}</div>`;
  }

  const uName = m.user_id === userId ? "You" : `User #${m.user_id}`;
  el.innerHTML = `${replyHtml}
    <div class="author">${avatarHTML(m.user_id, uName)} ${uName}</div>
    <div class="text">${m.deleted_at ? "(deleted)" : esc(m.text)}</div>
    <div class="meta">
      ${m.deleted_at ? "" : `<a class="reply-btn" data-id="${m.id}">reply</a>
      <a class="edit-btn" data-id="${m.id}">edit</a>
      <a class="delete-btn" data-id="${m.id}">delete</a>`}
      <span class="rel-time" data-iso="${m.created_at}">${relativeTime(m.created_at)}</span>
      ${m.edited_at ? "<span>(edited)</span>" : ""}
    </div>`;
  return el;
}

// Full rebuild (group switch, user switch)
export function renderMsgs(containerSelector, msgs, userId, forceScroll) {
  const div = document.querySelector(containerSelector);
  // Remove only messages + empty state, keep other children (scroll-btn etc.)
  div.querySelectorAll(".msg, #empty-state").forEach(el => el.remove());
  if (!msgs || !msgs.length) {
    div.insertAdjacentHTML("afterbegin", '<div id="empty-state"><span id="empty-icon">💬</span><span id="empty-text">No messages yet. Start typing below!</span></div>');
    return div;
  }
  const nearBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 60;
  msgs.forEach(m => { const el = msgEl(m, userId, msgs); if (el) div.append(el); });
  if (forceScroll || nearBottom) div.scrollTop = div.scrollHeight;
  return div;
}

// Append single message (new msg via WS or optimistic)
export function appendMsg(containerSelector, m, userId, cache) {
  const div = document.querySelector(containerSelector);
  const empty = div.querySelector("#empty-state");
  if (empty) empty.remove();
  const el = msgEl(m, userId, cache);
  if (!el) return null;
  const nearBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 60;
  div.append(el);
  if (nearBottom) div.scrollTop = div.scrollHeight;
  return el;
}

// Prepend batch (scroll-up lazy load)
export function prependMsgs(containerSelector, msgs, userId, cache) {
  const div = document.querySelector(containerSelector);
  const oldH = div.scrollHeight;
  const oldTop = div.scrollTop;
  const frag = document.createDocumentFragment();
  msgs.forEach(m => { const el = msgEl(m, userId, cache); if (el) frag.append(el); });
  div.prepend(frag);
  div.scrollTop = oldTop + (div.scrollHeight - oldH);
}

// Replace existing message element (edit)
export function replaceMsg(containerSelector, m, userId, cache) {
  let el = document.querySelector(`#msg-${m.id}`);
  // Not found by id — try matching optimistic via client_msg_id
  if (!el && m.client_msg_id) el = document.querySelector(`[data-client-msg-id="${m.client_msg_id}"]`);
  if (!el) return;
  const newEl = msgEl(m, userId, cache);
  if (newEl) el.replaceWith(newEl);
}

// Remove message element (delete)
export function removeMsg(containerSelector, id) {
  const el = document.querySelector(`#msg-${id}`);
  if (el) el.remove();
  const div = document.querySelector(containerSelector);
  if (div && !div.querySelector(".msg")) {
    div.querySelectorAll(".msg, #empty-state").forEach(el => el.remove());
    div.insertAdjacentHTML("afterbegin", '<div id="empty-state"><span id="empty-icon">💬</span><span id="empty-text">No messages yet. Start typing below!</span></div>');
  }
}
