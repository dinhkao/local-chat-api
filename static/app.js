import { loadUsers, loadGroups, loadMessages } from "./api.js";
import { me, setMe, setCurrentGroup, getMsgs } from "./state.js";
import { startTimeInterval, toggleSidebar, showTyping } from "./ui.js";
import { renderMsgs } from "./messages.js";
import { connectWS } from "./net.js";
import { showSearch, clearSearch } from "./search.js";
import { wireEvents } from "./events.js";

const $ = s => document.querySelector(s);

// ── Cache merge ──
async function fetchAndMerge(gid, opts = {}) {
  const data = await loadMessages(gid, opts);
  const existing = new Set(getMsgs(gid).map(m => m.id));
  const fresh = data.messages.filter(m => !existing.has(m.id));
  if (opts.prepend) getMsgs(gid).unshift(...fresh);
  else getMsgs(gid).push(...fresh);
}

// ── Select group ──
async function selectGroup(id) {
  setCurrentGroup(id);
  localStorage.setItem("lastGroup", id);
  $("#input-area").classList.remove("hidden");
  $("li.active")?.classList.remove("active");
  $(`li[data-id="${id}"]`)?.classList.add("active");
  const groups = await loadGroups();
  $("#group-title").textContent = (groups.find(x => x.id === id) || {}).name || "";
  if (!getMsgs(id).length) {
    await fetchAndMerge(id);
    const oldest = getMsgs(id)[0]?.id;
    if (oldest) fetchAndMerge(id, { before: oldest, prepend: true });
  }
  renderMsgs("#msgs", getMsgs(id), me);
  showSearch(); clearSearch();
  if (window.innerWidth <= 640) toggleSidebar(false);
  if (window.innerWidth > 640) $("#msg-text").focus();
}

// ── WS handler ──
function onWSMessage(data) {
  if (data.group_id !== currentGroup) return;
  const cache = getMsgs(currentGroup);
  if (data.event === "new_message") {
    const idx = cache.findIndex(m => m._optimistic && m.client_msg_id === data.message.client_msg_id);
    if (idx >= 0) cache[idx] = data.message;
    else cache.push(data.message);
    renderMsgs("#msgs", cache, me);
  } else if (data.event === "edit_message") {
    const idx = cache.findIndex(m => m.id === data.message.id);
    if (idx >= 0) { cache[idx] = data.message; renderMsgs("#msgs", cache, me); }
  } else if (data.event === "delete_message") {
    const idx = cache.findIndex(m => m.id === data.message_id);
    if (idx >= 0) { cache.splice(idx, 1); renderMsgs("#msgs", cache, me); }
  } else if (data.event === "typing" && data.user_id !== me) {
    showTyping(data.user_id);
  }
}

// ── Init ──
async function init() {
  const users = await loadUsers();
  const sel = $("#user-id");
  sel.innerHTML = users.map(u => `<option value="${u.id}">${u.username}</option>`).join("");
  sel.onchange = () => { setMe(parseInt(sel.value)); renderMsgs("#msgs", getMsgs(currentGroup), me); };
  setMe(users[0]?.id || null);

  const groups = await loadGroups();
  const ul = $("#groups");
  ul.innerHTML = groups.map(g => `<li data-id="${g.id}"># ${g.name}</li>`).join("");
  ul.querySelectorAll("li").forEach(li => li.onclick = () => selectGroup(parseInt(li.dataset.id)));

  connectWS(onWSMessage);
  startTimeInterval();
  wireEvents(selectGroup);
  const last = localStorage.getItem("lastGroup");
  if (last) selectGroup(parseInt(last));
}

init();
