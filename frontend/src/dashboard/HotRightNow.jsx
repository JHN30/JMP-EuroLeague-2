import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { Link, useParams } from "react-router";
import { getLeaderForm, getSeasonGames } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { cardHover, listContainer, listItem } from "../lib/motion";
import { PHASE_NAMES } from "../lib/phaseSummary";
import { useCurrentPhaseCode } from "../lib/useCurrentPhaseCode";
import { displayName } from "../lib/playerName";
import LeaderPhoto from "../lib/LeaderPhoto";
import { SkeletonChip } from "../lib/Skeleton";
import { WidgetPanel } from "./Dashboard";

const MotionLink = m.create(Link);

// The Leaders page's form window and rule: only players who played all of their last five games count.
const FORM_GAMES = 5;
const STATS = [
  { key: "pts", label: "Points" },
  { key: "reb", label: "Rebounds" },
  { key: "ast", label: "Assists" },
  { key: "pir", label: "PIR" },
];

// The same request (and cache entry) as the Leaders page's Hot right now.
function useForm(seasonCode, phaseCode, enabled = true) {
  return useQuery({
    queryKey: ["leaders-form", seasonCode, phaseCode, FORM_GAMES],
    queryFn: () => getLeaderForm(seasonCode, { phase: phaseCode, games: FORM_GAMES }),
    enabled: Boolean(phaseCode) && enabled,
  });
}

const fullPlayers = (data) => (data?.players ?? []).filter((player) => player.recentGames >= FORM_GAMES);

function HotCard({ seasonCode, stat, player }) {
  if (!player) {
    return (
      <div className="kpi-chip">
        <div className="kpi-chip-body">
          <span className="label">{stat.label} · last {FORM_GAMES}</span>
          <AsyncState inline status="empty" message="Not available yet." />
        </div>
      </div>
    );
  }
  const recent = player.recent[stat.key];
  const season = player.season[stat.key];
  return (
    <MotionLink to={`/${seasonCode}/players/${player.personKey}`} className="kpi-chip kpi-chip-link" variants={listItem} {...cardHover}>
      <div className="kpi-chip-body">
        <span className="label">{stat.label} · last {FORM_GAMES}</span>
        <span className="name">{displayName(player.playerName ?? player.personKey)}</span>
        <span className="club">{player.clubName ?? player.clubCode}</span>
        <span className="value">{recent.toFixed(1)}</span>
        {season != null ? <span className="muted text-xs tabular-nums">Season {season.toFixed(1)}</span> : null}
      </div>
      <LeaderPhoto imageUrl={player.imageUrl} />
    </MotionLink>
  );
}

// Who is hot: the best average over each player's last five games, per stat, in the current stage. A stage too young for
// five games (the playoffs' first weeks, the Final Four) falls back to the regular season's closing stretch.
export default function HotRightNow() {
  const { seasonCode } = useParams();
  const currentPhase = useCurrentPhaseCode(seasonCode);
  const currentQuery = useForm(seasonCode, currentPhase);
  const fallback = currentPhase !== "RS" && currentQuery.isSuccess && fullPlayers(currentQuery.data).length === 0;
  const regularQuery = useForm(seasonCode, "RS", fallback);
  const query = fallback ? regularQuery : currentQuery;
  const phaseCode = fallback ? "RS" : currentPhase;

  // The request Home's header and Upcoming games already make: a finished season, or one between stages, has no "right now".
  const nextQuery = useQuery({
    queryKey: ["games", seasonCode, "scheduled", "asc"],
    queryFn: () => getSeasonGames(seasonCode, { status: "scheduled", order: "asc", limit: 10 }),
  });
  const live = !fallback && (nextQuery.data?.games.length ?? 0) > 0;

  const players = fullPlayers(query.data);
  const hottest = (key) =>
    players.reduce((best, player) => (player.recent[key] != null && (best === null || player.recent[key] > best.recent[key]) ? player : best), null);
  const stageName = PHASE_NAMES[phaseCode] ?? phaseCode;

  return (
    <WidgetPanel
      kicker={phaseCode === "RS" ? "FORM" : `FORM · ${stageName.toUpperCase()}`}
      compact
      title={live ? "Hot right now" : "Closing stretch"}
      isLoading={query.isLoading || currentQuery.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      isEmpty={query.isSuccess && players.length === 0}
      emptyMessage={`Player form appears once players have ${FORM_GAMES} games in the ${stageName}.`}
      skeleton={
        <div className="leaders-row" aria-hidden="true">
          {STATS.map((stat) => <SkeletonChip key={stat.key} label={`${stat.label} · last ${FORM_GAMES}`} image="person" />)}
        </div>
      }
    >
      <m.div className="leaders-row" role="group" aria-label="Hot right now" variants={listContainer} initial="hidden" animate="show">
        {STATS.map((stat) => <HotCard key={stat.key} seasonCode={seasonCode} stat={stat} player={hottest(stat.key)} />)}
      </m.div>
    </WidgetPanel>
  );
}
