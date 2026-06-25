import { switchTheme, getSaved } from "./theme.js";
import { toggleSidebar } from "./ui.js";
import { createGroup, loadGroups } from "./api.js";
import { me, currentGroup, getMsgs, setMe } from "./state.js";
import { clearSearch, showSearch } from "./search.js";
import { renderMsgs } from "./messages.js";

const THEMES = ["dark", "oldschool", "yahoo"];

const COMMANDS = [
  { name: "Search messages", icon: "🔍", action: () => { clearSearch(); showSearch(); document.getElementById("search-input")?.focus(); } },
  { name: "Switch theme", icon: "🎨", action: () => { const cur = getSaved(); const i = THEMES.indexOf(cur); switchTheme(THEMES[(i + 1) % THEMES.length]); } },
  { name: "Create group", icon: "➕", action: async () => { const name = prompt("Group name:"); if (!name) return; await createGroup(name); location.reload(); } },
  { name: "Switch user", icon: "👤", action: () => { const sel = document.getElementById("user-id"); if (!sel) return; const opts = [...sel.options]; const i = opts.findIndex(o => parseInt(o.value) === me); sel.value = opts[(i + 1) % opts.length].value; sel.onchange?.(new Event("change")); } },
  { name: "Toggle sidebar", icon: "📂", action: () => { const sb = document.getElementById("sidebar"); toggleSidebar(!sb.classList.contains("open")); } },
  { name: "Focus message input", icon: "✏️", action: () => { document.getElementById("msg-text")?.focus(); } },
  { name: "Clear search", icon: "❌", action: () => { clearSearch(); renderMsgs("#msgs", getMsgs(currentGroup), me, true); } },
];

let overlay = null;
let activeIdx = 0;

function closePalette() {
  overlay?.remove();
  overlay = null;
}

function renderList(items) {
  const list = overlay.querySelector(".cp-list");
  list.innerHTML = items.map((cmd, i) =>
    `<div class="cp-item${i === activeIdx ? " active" : ""}" data-idx="${i}">${cmd.icon} ${cmd.name}</div>`
  ).join("");
  list.querySelectorAll(".cp-item").forEach(el => {
    el.onclick = () => { items[parseInt(el.dataset.idx)]?.action(); closePalette(); };
  });
}

function filterCommands(query) {
  if (!query) return COMMANDS;
  const q = query.toLowerCase();
  return COMMANDS.filter(c => c.name.toLowerCase().includes(q));
}

function updateActive(items, newIdx) {
  activeIdx = (newIdx + items.length) % items.length;
  overlay.querySelectorAll(".cp-item").forEach((el, i) => el.classList.toggle("active", i === activeIdx));
  overlay.querySelector(".cp-item.active")?.scrollIntoView({ block: "nearest" });
}

function openPalette() {
  if (overlay) { closePalette(); return; }
  overlay = document.createElement("div");
  overlay.className = "cp-overlay";
  overlay.innerHTML = `<div class="cp-modal"><input class="cp-input" placeholder="Type a command..." autofocus><div class="cp-list"></div></div>`;
  document.body.append(overlay);

  const input = overlay.querySelector(".cp-input");
  activeIdx = 0;
  renderList(COMMANDS);

  input.oninput = () => { activeIdx = 0; renderList(filterCommands(input.value)); };
  input.onkeydown = e => {
    const items = filterCommands(input.value);
    if (e.key === "Escape") { closePalette(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); updateActive(items, activeIdx + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); updateActive(items, activeIdx - 1); }
    else if (e.key === "Enter") { e.preventDefault(); items[activeIdx]?.action(); closePalette(); }
  };
  overlay.onclick = e => { if (e.target === overlay) closePalette(); };
  input.focus();
}

export function initCommandPalette() {
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openPalette(); }
  });
}
