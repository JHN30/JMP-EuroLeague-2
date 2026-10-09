import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "react-router";
import { getSeasons } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import { formatDecimal, formatSignedDecimal } from "../lib/format";
import HomeAwayIcon from "../lib/HomeAwayIcon";
import { listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { ProfileComparison, TrendGrid } from "./PlayerCareerCharts";
import { careerAverages, careerHighs, careerTotals, changeFrom, fetchPlayerCareer, seasonLine } from "./careerData";

// ---- Career summary: weighted averages and exact totals over the regular seasons ----

function SummaryStat({ label, value, sub }) {
  return (
    <motion.div className="rounded-box border border-base-300 bg-base-100 p-3" variants={listItem}>
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      <p className="mt-1 text-2xl font-black leading-none tabular-nums">{value}</p>
      {sub ? <p className="muted mt-1 text-xs">{sub}</p> : null}
    </motion.div>
  );
}

function CareerSummary({ averages, totals, seasonCount }) {
  const each = (key) => (averages[key] === null ? "—" : formatDecimal(averages[key]));
  return (
    <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8" variants={listContainer} initial="hidden" animate="show">
      <SummaryStat label="Seasons" value={seasonCount} />
      <SummaryStat label="Games" value={totals.games} sub="regular season" />
      <SummaryStat label="Minutes" value={totals.minutes.toLocaleString()} sub="played" />
      <SummaryStat label="Points" value={totals.points.toLocaleString()} sub="scored" />
      <SummaryStat label="PTS" value={each("pts")} sub="career per game" />
      <SummaryStat label="REB" value={each("reb")} sub="career per game" />
      <SummaryStat label="AST" value={each("ast")} sub="career per game" />
      <SummaryStat label="PIR" value={each("pir")} sub="career per game" />
    </motion.div>
  );
}

// ---- Season table: every season in a row, with the change from the season before ----

const TABLE_COLUMNS = [
  { key: "min", label: "MIN", change: true },
  { key: "pts", label: "PTS", change: true },
  { key: "reb", label: "REB", change: true },
  { key: "ast", label: "AST", change: true },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
  { key: "pir", label: "PIR", change: true },
  { key: "p2", label: "2P%" },
  { key: "p3", label: "3P%" },
  { key: "ft", label: "FT%" },
  { key: "ts", label: "TS%", change: true },
];

function Change({ value }) {
  if (value === null || value === 0) return null;
  return (
    <span className={`ml-1 text-[0.7rem] font-semibold ${value > 0 ? "text-success" : "text-error"}`} title="Against the season before">
      {value > 0 ? "▲" : "▼"}
      {formatSignedDecimal(value).replace(/^[+-]/, "")}
    </span>
  );
}

function ClubCrests({ registrations }) {
  return (
    <span className="flex items-center gap-1">
      {registrations.map((registration) =>
        registration.team?.crestUrl ? (
          <RevealImage
            key={registration.registrationKey}
            src={registration.team.crestUrl}
            alt={registration.team.name ?? ""}
            className={`h-6 w-6 flex-none object-contain ${registration.active === false ? "opacity-50" : ""}`}
            title={`${registration.team.name ?? registration.clubCode}${registration.active === false ? " (former)" : ""}`}
          />
        ) : null,
      )}
    </span>
  );
}

function SeasonTable({ cards, lines, averages, currentSeasonCode, personKey }) {
  return (
    <Panel className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Regular seasons, per game" tabIndex={0}>
      <table className="data-table-sticky table max-sm:table-sm">
        <thead>
          <tr>
            <th>Season</th>
            <th>Team</th>
            <th>Age</th>
            <th>GP</th>
            {TABLE_COLUMNS.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <motion.tbody variants={listContainer} initial="hidden" animate="show">
          {lines.map((line, index) => {
            const card = cards[index];
            const previous = index > 0 ? lines[index - 1] : null;
            return (
              <motion.tr key={line.seasonCode} variants={listItem} className={line.seasonCode === currentSeasonCode ? "bg-base-200/60" : ""}>
                <td className="whitespace-nowrap font-semibold">
                  <Link to={`/${line.seasonCode}/players/${personKey}`} className="link link-hover">
                    {line.label}
                  </Link>
                  {/* Below sm the badges sit under the season, so the pinned column stays about a season label wide. */}
                  {line.small || line.calculated ? (
                    <span className="mt-1 flex flex-col items-start gap-1 sm:ml-2 sm:mt-0 sm:inline-flex sm:flex-row">
                      {line.small ? <span className="badge badge-ghost badge-sm" title="Fewer than 10 games: not compared">small sample</span> : null}
                      {line.calculated ? (
                        <span
                          className="badge badge-ghost badge-sm"
                          title="The league lists per-game numbers from a minimum of games, so these are worked out from this player's season totals"
                        >
                          calculated
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </td>
                <td>
                  <ClubCrests registrations={card.registrations} />
                </td>
                <td className="tabular-nums">{line.age ?? "—"}</td>
                <td className="tabular-nums">{line.gp ?? "—"}</td>
                {TABLE_COLUMNS.map((column) => (
                  <td key={column.key} className="whitespace-nowrap tabular-nums">
                    {line[column.key] === null ? "—" : formatDecimal(line[column.key])}
                    {column.change ? <Change value={changeFrom(previous, line, column.key)} /> : null}
                  </td>
                ))}
              </motion.tr>
            );
          })}
        </motion.tbody>
        {lines.length > 1 ? (
          <tfoot>
            <tr className="font-bold">
              <td>Career</td>
              <td />
              <td />
              <td className="tabular-nums">{averages.gp}</td>
              {TABLE_COLUMNS.map((column) => (
                <td key={column.key} className="tabular-nums">
                  {averages[column.key] === null ? "—" : formatDecimal(averages[column.key])}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </Panel>
  );
}

// ---- Career highs: the best single game for each stat, anywhere in the archive ----

function HighCard({ high }) {
  const { best } = high;
  if (!best) return null;
  const opponent = best.game.side === "local" ? best.game.roadTeam : best.game.localTeam;
  return (
    <motion.div variants={listItem}>
      <Link
        to={`/${best.seasonCode}/games/${best.game.gameCode}`}
        className="flex h-full flex-col gap-1 rounded-box border border-base-300 bg-base-100 p-3 transition-colors hover:border-primary"
      >
        <span className="muted text-xs font-bold uppercase tracking-wide">{high.label}</span>
        <span className="text-4xl font-black leading-none tabular-nums">{Math.round(best.value)}</span>
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-sm">
          <HomeAwayIcon home={best.game.side === "local"} className="h-3.5 w-3.5 text-base-content/60" />
          {opponent?.crestUrl ? <RevealImage src={opponent.crestUrl} className="h-5 w-5 flex-none object-contain" /> : null}
          <span className="truncate font-semibold">
            <ShortLabel short={opponent?.tvCode ?? opponent?.abbreviatedName ?? opponent?.name ?? "opponent"} full={opponent?.name ?? "opponent"} />
          </span>
        </span>
        <span className="muted text-xs">
          {best.label} · {best.game.phaseCode === "RS" ? (best.game.roundName ?? best.game.phaseName) : best.game.phaseName}
        </span>
      </Link>
    </motion.div>
  );
}

function CareerHighs({ highs }) {
  return (
    <Panel className="p-4">
      <PanelHeader kicker="BEST SINGLE GAMES" title="Career highs" />
      <motion.div className="grid grid-cols-2 gap-3 lg:grid-cols-4" variants={listContainer} initial="hidden" animate="show">
        {highs.map((high) => (
          <HighCard key={high.field} high={high} />
        ))}
      </motion.div>
      <p className="muted mt-3 text-xs">Across every game in the archive, playoffs included. A tie goes to the most recent game.</p>
    </Panel>
  );
}

// ---- Role: how much the player played and started, how much of the offence they used, and where the points came from ----

// Where the points came from, as the share of the season's points from twos, threes and free throws.
const POINT_MIX = [
  { key: "mixTwos", label: "Pts from 2s", title: "Share of the points scored from two-pointers" },
  { key: "mixThrees", label: "Pts from 3s", title: "Share of the points scored from three-pointers" },
  { key: "mixFt", label: "Pts from FT", title: "Share of the points scored from free throws" },
];

function RoleTable({ lines }) {
  return (
    <Panel className="p-4">
      <PanelHeader kicker="ROLE" title="How the role changed" />
      <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="How the role changed, by season" tabIndex={0}>
        <table className="data-table-sticky table max-sm:table-sm">
          <thead>
            <tr>
              <th>Season</th>
              <th>Started</th>
              <th>MIN</th>
              <th>USG%</th>
              {POINT_MIX.map((part) => (
                <th key={part.key} title={part.title}>
                  {part.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.seasonCode}>
                <td className="whitespace-nowrap font-semibold">{line.label}</td>
                <td className="whitespace-nowrap tabular-nums" title={line.gs === null ? "Starts are not in the game log" : `Started ${line.gs} of ${line.gp ?? 0} games`}>
                  {line.gs === null ? <span className="muted">—</span> : `${line.gs}/${line.gp ?? 0}`}
                </td>
                <td className="tabular-nums">{line.min === null ? "—" : formatDecimal(line.min)}</td>
                <td className="tabular-nums">{line.usg === null ? "—" : `${formatDecimal(line.usg)}%`}</td>
                {POINT_MIX.map((part) => (
                  <td key={part.key} className="whitespace-nowrap tabular-nums">
                    {line[part.key] === null ? "—" : `${formatDecimal(line[part.key])}%`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---- Teams: the clubs, season by season ----

function TeamsTimeline({ cards, currentSeasonCode }) {
  return (
    <Panel className="p-4">
      <PanelHeader kicker="CLUBS" title="Teams by season" />
      <div className="overflow-x-auto overscroll-x-contain pb-2" role="region" aria-label="Clubs by season" tabIndex={0}>
        <motion.ol className="flex gap-6" variants={listContainer} initial="hidden" animate="show">
          {cards.map((card) => (
            <motion.li key={card.seasonCode} className="min-w-44 flex-none" variants={listItem}>
              <div className="relative mb-3 flex items-center">
                <span
                  aria-hidden="true"
                  className={`z-10 h-3 w-3 flex-none rounded-full ${card.seasonCode === currentSeasonCode ? "bg-primary" : "border-2 border-primary bg-base-100"}`}
                />
                <span aria-hidden="true" className="absolute left-3 right-[-1.5rem] h-0.5 bg-base-300" />
                <span className="z-10 ml-2 bg-base-100 pr-2 text-sm font-bold tabular-nums">{card.label}</span>
              </div>
              <div className="flex flex-col gap-2">
                {card.registrations.length === 0 ? <span className="muted text-sm">No team recorded.</span> : null}
                {card.registrations.map((registration) => (
                  <Link
                    key={registration.registrationKey}
                    to={`/${card.seasonCode}/teams/${registration.team?.clubCode ?? registration.clubCode}`}
                    className="flex min-w-0 items-center gap-2 hover:text-primary"
                  >
                    {registration.team?.crestUrl ? <RevealImage src={registration.team.crestUrl} className="h-7 w-7 flex-none object-contain" /> : null}
                    <span className="truncate text-sm font-semibold">{registration.team?.name ?? registration.clubCode}</span>
                    {registration.active === false ? <span className="badge badge-ghost badge-xs">Former</span> : null}
                  </Link>
                ))}
                {card.registrations[0]?.positionName ? (
                  <span className="muted text-xs">
                    {card.registrations[0].positionName}
                    {card.registrations[0].dorsal ? ` · #${card.registrations[0].dorsal}` : ""}
                  </span>
                ) : null}
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </Panel>
  );
}

// ---- The tab ----

export default function PlayerCareerSection({ personKey, seasonCode }) {
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: () => getSeasons() });
  const seasons = seasonsQuery.data?.seasons;
  const careerQuery = useQuery({
    queryKey: ["player-career", personKey, seasons?.map((season) => season.seasonCode).join(",")],
    queryFn: () => fetchPlayerCareer(seasons, personKey),
    enabled: Boolean(seasons),
  });

  const cards = careerQuery.data;
  const derived = useMemo(() => {
    if (!cards) return null;
    const lines = cards.map(seasonLine);
    return { lines, averages: careerAverages(lines), totals: careerTotals(cards), highs: careerHighs(cards) };
  }, [cards]);

  if (seasonsQuery.isError) {
    return <AsyncState status="error" message="Could not load the seasons." onRetry={() => seasonsQuery.refetch()} />;
  }
  // A failed history has no cards to derive from, so the error is checked before the loading state.
  if (careerQuery.isError) {
    return <AsyncState status="error" message="Could not load season history." onRetry={() => careerQuery.refetch()} />;
  }
  if (seasonsQuery.isPending || careerQuery.isPending || !derived) {
    return <AsyncState status="loading" label="Loading season history" />;
  }
  if (cards.length === 0) return <EmptyText>No archived seasons found for this player.</EmptyText>;

  return (
    <motion.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
      <motion.section variants={sectionItem} aria-label="Career summary">
        <CareerSummary averages={derived.averages} totals={derived.totals} seasonCount={cards.length} />
      </motion.section>
      <motion.section variants={sectionItem} aria-label="Regular seasons">
        <SeasonTable cards={cards} lines={derived.lines} averages={derived.averages} currentSeasonCode={seasonCode} personKey={personKey} />
        <p className="muted mt-2 text-xs">
          Regular season, per game. ▲ and ▼ show the change from the season before; a season with fewer than 10 games is not compared. The career
          row weights each season by its games (shooting percentages by minutes played).
        </p>
      </motion.section>
      <motion.section variants={sectionItem} aria-label="Trends">
        <TrendGrid lines={derived.lines} />
      </motion.section>
      <motion.section className="grid grid-cols-1 gap-4 xl:grid-cols-2" variants={sectionItem} aria-label="Highs and profile">
        <CareerHighs highs={derived.highs} />
        <ProfileComparison cards={cards} personKey={personKey} />
      </motion.section>
      <motion.section variants={sectionItem} aria-label="Role">
        <RoleTable lines={derived.lines} />
      </motion.section>
      <motion.section variants={sectionItem} aria-label="Teams">
        <TeamsTimeline cards={cards} currentSeasonCode={seasonCode} />
      </motion.section>
    </motion.div>
  );
}
