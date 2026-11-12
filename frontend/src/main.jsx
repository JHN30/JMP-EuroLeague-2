import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import App from "./App.jsx";
import LazyMotionFeatures from "./lib/LazyMotionFeatures";

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
