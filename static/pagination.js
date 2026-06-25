import { me, currentGroup, getMsgs, getMeta } from "./state.js";
import { loadMessages } from "./api.js";
import { prependMsgs } from "./messages.js";

const PAGE_SIZE = 20;

// Fetch messages and merge into group cache
export async function fetchAndMerge(gid, opts = {}) {
  const data = await loadMessages(gid, { ...opts, limit: opts.limit || PAGE_SIZE });
  if (!data) return null;
  const existing = new Set(getMsgs(gid).map(m => m.id));
  const fresh = data.messages.filter(m => !existing.has(m.id));
  if (opts.prepend) getMsgs(gid).unshift(...fresh);
  else getMsgs(gid).push(...fresh);
  return data;
}

// Load older messages when user scrolls to top
export async function loadMore(gid) {
  const meta = getMeta(gid);
  if (meta.loading || !meta.hasMore) return;
  const cache = getMsgs(gid);
  if (!cache.length) return;
  meta.loading = true;
  const oldest = cache[0].id;
  const d = await fetchAndMerge(gid, { before: oldest, limit: PAGE_SIZE, prepend: true });
  meta.hasMore = d?.has_more ?? false;
  if (d?.messages?.length) prependMsgs("#msgs", d.messages, me, getMsgs(gid));
  meta.loading = false;
}

export { PAGE_SIZE };
