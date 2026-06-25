import { me, currentGroup, setReplyTo, getMsgs } from "./state.js";
import { toggleEmojiPicker, toggleSidebar } from "./ui.js";
import { msgEl, renderMsgs } from "./messages.js";
import { getWS } from "./net.js";
import { showSearch, clearSearch, doSearch } from "./search.js";
import { sendMsg, editMsg, deleteMsg, startReply } from "./actions.js";
import { initThemeSelect } from "./theme.js";
import { loadGroups, createGroup } from "./api.js";

export function wireEvents(selectGroupFn) {
  const $ = s => document.querySelector(s);

  $("#new-group").onsubmit = async e => {
    e.preventDefault();
    const name = $("#group-name").value.trim();
    if (!name) return;
    await createGroup(name);
    $("#group-name").value = "";
    const groups = await loadGroups();
    $("#groups").innerHTML = groups.map(g => `<li data-id="${g.id}"># ${g.name}</li>`).join("");
    $("#groups").querySelectorAll("li[data-id]").forEach(li => li.onclick = () => selectGroupFn(parseInt(li.dataset.id)));
  };
  $("#send-btn").onclick = sendMsg;

  // Auto-resize textarea
  const autoResize = () => { const t = $("#msg-text"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; };
  $("#msg-text").oninput = autoResize;

  let typingTimer = null;
  $("#msg-text").onkeydown = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); autoResize(); return; }
    clearTimeout(typingTimer);
    const ws = getWS();
    typingTimer = setTimeout(() => { if (ws?.readyState === 1) ws.send(JSON.stringify({ type: "typing", group_id: currentGroup, user_id: me })); }, 500);
  };

  initThemeSelect($("#theme-select"));

  $("#hamburger").onclick = e => { e.stopPropagation(); toggleSidebar(true); };
  $("#close-sidebar").onclick = e => { e.stopPropagation(); toggleSidebar(false); };
  $("#main").onclick = () => { if (window.innerWidth <= 640) toggleSidebar(false); };

  let searchTimer = null;
  $("#search-input").onkeyup = e => {
    clearTimeout(searchTimer);
    if (e.key === "Escape") { clearSearch(); renderMsgs("#msgs", getMsgs(currentGroup), me, true); return; }
    if (e.key === "Enter") $("#search-input").blur();
    searchTimer = setTimeout(() => doSearch($("#search-input").value.trim(), currentGroup, (m) => msgEl(m, me, getMsgs(currentGroup)), () => renderMsgs("#msgs", getMsgs(currentGroup), me, true)), 250);
  };
  $("#search-clear").onclick = clearSearch;
  $("#cancel-reply").onclick = () => { setReplyTo(null); $("#reply-bar").classList.add("hidden"); };
  $("#emoji-btn").onclick = toggleEmojiPicker;

  $("#msgs").addEventListener("click", e => {
    const t = e.target;
    if (t.classList.contains("reply-btn")) { e.stopPropagation(); startReply(parseInt(t.dataset.id)); }
    else if (t.classList.contains("edit-btn")) editMsg(parseInt(t.dataset.id));
    else if (t.classList.contains("delete-btn")) deleteMsg(parseInt(t.dataset.id));
    else if (t.classList.contains("reply")) {
      document.querySelector(`#msg-${parseInt(t.dataset.reply)}`)?.scrollIntoView({ behavior: "smooth" });
    }
  });
}
