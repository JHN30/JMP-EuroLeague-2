import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function systemPrefersReducedMotion() {
  return window.matchMedia(QUERY).matches;
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(systemPrefersReducedMotion);

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const handleChange = (event) => setPrefersReducedMotion(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
