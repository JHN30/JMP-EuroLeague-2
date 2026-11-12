import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import App from "./App.jsx";
import LazyMotionFeatures from "./lib/LazyMotionFeatures";

// A deploy replaces the script files, so a tab opened before it can ask for a page's old file and get a 404. Reloading fetches
// the current index.html with the new names. The time of the last such reload is kept so a file that is still missing right
// after it reaches the page's error panel (whose button reloads) instead of reloading over and over. Without storage there is no
// automatic reload. The motion features have their own guard in LazyMotionFeatures.
const CHUNK_RELOAD_KEY = "chunk-reload-at";
const CHUNK_RELOAD_GAP_MS = 10_000;

window.addEventListener("vite:preloadError", () => {
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY));
    if (Date.now() - last < CHUNK_RELOAD_GAP_MS) return;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
});

// The data only changes when the pipeline publishes. Returning to a tab refetches what is older than 5 minutes (React Query's
// default refetch on focus), so a tab left open shows a new publish without a reload. Those refetches are answered from the
// browser's copy or the server's 10-minute cache, so Neon still sees each address at most once per 10 minutes.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000 },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <LazyMotionFeatures>
          <App />
        </LazyMotionFeatures>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
