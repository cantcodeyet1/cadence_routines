import { useEffect, useState } from "react";

// A tiny in-memory, stale-while-revalidate cache. Module-level, so it
// survives page-to-page navigation within the SPA (cleared on a hard
// reload). Keeps the app feeling instant on repeat visits to a page while
// still refreshing in the background so data doesn't go stale.
const store = new Map();
const inflight = new Map();

function load(key, fetcher) {
  if (inflight.has(key)) return inflight.get(key);
  const promise = fetcher()
    .then((data) => {
      store.set(key, data);
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });
  inflight.set(key, promise);
  return promise;
}

// Kicks a fetch off without any component needing to mount and wait on it -
// used to warm the cache for screens the user hasn't opened yet.
export function prefetch(key, fetcher) {
  if (!store.has(key) && !inflight.has(key)) {
    load(key, fetcher).catch(() => {});
  }
}

// Like prefetch, but resolves with the data - lets a warm-up routine chain
// off of a value (e.g. fetch each routine's detail once the routine list
// is in) without a component mounting to read it via useCachedData.
export function prefetchAndGet(key, fetcher) {
  if (store.has(key)) return Promise.resolve(store.get(key));
  return load(key, fetcher);
}

// Returns { data, error, loading, refresh }. `data` is served from cache
// immediately (if present) while a fresh fetch runs quietly behind it, so
// only a genuinely first-ever visit shows a loading state.
export function useCachedData(key, fetcher) {
  const [data, setData] = useState(() => (key ? store.get(key) : undefined));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setData(store.get(key));
    setError(null);

    load(key, fetcher)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function refresh() {
    store.delete(key);
    return load(key, fetcher).then((res) => setData(res));
  }

  return { data, error, loading: data === undefined && !error, refresh };
}

export function setCached(key, data) {
  store.set(key, data);
}

// Drops one or more keys from the cache without a mounted component to
// call refresh() through - used when an action on one page (deleting a
// session, finishing a routine) changes data another, currently-unmounted
// page has cached. That page just refetches fresh the next time it mounts,
// instead of showing what's now stale.
export function invalidate(keyOrKeys) {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  for (const key of keys) store.delete(key);
}
