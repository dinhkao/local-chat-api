import { avatarHTML, esc, relativeTime } from "./ui.js";

// Build message DOM element (no event handlers)
export function msgEl(m, userId, cache) {
  if (m._optimistic) {
    const el = document.createElement("div");
    el.className = "msg mine pending";
    el.id = `msg-${m.id}`;
    el.innerHTML = `<div class="author">${avatarHTML(userId, "You")} You</div>
      <div class="text">${esc(m.text)}</div>
      <div class="meta"><span>sending...</span></div>`;
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

export function renderMsgs(containerSelector, msgs, userId) {
  const div = document.querySelector(containerSelector);
  if (!msgs || !msgs.length) {
    div.innerHTML = '<span style="color:#555">No messages yet</span>';
    return div;
  }
  div.innerHTML = "";
  msgs.forEach(m => { const el = msgEl(m, userId, msgs); if (el) div.append(el); });
  return div;
}
