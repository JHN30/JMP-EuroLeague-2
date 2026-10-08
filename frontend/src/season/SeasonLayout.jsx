import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, Outlet, useLocation, useParams } from "react-router";
import { getSeasons } from "../lib/api";
import { isLegacySeasonCode, seasonSlug } from "../lib/seasonSlug";
import AsyncState from "../lib/AsyncState";
import { BackTargetContext } from "../lib/backTarget";
import { useBackLinkClick } from "../lib/historyTrail";
import RouteErrorBoundary from "../ErrorBoundary";
import { THEMES } from "../lib/useThemePreference";
import { useDefaultSeasonCode } from "./useDefaultSeasonCode";
import SeasonSelector from "./SeasonSelector";
import NavBar from "./NavBar";
import SiteMenu from "./SiteMenu";
import { pageLabel } from "./sections";

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

export default function SeasonLayout({ themePreference }) {
  const { seasonCode } = useParams();
  const location = useLocation();
  // Set by a detail page's back link: on a phone the sticky bar's page name becomes a link back to that page's list.
  const [backTarget, setBackTarget] = useState(null);
  const goBack = useBackLinkClick(backTarget?.to);
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: getSeasons });
  // An address from before the year-only form ("E2025") goes on to the year ("2025"), keeping the rest of the address.
  const legacy = isLegacySeasonCode(seasonCode);
  const isSupported = seasonsQuery.data?.seasons.some((season) => season.seasonCode === seasonCode) ?? false;
  const defaultSeasonQuery = useDefaultSeasonCode(seasonsQuery.isSuccess && !isSupported && !legacy);

  if (legacy) {
    const segments = location.pathname.split("/");
    segments[1] = seasonSlug(seasonCode);
    return <Navigate replace to={{ pathname: segments.join("/"), search: location.search, hash: location.hash }} />;
  }

  if (seasonsQuery.isLoading) return <AsyncState status="loading" label="Loading seasons" fullScreen />;

  if (seasonsQuery.isError) {
    return (
      <AsyncState status="error" fullScreen
        message="Could not load seasons. Check your connection and try again."
        onRetry={() => seasonsQuery.refetch()}
      />
    );
  }

  if (!isSupported) {
    if (defaultSeasonQuery.isLoading) return <AsyncState status="loading" label="Loading seasons" fullScreen />;

    if (defaultSeasonQuery.isError) {
      return (
        <AsyncState status="error" fullScreen
          message="Could not load seasons. Check your connection and try again."
          onRetry={() => defaultSeasonQuery.refetch()}
        />
      );
    }

    if (!defaultSeasonQuery.data) {
      return <AsyncState status="error" fullScreen message="No seasons are currently available." />;
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
    <BackTargetContext.Provider value={setBackTarget}>
      <div className="min-h-screen">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <header className="app-nav">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Link to={`/${seasonCode}/home`} aria-label="Home" className="flex shrink-0 items-center gap-2">
                <img src="/logo-header.png" alt="" aria-hidden="true" className="brand-mark" />
                <span className="eyebrow hidden sm:inline">EuroLeague</span>
              </Link>
              {backTarget ? (
                <Link
                  to={backTarget.to}
                  onClick={goBack}
                  aria-label={`Back to ${backTarget.label}`}
                  className="flex min-w-0 items-center gap-1.5 font-semibold sm:hidden"
                >
                  <span aria-hidden="true">←</span>
                  <span data-testid="page-name" className="truncate">
                    {pageLabel(location.pathname)}
                  </span>
                </Link>
              ) : (
                <span data-testid="page-name" className="truncate font-semibold sm:hidden">
                  {pageLabel(location.pathname)}
                </span>
              )}
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <SeasonSelector />
              <ThemeToggle themePreference={themePreference} />
            </div>
            <SiteMenu>
              <SeasonSelector />
              <ThemeToggle themePreference={themePreference} />
            </SiteMenu>
          </div>
          <NavBar />
        </header>
        <main id="main-content" tabIndex={-1} className="p-3 outline-none sm:p-5 lg:p-8">
          <RouteErrorBoundary>
            <Suspense fallback={<AsyncState status="loading" label="Loading page" />}>
              {/* Keyed by season so each page's local view-level filters reset
                  when the archive-level season selection changes. */}
              <Outlet key={seasonCode} />
            </Suspense>
          </RouteErrorBoundary>
        </main>
      </div>
    </BackTargetContext.Provider>
  );
}
