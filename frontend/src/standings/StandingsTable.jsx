import { Fragment } from "react";
import { formatCount, formatSignedDecimal, formatSignedDiff } from "../lib/format";
import HeaderTip from "../lib/HeaderTip";
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

function sortForView(standings, view) {
  if (view === "overall") return standings;
  const field = VIEW_RECORD_FIELD[view];
  const ranked = [];
  const unranked = [];
  for (const entry of standings) {
    const pct = recordWinPct(entry.basic?.[field]);
    if (pct === null) {
      unranked.push(entry);
    } else {
      ranked.push({ entry, pct });
    }
  }
  ranked.sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    const aDiff = a.entry.basic?.pointsDifference ?? -Infinity;
    const bDiff = b.entry.basic?.pointsDifference ?? -Infinity;
    return bDiff - aDiff;
  });
  return [...ranked.map((r) => r.entry), ...unranked];
}

function tierForPosition(position) {
  if (position == null) return null;
  if (position <= 6) return "postseason";
  if (position <= 10) return "playin";
  return "out";
}

const TIER_LABELS = {
  postseason: "Direct to playoffs",
  playin: "Play-in tournament",
  out: "Out of playoff contention",
};

function TierRow({ tier, columnCount }) {
  return (
    <AnimatedRow layout="position" className={`tier-row tier-row-${tier}`}>
      <td colSpan={columnCount}>
        <span>{TIER_LABELS[tier]}</span>
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

function OverviewTable({ standings, seasonCode, view, showTiers, netByClub, shortNames }) {
  const sorted = sortForView(standings, view);
  const tiersActive = showTiers && view === "overall";
  const tiers = tiersActive ? sorted.map((entry) => tierForPosition(entry.basic?.position)) : [];
  const columnCount = 14;

  return (
    <table className="table standings-table pinned-table">
      <thead>
        <tr>
          <th><HeaderTip tip="Position: rank in the standings">#</HeaderTip></th>
          <th>Team</th>
          <th className="hidden sm:table-cell"><HeaderTip tip="Games played">GP</HeaderTip></th>
          <th><HeaderTip tip="Wins">W</HeaderTip></th>
          <th><HeaderTip tip="Losses">L</HeaderTip></th>
          <th><HeaderTip tip="Win percentage: wins divided by games played">PCT</HeaderTip></th>
          <th><HeaderTip tip="Points for: total points scored">PF</HeaderTip></th>
          <th><HeaderTip tip="Points against: total points allowed">PA</HeaderTip></th>
          <th><HeaderTip tip="Points difference: points for minus points against">DIFF</HeaderTip></th>
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

          return (
            <Fragment key={entry.clubCode}>
              {showTierHeader ? <TierRow tier={tier} columnCount={columnCount} /> : null}
              <AnimatedRow layout="position">
                <td>
                  <PositionCell position={displayRank} qualified={entry.basic?.qualified} />
                  <TieBreakFlag entry={entry} />
                </td>
                <td>
                  <ClubCell entry={entry} seasonCode={seasonCode} shortName={shortNames?.get(entry.clubCode)} />
                </td>
                <td className="hidden sm:table-cell">{entry.basic?.gamesPlayed ?? "-"}</td>
                <td>{entry.basic?.gamesWon ?? "-"}</td>
                <td>{entry.basic?.gamesLost ?? "-"}</td>
                <td>{entry.basic?.winPercentage ?? "-"}</td>
                <td>{formatCount(entry.basic?.pointsFor)}</td>
                <td>{formatCount(entry.basic?.pointsAgainst)}</td>
                <td className="font-semibold">{formatSignedDiff(entry.basic?.pointsDifference)}</td>
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
  netByClub,
  shortNames,
  breakdown = "overview",
  resultsQuery,
  resultsByClub,
  gameFlowQuery,
}) {
  if (breakdown === "streaks") {
    return <StreaksFormView standings={standings} seasonCode={seasonCode} shortNames={shortNames} resultsQuery={resultsQuery} resultsByClub={resultsByClub} />;
  }
  if (breakdown === "margins") {
    return <MarginsView standings={standings} seasonCode={seasonCode} shortNames={shortNames} resultsQuery={resultsQuery} resultsByClub={resultsByClub} netByClub={netByClub} />;
  }
  if (breakdown === "aheadBehind") {
    return (
      <AheadBehindView
        standings={standings}
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
          netByClub={netByClub}
          shortNames={shortNames}
        />
      </ScrollingTable>
      <StandingsFooterBadges />
    </Panel>
  );
}
