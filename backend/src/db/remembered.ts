// The data only changes when the pipeline publishes, so answers and catalog lookups are both kept for this long.
export const DATA_TTL_MS = 10 * 60 * 1000;
// Some lookup arguments come from the address, so each lookup keeps at most this many results unless it asks for fewer.
const MAX_ENTRIES = 1000;

// Wraps an async lookup so its result is kept per arguments for DATA_TTL_MS. The promise itself is kept, so identical lookups
// arriving together share one query, and a failed lookup is dropped so the next call tries again. Every caller gets the same
// value: callers must copy it before changing it. `maxEntries` caps how many results are kept, for lookups with large ones.
export function remembered<Args extends string[], T>(
  lookup: (...args: Args) => Promise<T>,
  maxEntries = MAX_ENTRIES,
): (...args: Args) => Promise<T> {
  const entries = new Map<string, { value: Promise<T>; expiresAt: number }>();
  return (...args) => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const hit = entries.get(key);
    if (hit && hit.expiresAt > now) return hit.value;
    entries.delete(key);
    // Every entry lives DATA_TTL_MS from when it was added and a hit never moves it, so the map is in expiry order:
    // expired entries are all at the front, and dropping them here frees what no one has asked for again.
    for (const [oldKey, old] of entries) {
      if (old.expiresAt > now) break;
      entries.delete(oldKey);
    }
    const entry = { value: lookup(...args), expiresAt: now + DATA_TTL_MS };
    entries.set(key, entry);
    if (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    entry.value.catch(() => {
      if (entries.get(key) === entry) entries.delete(key);
    });
    return entry.value;
  };
}
