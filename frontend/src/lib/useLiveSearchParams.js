import { useSearchParams } from "react-router";

// React Router's useSearchParams, with one change: an updater runs on the live address. React Router hands it the address of
// the component's last render, so a second choice made before the page re-renders (quick clicks, a slow phone) would undo
// the first. A plain value and the navigation options (such as `replace`) pass through as they are.
export function useLiveSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  function setLiveSearchParams(next, options) {
    setSearchParams(typeof next === "function" ? () => next(new URLSearchParams(window.location.search)) : next, options);
  }
  return [searchParams, setLiveSearchParams];
}
