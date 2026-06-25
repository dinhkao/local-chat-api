// ── Avatar ──
export function hashHue(id) { return (id * 137.508) % 360; }

export function avatarHTML(id, name, small) {
  const c = name ? name[0].toUpperCase() : "?";
  const cls = small ? "avatar-sm" : "";
  return `<span class="avatar ${cls}" style="background:hsl(${hashHue(id)},55%,45%)">${c}</span>`;
}

// ── Relative time ──
export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

let timeInterval;
export function startTimeInterval() {
  clearInterval(timeInterval);
  timeInterval = setInterval(() => {
    document.querySelectorAll(".rel-time").forEach(el => {
      if (el.dataset.iso) el.textContent = relativeTime(el.dataset.iso);
    });
  }, 30000);
}

// ── Escape HTML ──
export function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

// ── Emoji picker ──
const EMOJIS = ["😀","😂","😍","🎉","👍","❤️","🔥","😎","🤔","🙏","💪","😢","🚀","💯","✅","❌","👋","⭐","✨","🎶","😅","🤣","💀","👀","🗿","🥺","😤","😱","🤗","🫡"];

export function toggleEmojiPicker() {
  const existing = document.getElementById("emoji-picker");
  if (existing) { existing.remove(); return; }
  const picker = document.createElement("div");
  picker.id = "emoji-picker";
  picker.innerHTML = EMOJIS.map(e => `<span data-emoji="${e}">${e}</span>`).join("");
  picker.querySelectorAll("span").forEach(s => s.onclick = () => {
    document.getElementById("msg-text").value += s.dataset.emoji;
    document.getElementById("msg-text").focus();
    picker.remove();
  });
  setTimeout(() => document.addEventListener("click", function close(e) {
    if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener("click", close); }
  }), 0);
  document.getElementById("input-area").append(picker);
}

// ── Sidebar ──
export function toggleSidebar(open) {
  document.querySelector("#sidebar").classList.toggle("open", open);
}

// ── Typing display ──
let typingTimeout = null;
export function showTyping(uid) {
  const el = document.getElementById("typing-indicator");
  el.textContent = `User #${uid} is typing...`;
  el.classList.remove("hidden");
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    el.classList.add("hidden");
    el.textContent = "";
  }, 2500);
}
