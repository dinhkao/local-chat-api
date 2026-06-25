import { loadUsers, loadGroups } from "./api.js";
import { me, currentGroup, setMe, setCurrentGroup, getMsgs, getMeta } from "./state.js";
import { startTimeInterval, toggleSidebar, showTyping } from "./ui.js";
import { renderMsgs, appendMsg, replaceMsg, removeMsg } from "./messages.js";
import { connectWS, getWS, setJoinUser } from "./net.js";import { showSearch, clearSearch } from "./search.js";
import { wireEvents } from "./events.js";
import { initTheme } from "./theme.js";
import { fetchAndMerge, loadMore } from "./pagination.js";

const $ = s => document.querySelector(s);

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
    const data = await fetchAndMerge(id);
    getMeta(id).hasMore = data?.has_more ?? false;
  }
  renderMsgs("#msgs", getMsgs(id), me, true);
  showSearch(); clearSearch();
  if (window.innerWidth <= 640) toggleSidebar(false);
  if (window.innerWidth > 640) $("#msg-text").focus();
}

// ── WS handler ──
function onWSMessage(data) {
  if (data.event === "presence") {
    document.querySelectorAll("#user-id option").forEach(o => {
      const uid = parseInt(o.value);
      if (!uid) return;
      const label = o.textContent.replace(/[🟢⚪]\s*/g, "");
      o.textContent = (data.online.includes(uid) ? "🟢 " : "⚪ ") + label;
    });
    return;
  }
  if (data.group_id !== currentGroup) return;
  const cache = getMsgs(currentGroup);
  if (data.event === "new_message") {
    const idx = cache.findIndex(m => m._optimistic && m.client_msg_id === data.message.client_msg_id);
    if (idx >= 0) { cache[idx] = data.message; replaceMsg("#msgs", data.message, me, cache); }
    else { cache.push(data.message); appendMsg("#msgs", data.message, me, cache); }
  } else if (data.event === "edit_message") {
    const idx = cache.findIndex(m => m.id === data.message.id);
    if (idx >= 0) { cache[idx] = data.message; replaceMsg("#msgs", data.message, me, cache); }
  } else if (data.event === "delete_message") {
    const idx = cache.findIndex(m => m.id === data.message_id);
    if (idx >= 0) { cache.splice(idx, 1); removeMsg("#msgs", data.message_id); }
  } else if (data.event === "typing" && data.user_id !== me) {
    showTyping(data.user_id);
  }
}

// ── Init ──
async function init() {
  const users = await loadUsers();
  const sel = $("#user-id");
  sel.innerHTML = users.map(u => `<option value="${u.id}">${u.username}</option>`).join("");
  sel.onchange = () => {
    setMe(parseInt(sel.value));
    setJoinUser(me);
    const ws = getWS();
    if (ws?.readyState === 1) ws.send(JSON.stringify({ type: "join", user_id: me }));
    renderMsgs("#msgs", getMsgs(currentGroup), me, true);
  };
  setMe(users[0]?.id || null);
  setJoinUser(me);

  const groups = await loadGroups();
  const ul = $("#groups");
  if (!groups.length) { ul.innerHTML = '<li style="color:#666;cursor:default">No groups yet. Create one!</li>'; }
  else { ul.innerHTML = groups.map(g => `<li data-id="${g.id}"># ${g.name}</li>`).join(""); }
  ul.querySelectorAll("li[data-id]").forEach(li => li.onclick = () => selectGroup(parseInt(li.dataset.id)));

  // Lazy scroll-up + scroll-to-bottom button
  let sbb = document.getElementById("scroll-bottom-btn");
  if (!sbb) { sbb = Object.assign(document.createElement("button"), { id: "scroll-bottom-btn", className: "hidden", textContent: "↓" }); document.getElementById("main").append(sbb); }
  sbb.onclick = () => { const d = $("#msgs"); d.scrollTop = d.scrollHeight; sbb.classList.add("hidden"); };
  $("#msgs").addEventListener("scroll", () => {
    const div = $("#msgs");
    if (currentGroup) {
      const nearBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 120;
      sbb.classList.toggle("hidden", nearBottom);
      if (div.scrollTop <= 40) loadMore(currentGroup);
    }
  });

  initTheme();
  connectWS(onWSMessage);
  startTimeInterval();
  wireEvents(selectGroup);
  const last = localStorage.getItem("lastGroup");
  if (last) selectGroup(parseInt(last));
}

init();