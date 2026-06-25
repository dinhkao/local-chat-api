// ── Shared state singleton ──
export let me = null;
export let currentGroup = null;
export let replyTo = null;
export const messageCache = {};

export function setMe(v) { me = v; }
export function setCurrentGroup(v) { currentGroup = v; }
export function setReplyTo(v) { replyTo = v; }

export function getMsgs(gid) { return messageCache[gid] || (messageCache[gid] = []); }
