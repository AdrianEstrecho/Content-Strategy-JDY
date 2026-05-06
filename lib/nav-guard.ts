// Module-level flag toggled by long-running client features (e.g. Admin streaming).
// Layout chrome (sidebar, topbar) reads it to confirm before navigating away.

let streaming = false;
const listeners = new Set<(active: boolean) => void>();

export function setAppStreaming(active: boolean): void {
  if (streaming === active) return;
  streaming = active;
  listeners.forEach((cb) => cb(active));
}

export function isAppStreaming(): boolean {
  return streaming;
}

export function subscribeAppStreaming(cb: (active: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
