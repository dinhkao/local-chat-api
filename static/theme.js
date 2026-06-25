const STORAGE_KEY = "chat-theme";
const THEMES = ["dark", "oldschool"];
const DEFAULT = "dark";

// Get theme link element
function getLink() {
  return document.getElementById("theme-css");
}

// Apply theme by name
export function switchTheme(name) {
  const link = getLink();
  if (!link) return;
  const theme = THEMES.includes(name) ? name : DEFAULT;
  link.href = `/static/themes/${theme}.css`;
  localStorage.setItem(STORAGE_KEY, theme);
}

// Populate theme select dropdown
export function initThemeSelect(selectEl) {
  selectEl.innerHTML = THEMES.map(t =>
    `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
  ).join("");
  selectEl.value = getSaved();
  selectEl.onchange = () => switchTheme(selectEl.value);
}

// Get saved theme or default
export function getSaved() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT;
}

// Init: load saved theme on page load
export function initTheme() {
  switchTheme(getSaved());
}
