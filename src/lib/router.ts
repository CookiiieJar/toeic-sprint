import { useSyncExternalStore } from 'react';

/** Routeur minimal à base de hash (compatible GitHub Pages, sans configuration serveur) */
function current() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  return { path, params: new URLSearchParams(query), key: h };
}
let snapshot = current();
const subs = new Set<() => void>();
window.addEventListener('hashchange', () => {
  snapshot = current();
  subs.forEach((s) => s());
  window.scrollTo(0, 0);
});

export function useRoute() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => snapshot,
  );
}

export function navigate(to: string, replace = false) {
  const url = '#' + to;
  if (replace) {
    history.replaceState(null, '', url);
    snapshot = current();
    subs.forEach((s) => s());
  } else window.location.hash = to;
}

export function back(fallback = '/') {
  if (history.length > 1) history.back();
  else navigate(fallback);
}
