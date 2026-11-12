import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { Link } from "react-router";
import { getSeasons } from "../lib/api";
import AsyncState from "../lib/AsyncState";
import { PlayerCareerSkeleton } from "./PlayerPageSkeleton";
import EmptyText from "../lib/EmptyText";
import { formatDecimal } from "../lib/format";
import HomeAwayIcon from "../lib/HomeAwayIcon";
import { listContainer, listItem, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { ProfileComparison, TrendGrid } from "./PlayerCareerCharts";
import { CAREER_PHASES, careerAverages, careerHighs, careerTotals, clubStints, fetchPlayerCareer, fetchPlayerCareerAdvanced, seasonLine, withAdvanced } from "./careerData";

const PANEL_ID = "player-career-panel";
const TABLE_ID = "player-career-table";

// What the note under each section says the numbers count.
const PHASE_TEXT = { all: "Every phase", RS: "Regular season" };

// ---- Career summary: weighted averages and exact totals over the seasons in the view ----

function SummaryStat({ label, value, sub }) {
  return (
    <m.div className="rounded-box border border-base-300 bg-base-100 p-3" variants={listItem}>
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      <p className="mt-1 text-2xl font-black leading-none tabular-nums">{value}</p>
      {sub ? <p className="muted mt-1 text-xs">{sub}</p> : null}
    </m.div>
  );
}

function CareerSummary({ averages, totals, seasonCount, phase }) {
  const each = (key) => (averages[key] === null ? "—" : formatDecimal(averages[key]));
  return (
    <m.div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8" variants={listContainer} initial="hidden" animate="show">
      <SummaryStat label="Seasons" value={seasonCount} />
      <SummaryStat label="Games" value={totals.gp.toLocaleString()} sub={phase === "all" ? "every phase" : "regular season"} />
      <SummaryStat label="Minutes" value={totals.min.toLocaleString()} sub="played" />
      <SummaryStat label="Points" value={Math.round(totals.pts).toLocaleString()} sub="scored" />
      <SummaryStat label="PTS" value={each("pts")} sub="career per game" />
      <SummaryStat label="REB" value={each("reb")} sub="career per game" />
      <SummaryStat label="AST" value={each("ast")} sub="career per game" />
      <SummaryStat label="PIR" value={each("pir")} sub="career per game" />
    </m.div>
  );
}

// ---- Season table: every season in a row, as per-game numbers, totals or the role ----

const decimal = (value) => (value === null ? "—" : formatDecimal(value));
const percent = (value) => (value === null ? "—" : `${formatDecimal(value)}%`);
const whole = (value) => Math.round(value).toLocaleString();

// Each column says how to show a season (`cell`) and the career row (`career`, from the averages and the totals).
const perGameColumn = (key, label, format) => ({
  key,
  label,
  cell: (line) => format(line[key]),
  career: ({ averages }) => format(averages[key]),
});

// Under GP, how many of the games came after the regular season (only in the All games view, where they are counted).
function StageSplit({ stages }) {
  if (!stages || (stages.topSixteen === 0 && stages.postseason === 0)) return null;
  return (
    <span className="muted block text-[0.65rem] font-normal leading-tight">
      {stages.topSixteen > 0 ? <span className="block">{stages.topSixteen} Top 16</span> : null}
      {stages.postseason > 0 ? <span className="block">{stages.postseason} postseason</span> : null}
    </span>
  );
}

const gamesColumn = (gamesOf, careerGames) => ({
  key: "gp",
  label: "GP",
  title: "Games played. In All games, the games after the regular season are listed under the total.",
  cell: (line) => (
    <>
      {gamesOf(line) ?? "—"}
      <StageSplit stages={line.stages} />
    </>
  ),
  career: (career) => (
    <>
      {careerGames(career)}
      <StageSplit stages={career.totals.stages} />
    </>
  ),
});

const PER_GAME_COLUMNS = [
  gamesColumn((line) => line.gp, ({ averages }) => averages.gp),
  perGameColumn("min", "MIN", decimal),
  perGameColumn("pts", "PTS", decimal),
  perGameColumn("reb", "REB", decimal),
  perGameColumn("ast", "AST", decimal),
  perGameColumn("stl", "STL", decimal),
  perGameColumn("blk", "BLK", decimal),
  perGameColumn("pir", "PIR", decimal),
  perGameColumn("p2", "2P%", decimal),
  perGameColumn("p3", "3P%", decimal),
  perGameColumn("ft", "FT%", decimal),
  perGameColumn("ts", "TS%", decimal),
];

const totalColumn = (key, label) => ({ key, label, cell: (line) => whole(line.totals[key]), career: ({ totals }) => whole(totals[key]) });
const shotsColumn = (made, attempted, label) => ({
  key: made,
  label,
  cell: (line) => `${whole(line.totals[made])}-${whole(line.totals[attempted])}`,
  career: ({ totals }) => `${whole(totals[made])}-${whole(totals[attempted])}`,
});

const TOTAL_COLUMNS = [
  gamesColumn((line) => whole(line.totals.gp), ({ totals }) => whole(totals.gp)),
  totalColumn("min", "MIN"),
  totalColumn("pts", "PTS"),
  totalColumn("reb", "REB"),
  totalColumn("ast", "AST"),
  totalColumn("stl", "STL"),
  totalColumn("blk", "BLK"),
  totalColumn("pir", "PIR"),
  shotsColumn("m2", "a2", "2PM-A"),
  shotsColumn("m3", "a3", "3PM-A"),
  shotsColumn("mft", "aft", "FTM-A"),
];

// Where the points came from, as the share of the season's points from twos, threes and free throws.
const mixColumn = (key, label, title) => ({ key, label, title, cell: (line) => percent(line[key]), career: () => "" });

const ROLE_COLUMNS = [
  {
    key: "gs",
    label: "Started",
    title: "Games started out of games played",
    cell: (line) => (line.gs === null ? <span className="muted">—</span> : `${line.gs}/${line.gp ?? 0}`),
    career: () => "",
  },
  perGameColumn("min", "MIN", decimal),
  { ...perGameColumn("usg", "USG%", percent), title: "Share of the team's possessions the player used while on the floor" },
  mixColumn("mixTwos", "Pts from 2s", "Share of the points scored from two-pointers"),
  mixColumn("mixThrees", "Pts from 3s", "Share of the points scored from three-pointers"),
  mixColumn("mixFt", "Pts from FT", "Share of the points scored from free throws"),
];

const TABLE_VIEWS = [
  { key: "perGame", label: "Per game", columns: PER_GAME_COLUMNS },
  { key: "totals", label: "Totals", columns: TOTAL_COLUMNS },
  { key: "role", label: "Role", columns: ROLE_COLUMNS },
];

function tableNote(view, phase) {
  const counted = PHASE_TEXT[phase];
  if (view === "totals") return `${counted}, totals added up from the game logs. The career row is the sum.`;
  if (view === "role") {
    return `${counted}. Started is games started out of games played, USG% the share of the team's possessions used while on the floor, and the last three columns split the points by where they came from. The career row weights minutes and usage by games.`;
  }
  return `${counted}, per game. The career row weights each season by its games (shooting percentages by minutes played).`;
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

function SeasonTable({ lines, cardsByCode, averages, totals, phase, currentSeasonCode, personKey }) {
  const [view, setView] = useState("perGame");
  const { columns } = TABLE_VIEWS.find((entry) => entry.key === view);
  return (
    <>
      <Panel className="p-4">
        {/* The view tabs wrap under the title when the two don't fit side by side. */}
        <div className="flex flex-wrap items-start justify-between gap-x-4">
          <PanelHeader kicker="SEASON BY SEASON" title="Every season" />
          <TabStrip
            ariaLabel="Table view"
            panelId={TABLE_ID}
            activeKey={view}
            onChange={setView}
            className="mb-4 w-fit"
            tabs={TABLE_VIEWS.map(({ key, label }) => ({ key, label }))}
          />
        </div>
        <div id={TABLE_ID} className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Season by season table" tabIndex={0}>
          <table className="data-table-sticky table max-sm:table-sm">
            <thead>
              <tr>
                <th>Season</th>
                <th>Team</th>
                <th>Age</th>
                {columns.map((column) => (
                  <th key={column.key} title={column.title}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <m.tbody key={view} variants={listContainer} initial="hidden" animate="show">
              {lines.map((line) => {
                const calculated = line.calculated && view !== "totals";
                return (
                  <m.tr key={line.seasonCode} variants={listItem} className={line.seasonCode === currentSeasonCode ? "bg-base-200/60" : ""}>
                    <td className="whitespace-nowrap font-semibold">
                      <Link to={`/${line.seasonCode}/players/${personKey}`} className="link link-hover">
                        {line.label}
                      </Link>
                      {/* Below sm the badges sit under the season, so the pinned column stays about a season label wide. */}
                      {line.small || calculated ? (
                        <span className="mt-1 flex flex-col items-start gap-1 sm:ml-2 sm:mt-0 sm:inline-flex sm:flex-row">
                          {line.small ? <span className="badge badge-ghost badge-sm" title="Fewer than 10 games, so read these numbers with care">small sample</span> : null}
                          {calculated ? (
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
                      <ClubCrests registrations={cardsByCode.get(line.seasonCode).registrations} />
                    </td>
                    <td className="tabular-nums">{line.age ?? "—"}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="whitespace-nowrap tabular-nums">
                        {column.cell(line)}
                      </td>
                    ))}
                  </m.tr>
                );
              })}
            </m.tbody>
            {lines.length > 1 ? (
              <tfoot>
                <tr className="font-bold">
                  <td>Career</td>
                  <td />
                  <td />
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap tabular-nums">
                      {column.career({ averages, totals })}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Panel>
      <p className="muted mt-2 text-xs">{tableNote(view, phase)}</p>
    </>
  );
}

// ---- Career highs: the best single game for each stat, anywhere in the archive ----

function HighCard({ high }) {
  const { best } = high;
  if (!best) return null;
  const opponent = best.game.side === "local" ? best.game.roadTeam : best.game.localTeam;
  return (
    <m.div variants={listItem}>
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
    </m.div>
  );
}

function CareerHighs({ highs }) {
  return (
    <Panel className="p-4">
      <PanelHeader kicker="BEST SINGLE GAMES" title="Career highs" />
      <m.div className="grid grid-cols-2 gap-3 lg:grid-cols-4" variants={listContainer} initial="hidden" animate="show">
        {highs.map((high) => (
          <HighCard key={high.field} high={high} />
        ))}
      </m.div>
      <p className="muted mt-3 text-xs">Across every game in the archive, playoffs included. A tie goes to the most recent game.</p>
    </Panel>
  );
}

// ---- Teams: the clubs, one stop per stint ----

function TeamsTimeline({ stints, currentSeasonCode }) {
  return (
    <Panel className="p-4">
      <PanelHeader kicker="CLUBS" title="Teams by season" />
      <div className="overflow-x-auto overscroll-x-contain pb-2" role="region" aria-label="Clubs by season" tabIndex={0}>
        <m.ol className="flex gap-6" variants={listContainer} initial="hidden" animate="show">
          {stints.map((stint) => {
            const first = stint.seasons[0];
            const last = stint.seasons[stint.seasons.length - 1];
            const current = stint.seasons.some((card) => card.seasonCode === currentSeasonCode);
            return (
              <m.li key={stint.key} className="min-w-44 flex-none" variants={listItem}>
                <div className="relative mb-3 flex items-center">
                  <span aria-hidden="true" className={`z-10 h-3 w-3 flex-none rounded-full ${current ? "bg-primary" : "border-2 border-primary bg-base-100"}`} />
                  <span aria-hidden="true" className="absolute left-3 right-[-1.5rem] h-0.5 bg-base-300" />
                  <span className="z-10 ml-2 bg-base-100 pr-2 text-sm font-bold tabular-nums">
                    {first === last ? first.label : `${first.label} to ${last.label}`}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <Link to={`/${last.seasonCode}/teams/${stint.team?.clubCode ?? stint.clubCode}`} className="flex min-w-0 items-center gap-2 hover:text-primary">
                    {stint.team?.crestUrl ? <RevealImage src={stint.team.crestUrl} className="h-7 w-7 flex-none object-contain" /> : null}
                    <span className="truncate text-sm font-semibold">{stint.team?.name ?? stint.clubCode}</span>
                    {stint.former ? <span className="badge badge-ghost badge-xs">Former</span> : null}
                  </Link>
                  <span className="muted text-xs">
                    {stint.seasons.length} {stint.seasons.length === 1 ? "season" : "seasons"}
                    {stint.roles.length > 0 ? ` · ${stint.roles.join(", ")}` : ""}
                  </span>
                </div>
              </m.li>
            );
          })}
        </m.ol>
      </div>
    </Panel>
  );
}

// ---- The tab ----

export default function PlayerCareerSection({ personKey, seasonCode }) {
  const [phase, setPhase] = useState("all");
  const seasonsQuery = useQuery({ queryKey: ["seasons"], queryFn: () => getSeasons() });
  const seasons = seasonsQuery.data?.seasons;
  const careerQuery = useQuery({
    queryKey: ["player-career", personKey, seasons?.map((season) => season.seasonCode).join(",")],
    queryFn: () => fetchPlayerCareer(seasons, personKey),
    enabled: Boolean(seasons),
  });
  // PER, Win Shares and USG% load on their own: until they arrive, or if they fail, the tab shows everything else without them.
  const advancedQuery = useQuery({
    queryKey: ["player-career-advanced", personKey, seasons?.map((season) => season.seasonCode).join(",")],
    queryFn: () => fetchPlayerCareerAdvanced(seasons, personKey),
    enabled: Boolean(seasons),
  });

  const cards = careerQuery.data;
  const advancedBySeason = advancedQuery.data;
  // Highs and clubs cover every game and season; the rest follows the view.
  const career = useMemo(() => {
    if (!cards) return null;
    return { highs: careerHighs(cards), stints: clubStints(cards), cardsByCode: new Map(cards.map((card) => [card.seasonCode, card])) };
  }, [cards]);
  const derived = useMemo(() => {
    if (!cards) return null;
    // A season with no games in the view leaves the table, the trends, the radar and the count.
    const lines = withAdvanced(cards, advancedBySeason).map((card) => seasonLine(card, phase)).filter((line) => line.played);
    return { lines, averages: careerAverages(lines), totals: careerTotals(lines) };
  }, [cards, advancedBySeason, phase]);

  if (seasonsQuery.isError) {
    return <AsyncState status="error" message="Could not load the seasons." onRetry={() => seasonsQuery.refetch()} />;
  }
  // A failed history has no cards to derive from, so the error is checked before the loading state.
  if (careerQuery.isError) {
    return <AsyncState status="error" message="Could not load season history." onRetry={() => careerQuery.refetch()} />;
  }
  if (seasonsQuery.isPending || careerQuery.isPending || !derived) {
    return <AsyncState status="loading" label="Loading season history" skeleton={<PlayerCareerSkeleton />} />;
  }
  if (cards.length === 0) return <EmptyText>No archived seasons found for this player.</EmptyText>;

  const { lines } = derived;
  return (
    <>
      <TabStrip ariaLabel="Games counted" level={2} panelId={PANEL_ID} activeKey={phase} onChange={setPhase} className="mb-4 w-fit" tabs={CAREER_PHASES} />
      <TabPanel id={PANEL_ID} focusKey={phase} scroll={false}>
        <m.div className="flex flex-col gap-6" variants={sectionContainer} initial="hidden" animate="show">
          {lines.length === 0 ? (
            <m.div variants={sectionItem}>
              <EmptyText>{phase === "RS" ? "No regular-season games recorded." : "No games recorded."}</EmptyText>
            </m.div>
          ) : (
            <>
              <m.section variants={sectionItem} aria-label="Career summary">
                <CareerSummary averages={derived.averages} totals={derived.totals} seasonCount={lines.length} phase={phase} />
              </m.section>
              <m.section variants={sectionItem} aria-label="Seasons">
                {advancedQuery.isError ? (
                  <AsyncState compact status="error" errorClassName="mb-4" message="Could not load PER, win shares and USG%." onRetry={() => advancedQuery.refetch()} />
                ) : null}
                <SeasonTable
                  lines={lines}
                  cardsByCode={career.cardsByCode}
                  averages={derived.averages}
                  totals={derived.totals}
                  phase={phase}
                  currentSeasonCode={seasonCode}
                  personKey={personKey}
                />
              </m.section>
              <m.section variants={sectionItem} aria-label="Trends">
                <TrendGrid lines={lines} />
              </m.section>
            </>
          )}
          <m.section className="grid grid-cols-1 gap-4 xl:grid-cols-2" variants={sectionItem} aria-label="Highs and profile">
            <CareerHighs highs={career.highs} />
            {lines.length > 0 ? <ProfileComparison lines={lines} personKey={personKey} phase={phase} /> : null}
          </m.section>
          <m.section variants={sectionItem} aria-label="Teams">
            <TeamsTimeline stints={career.stints} currentSeasonCode={seasonCode} />
          </m.section>
        </m.div>
      </TabPanel>
    </>
  );
}
