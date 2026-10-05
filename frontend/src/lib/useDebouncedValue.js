import { useEffect, useState } from "react";

// `value` after it has stopped changing for `delay` milliseconds: a search box that sends a request for the pause, not for every
// key.
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
