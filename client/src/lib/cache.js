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
