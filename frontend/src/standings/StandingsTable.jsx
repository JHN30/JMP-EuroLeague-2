import { Fragment } from "react";
import { formatCount, formatSignedDecimal, formatSignedDiff } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
import { tierForPosition } from "../lib/seasonFormat";
import Panel from "../lib/Panel";
import { AnimatedBody, AnimatedRow } from "./motionTable";
import ScrollingTable from "./ScrollingTable";
import AheadBehindView from "./AheadBehindView";
import MarginsView from "./MarginsView";
import StreaksFormView from "./StreaksFormView";
import { ClubCell, FormCell, PositionCell, StandingsFooterBadges } from "./standingsCells";

function recordWinPct(record) {
  if (typeof record !== "string") return null;
  const match = record.match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  const wins = Number(match[1]);
  const losses = Number(match[2]);
  const total = wins + losses;
  return total > 0 ? wins / total : null;
}

const VIEW_RECORD_FIELD = {
  home: "homeRecord",
  away: "awayRecord",
  last10: "lastTenRecord",
};

function sortForView(standings, view, splitByClub) {
  if (view === "overall") return standings;
  const field = VIEW_RECORD_FIELD[view];
  const ranked = [];
  const unranked = [];
  for (const entry of standings) {
    const split = splitByClub?.get(entry.clubCode);
    const pct = splitByClub ? (split?.gamesPlayed ? split.gamesWon / split.gamesPlayed : null) : recordWinPct(entry.basic?.[field]);
    if (pct === null) {
      unranked.push(entry);
    } else {
      ranked.push({ entry, pct });
    }
  }
  ranked.sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    const diffOf = (entry) => (splitByClub ? splitByClub.get(entry.clubCode)?.pointsDifference : entry.basic?.pointsDifference) ?? -Infinity;
    const aDiff = diffOf(a.entry);
    const bDiff = diffOf(b.entry);
    return bDiff - aDiff;
  });
  return [...ranked.map((r) => r.entry), ...unranked];
}

const TIER_LABELS = {
  postseason: "Direct to playoffs",
  playin: "Play-in tournament",
  out: "Out of playoff contention",
};

function TierRow({ tier, columnCount, labels = TIER_LABELS }) {
  return (
    <AnimatedRow layout="position" className={`tier-row tier-row-${tier}`}>
      <td colSpan={columnCount}>
        <span>{labels[tier]}</span>
      </td>
    </AnimatedRow>
  );
}

function TieBreakFlag({ entry }) {
  if (!entry.basic || !entry.calendar || entry.basic.position === entry.calendar.position) return null;
  return (
    <span className="ml-1">
      <HeaderTip tip={`Calendar ranking places this team #${entry.calendar.position}`}>
        <span className="badge badge-xs badge-warning">*</span>
      </HeaderTip>
    </span>
  );
}

// The Net rtg column follows the selected view: overall, or the home, away, or last-10 net rating.
const VIEW_NET_FIELD = {
  overall: "netRating",
  home: "homeNetRating",
  away: "awayNetRating",
  last10: "last10NetRating",
};

// Header tips for the figure columns; the Home and Away views say the figures cover only those games.
function figureTips(view) {
  const only = view === "home" ? " in home games only" : view === "away" ? " in away games only" : "";
  return {
    gp: `Games played${only}`,
    w: `Wins${only}`,
    l: `Losses${only}`,
    pct: `Win percentage: wins divided by games played${only}`,
    pf: `Points for: total points scored${only}`,
    pa: `Points against: total points allowed${only}`,
    diff: `Points difference: points for minus points against${only}`,
  };
}

function OverviewTable({ standings, seasonCode, view, showTiers, tierLines, tierLabels, netByClub, shortNames, showQualification, splitByClub }) {
  const sorted = sortForView(standings, view, splitByClub);
  // The Home and Away views count every figure column from the club's home (or away) games only.
  const splitView = view === "home" || view === "away";
  const tips = figureTips(view);
  // The tier rows follow the season's qualification lines (from its format); without them no tier row is drawn.
  const tiersActive = showTiers && view === "overall" && Boolean(tierLines);
  const tiers = tiersActive ? sorted.map((entry) => tierForPosition(entry.basic?.position, tierLines)) : [];
  const columnCount = 14;

  return (
    <table className="table standings-table pinned-table">
      <thead>
        <tr>
          <th><HeaderTip tip="Position: rank in the standings">#</HeaderTip></th>
          <th>Team</th>
          <th className="hidden sm:table-cell"><HeaderTip tip={tips.gp}>GP</HeaderTip></th>
          <th><HeaderTip tip={tips.w}>W</HeaderTip></th>
          <th><HeaderTip tip={tips.l}>L</HeaderTip></th>
          <th><HeaderTip tip={tips.pct}>PCT</HeaderTip></th>
          <th><HeaderTip tip={tips.pf}>PF</HeaderTip></th>
          <th><HeaderTip tip={tips.pa}>PA</HeaderTip></th>
          <th><HeaderTip tip={tips.diff}>DIFF</HeaderTip></th>
          <th><HeaderTip tip="Home record: wins and losses at home">Home</HeaderTip></th>
          <th><HeaderTip tip="Away record: wins and losses on the road">Away</HeaderTip></th>
          <th><HeaderTip tip="Last 10: record in the last 10 games">L10</HeaderTip></th>
          <th><HeaderTip tip="Form: results of the most recent games">Form</HeaderTip></th>
          <th><HeaderTip tip="Net rating: points scored minus allowed per 100 possessions, for the selected view">Net rtg</HeaderTip></th>
        </tr>
      </thead>
      <AnimatedBody>
        {sorted.map((entry, index) => {
          const position = entry.basic?.position;
          const tier = tiersActive ? tiers[index] : null;
          const showTierHeader = tiersActive && tier !== null && tier !== tiers[index - 1];
          const displayRank = view === "overall" ? position : index + 1;
          // Until the results arrive (or when they fail) a split view shows dashes, never the overall figures.
          const figures = splitView ? splitByClub?.get(entry.clubCode) : entry.basic;

          return (
            <Fragment key={entry.clubCode}>
              {showTierHeader ? <TierRow tier={tier} columnCount={columnCount} labels={tierLabels} /> : null}
              <AnimatedRow layout="position">
                <td>
                  <PositionCell position={displayRank} qualified={showQualification && entry.basic?.qualified} />
                  <TieBreakFlag entry={entry} />
                </td>
                <td>
                  <ClubCell entry={entry} seasonCode={seasonCode} shortName={shortNames?.get(entry.clubCode)} />
                  {entry.bestSixth ? <span className="badge badge-xs badge-secondary ml-1 whitespace-nowrap" title="Best sixth-placed club">Best 6th<span className="sr-only">, best sixth-placed club, qualified</span></span> : null}
                </td>
                <td className="hidden sm:table-cell">{figures?.gamesPlayed ?? "-"}</td>
                <td>{figures?.gamesWon ?? "-"}</td>
                <td>{figures?.gamesLost ?? "-"}</td>
                <td>{figures?.winPercentage ?? "-"}</td>
                <td>{formatCount(figures?.pointsFor)}</td>
                <td>{formatCount(figures?.pointsAgainst)}</td>
                <td className="font-semibold">{formatSignedDiff(figures?.pointsDifference)}</td>
                <td>{entry.basic?.homeRecord ?? "-"}</td>
                <td>{entry.basic?.awayRecord ?? "-"}</td>
                <td>{entry.basic?.lastTenRecord ?? "-"}</td>
                <td>
                  <FormCell form={entry.form} />
                </td>
                <td className="font-semibold tabular-nums">
                  {formatSignedDecimal(netByClub?.get(entry.clubCode)?.[VIEW_NET_FIELD[view]])}
                </td>
              </AnimatedRow>
            </Fragment>
          );
        })}
      </AnimatedBody>
    </table>
  );
}

export default function StandingsTable({
  standings,
  seasonCode,
  view = "overall",
  showTiers = false,
  showQualification = true,
  tiers = null,
  tierLabels,
  netByClub,
  shortNames,
  splitByClub = null,
  breakdown = "overview",
  resultsQuery,
  resultsByClub,
  gameFlowQuery,
}) {
  // The source's live qualification flags remain stored, but cancellation cannot turn them into advancement badges.
  const displayStandings = showQualification ? standings : standings.map((entry) => ({ ...entry, basic: { ...entry.basic, qualified: false } }));
  if (breakdown === "streaks") {
    return <StreaksFormView standings={displayStandings} seasonCode={seasonCode} shortNames={shortNames} resultsQuery={resultsQuery} resultsByClub={resultsByClub} />;
  }
  if (breakdown === "margins") {
    return <MarginsView standings={displayStandings} seasonCode={seasonCode} shortNames={shortNames} resultsQuery={resultsQuery} resultsByClub={resultsByClub} netByClub={netByClub} />;
  }
  if (breakdown === "aheadBehind") {
    return (
      <AheadBehindView
        standings={displayStandings}
        seasonCode={seasonCode}
        shortNames={shortNames}
        resultsQuery={resultsQuery}
        resultsByClub={resultsByClub}
        gameFlowQuery={gameFlowQuery}
      />
    );
  }

  return (
    <Panel className="p-2">
      <ScrollingTable>
        <OverviewTable
          standings={standings}
          seasonCode={seasonCode}
          view={view}
          showTiers={showTiers}
          showQualification={showQualification}
          tierLines={tiers}
          tierLabels={tierLabels}
          netByClub={netByClub}
          shortNames={shortNames}
          splitByClub={splitByClub}
        />
      </ScrollingTable>
      <StandingsFooterBadges showQualification={showQualification} />
    </Panel>
  );
}
