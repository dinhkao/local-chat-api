// ── Search ──
export function showSearch() { document.getElementById("search-wrap").classList.remove("hidden"); }

export function clearSearch() {
  document.getElementById("search-input").value = "";
  document.getElementById("search-clear").classList.add("hidden");
  document.getElementById("search-info").classList.add("hidden");
  document.getElementById("search-input").blur();
}

export function doSearch(q, gid, msgElFn, restoreMsgsFn) {
  const info = document.getElementById("search-info");
  const clear = document.getElementById("search-clear");
  clear.classList.remove("hidden");
  info.textContent = "Searching...";
  info.classList.remove("hidden");
  return fetch(`/api/groups/${gid}/search?q=${encodeURIComponent(q)}`)
    .then(r => r.json())
    .then(data => {
      const div = document.getElementById("msgs");
      if (!data.results || !data.results.length) {
        div.innerHTML = '<span style="color:#555">No results</span>';
        info.textContent = "0 matches";
        return;
      }
      info.textContent = `${data.results.length} matches`;
      div.innerHTML = "";
      data.results.forEach(m => {
        const el = msgElFn(m);
        if (el) {
          el.classList.add("search-result");
          el.addEventListener("click", () => {
            clearSearch();
            info.classList.add("hidden");
            restoreMsgsFn();
            setTimeout(() => {
              document.querySelector(`#msg-${m.id}`)?.scrollIntoView({ behavior: "smooth" });
              document.querySelector(`#msg-${m.id}`)?.classList.add("highlight");
            }, 100);
          });
          const snippet = document.createElement("div");
          snippet.className = "snippet";
          snippet.textContent = `${m.text}`;
          el.querySelector(".meta")?.before(snippet);
          div.append(el);
        }
      });
    })
    .catch(() => { info.textContent = "Search failed"; });
}
