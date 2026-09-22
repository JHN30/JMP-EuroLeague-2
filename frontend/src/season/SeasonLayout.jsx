import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { getSeasons } from "../lib/api";
import { THEMES } from "../lib/useThemePreference";
import { useDefaultSeasonCode } from "./useDefaultSeasonCode";
import SeasonSelector from "./SeasonSelector";
import NavBar from "./NavBar";

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function ThemeToggle({ themePreference }) {
  if (!themePreference) return null;
  const { theme, nextTheme, toggleTheme } = themePreference;
  const Icon = nextTheme === "light-euroleague" ? SunIcon : MoonIcon;

  return (
    <button
      type="button"
      className="btn btn-square btn-ghost btn-sm touch-target"
      onClick={toggleTheme}
      aria-label={`Switch to ${THEMES[nextTheme].title}`}
      title={`Current: ${THEMES[theme].title}. Switch to ${THEMES[nextTheme].title}.`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CenteredSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  );
}

function ErrorAlert({ message, onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div role="alert" className="alert alert-error max-w-md">
        <span>{message}</span>
        {onRetry ? (
          <button type="button" className="btn btn-sm" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function SeasonLayout({ themePreference }) {
  const { seasonCode } = useParams();
  const location = useLocation();
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: getSeasons });
  const isSupported = seasonsQuery.data?.seasons.some((season) => season.seasonCode === seasonCode) ?? false;
  const defaultSeasonQuery = useDefaultSeasonCode(seasonsQuery.isSuccess && !isSupported);

  if (seasonsQuery.isLoading) return <CenteredSpinner />;

  if (seasonsQuery.isError) {
    return (
      <ErrorAlert
        message="Could not load seasons. Check your connection and try again."
        onRetry={() => seasonsQuery.refetch()}
      />
    );
  }

  if (!isSupported) {
    if (defaultSeasonQuery.isLoading) return <CenteredSpinner />;

    if (defaultSeasonQuery.isError) {
      return (
        <ErrorAlert
          message="Could not load seasons. Check your connection and try again."
          onRetry={() => defaultSeasonQuery.refetch()}
        />
      );
    }

    if (!defaultSeasonQuery.data) {
      return <ErrorAlert message="No seasons are currently available." />;
    }

    const segments = location.pathname.split("/");
    segments[1] = defaultSeasonQuery.data;
    return (
      <Navigate
        replace
        to={{ pathname: segments.join("/") || "/", search: location.search, hash: location.hash }}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="app-nav">
        <div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="brand-mark" aria-hidden="true">EL</span>
            <span className="eyebrow">EuroLeague</span>
          </div>
          <div className="flex items-center gap-2">
            <SeasonSelector />
            <ThemeToggle themePreference={themePreference} />
          </div>
        </div>
        <NavBar />
      </header>
      <main id="main-content" tabIndex={-1} className="p-6 outline-none">
        <Outlet />
      </main>
    </div>
  );
}
