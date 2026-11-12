// The data only changes when the pipeline publishes, so answers and catalog lookups are both kept for this long.
export const DATA_TTL_MS = 10 * 60 * 1000;
// Some lookup arguments come from the address, so each lookup keeps at most this many results.
const MAX_ENTRIES = 1000;

// Wraps an async lookup so its result is kept per arguments for DATA_TTL_MS. The promise itself is kept, so identical lookups
// arriving together share one query, and a failed lookup is dropped so the next call tries again. Every caller gets the same
// value: callers must copy it before changing it.
export function remembered<Args extends string[], T>(lookup: (...args: Args) => Promise<T>): (...args: Args) => Promise<T> {
  const entries = new Map<string, { value: Promise<T>; expiresAt: number }>();
  return (...args) => {
    const key = JSON.stringify(args);
    const hit = entries.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;
    entries.delete(key);
    const entry = { value: lookup(...args), expiresAt: Date.now() + DATA_TTL_MS };
    entries.set(key, entry);
    if (entries.size > MAX_ENTRIES) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    entry.value.catch(() => {
      if (entries.get(key) === entry) entries.delete(key);
    });
    return entry.value;
  };
}
