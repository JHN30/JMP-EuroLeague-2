import { lazy } from "react";
import { MotionConfig } from "motion/react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import SeasonLayout from "./season/SeasonLayout";
import AsyncState from "./lib/AsyncState";
import ScrollToTop from "./lib/ScrollToTop";
import NotFoundPage from "./NotFoundPage";
import { useDefaultSeasonCode } from "./season/useDefaultSeasonCode";
import { useThemePreference } from "./lib/useThemePreference";

const Dashboard = lazy(() => import("./dashboard/Dashboard"));
const SeasonOverviewPage = lazy(() => import("./season/SeasonOverviewPage"));
const StandingsPage = lazy(() => import("./standings/StandingsPage"));
const FixturesPage = lazy(() => import("./games/FixturesPage"));
const GameDetailPage = lazy(() => import("./games/GameDetailPage"));
const TeamsPage = lazy(() => import("./teams/TeamsPage"));
const TeamPage = lazy(() => import("./teams/TeamPage"));
const PlayersPage = lazy(() => import("./players/PlayersPage"));
const PlayerPage = lazy(() => import("./players/PlayerPage"));
const LeadersPage = lazy(() => import("./leaders/LeadersPage"));
const ComparisonsPage = lazy(() => import("./comparisons/ComparisonsPage"));
const HeadToHeadPage = lazy(() => import("./comparisons/HeadToHeadPage"));
const RecordsPage = lazy(() => import("./records/RecordsPage"));
const PostseasonPage = lazy(() => import("./postseason/PostseasonPage"));

// An old address sent on to the page's current one, keeping the query string (a shared comparison or leaderboard link) and the hash.
function RedirectTo({ to, relative = "path" }) {
  const { search, hash } = useLocation();
  return <Navigate replace to={{ pathname: to, search, hash }} relative={relative} />;
}

function DefaultSeasonRedirect() {
  const defaultSeasonQuery = useDefaultSeasonCode();

  if (defaultSeasonQuery.isLoading) {
    return <AsyncState status="loading" label="Loading seasons" fullScreen />;
  }

  if (defaultSeasonQuery.isError || !defaultSeasonQuery.data) {
    return (
      <AsyncState
        status="error"
        fullScreen
        message="Could not load seasons. Check your connection and try again."
        onRetry={() => defaultSeasonQuery.refetch()}
      />
    );
  }

  return <Navigate replace to={`/${defaultSeasonQuery.data}/home`} />;
}

function App() {
  const themePreference = useThemePreference();

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell min-h-screen">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<DefaultSeasonRedirect />} />
          <Route path="/:seasonCode" element={<SeasonLayout themePreference={themePreference} />}>
            <Route index element={<RedirectTo to="home" relative="route" />} />
            <Route path="home" element={<Dashboard />} />
            <Route path="overview" element={<SeasonOverviewPage />} />
            <Route path="standings" element={<StandingsPage />} />
            <Route path="games" element={<FixturesPage />} />
            <Route path="games/:gameCode" element={<GameDetailPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="teams/:clubCode" element={<TeamPage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="players/:personKey" element={<PlayerPage />} />
            <Route path="leaders" element={<LeadersPage />} />
            <Route path="compare" element={<ComparisonsPage />} />
            <Route path="compare/head-to-head" element={<HeadToHeadPage />} />
            <Route path="statistics" element={<RedirectTo to="../leaders" />} />
            <Route path="comparisons" element={<RedirectTo to="../compare" />} />
            <Route path="comparisons/head-to-head" element={<RedirectTo to="../../compare/head-to-head" />} />
            <Route path="records" element={<RecordsPage />} />
            <Route path="postseason" element={<PostseasonPage />} />
            <Route path="playoffs" element={<RedirectTo to="../postseason" />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </MotionConfig>
  );
}

export default App;
