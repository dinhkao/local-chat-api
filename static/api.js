const API = "";

export async function loadUsers() {
  const users = await fetch(API + "/api/users").then(r => r.json());
  return users;
}

export async function loadGroups() {
  return fetch(API + "/api/groups").then(r => r.json());
}

export function loadMessages(gid, opts = {}) {
  const params = new URLSearchParams({ limit: opts.limit || 100 });
  if (opts.before) params.set("before", opts.before);
  return fetch(`${API}/api/groups/${gid}/messages?${params}`)
    .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
}

export function createGroup(name) {
  return fetch(API + "/api/groups", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name })
  });
}

export function editMessage(id, text) {
  return fetch(`${API}/api/messages/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text })
  });
}

export function deleteMessage(id) {
  return fetch(`${API}/api/messages/${id}`, { method: "DELETE" });
}
