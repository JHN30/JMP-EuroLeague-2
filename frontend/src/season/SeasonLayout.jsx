import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { getSeasons } from "../lib/api";
import { useDefaultSeasonCode } from "./useDefaultSeasonCode";
import SeasonSelector from "./SeasonSelector";
import NavBar from "./NavBar";

function CenteredSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
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

export default function SeasonLayout() {
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
      <header className="flex flex-col gap-4 border-b border-base-300 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <span className="eyebrow">EuroLeague</span>
          <SeasonSelector />
        </div>
        <NavBar />
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
