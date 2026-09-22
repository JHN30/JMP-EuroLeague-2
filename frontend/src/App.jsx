import { Navigate, Route, Routes } from "react-router";
import Dashboard from "./dashboard/Dashboard";
import SeasonLayout from "./season/SeasonLayout";
import StandingsPage from "./standings/StandingsPage";
import FixturesPage from "./games/FixturesPage";
import GameDetailPage from "./games/GameDetailPage";
import TeamsPage from "./teams/TeamsPage";
import TeamPage from "./teams/TeamPage";
import PlayersPage from "./players/PlayersPage";
import PlayerPage from "./players/PlayerPage";
import StatisticsPage from "./statistics/StatisticsPage";
import ComparisonsPage from "./comparisons/ComparisonsPage";
import PlayoffsPage from "./playoffs/PlayoffsPage";
import RouteErrorBoundary from "./ErrorBoundary";
import { useDefaultSeasonCode } from "./season/useDefaultSeasonCode";
import { useThemePreference } from "./lib/useThemePreference";

function DefaultSeasonRedirect() {
  const defaultSeasonQuery = useDefaultSeasonCode();

  if (defaultSeasonQuery.isLoading) {
    return (
      <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (defaultSeasonQuery.isError || !defaultSeasonQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div role="alert" className="alert alert-error max-w-md">
          <span>Could not load seasons. Check your connection and try again.</span>
          <button type="button" className="btn btn-sm" onClick={() => defaultSeasonQuery.refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <Navigate replace to={`/${defaultSeasonQuery.data}`} />;
}

function App() {
  const themePreference = useThemePreference();

  return (
    <div className="app-shell min-h-screen">
      <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<DefaultSeasonRedirect />} />
          <Route path="/:seasonCode" element={<SeasonLayout themePreference={themePreference} />}>
            <Route index element={<Dashboard />} />
            <Route path="standings" element={<StandingsPage />} />
            <Route path="games" element={<FixturesPage />} />
            <Route path="games/:gameCode" element={<GameDetailPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:clubCode" element={<TeamPage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="players/:personKey" element={<PlayerPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="comparisons" element={<ComparisonsPage />} />
            <Route path="playoffs" element={<PlayoffsPage />} />
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </RouteErrorBoundary>
    </div>
  );
}

export default App;
