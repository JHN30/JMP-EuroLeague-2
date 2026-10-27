import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import { listContainer, listItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import ShortLabel from "../lib/ShortLabel";
import { TabPanel, TabStrip } from "../lib/TabStrip";
import { isGroupedTable } from "../standings/standingsGroups";
import { COMPARE_ROWS } from "./teamLeague";

function ClubLabel({ club }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {club.crestUrl ? (
        <img
          src={club.crestUrl}
          alt=""
          className="h-6 w-6 flex-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="truncate font-semibold" title={club.name}>
        {club.tvCode && club.tvCode !== club.name ? <ShortLabel short={club.tvCode} full={club.name} /> : club.name}
      </span>
    </div>
  );
}

function clubFromTeam(team) {
  return { clubCode: team.clubCode, name: team.abbreviatedName ?? team.name ?? team.clubCode, tvCode: team.tvCode, crestUrl: team.crestUrl };
}

// Who this club can be set against: the next opponent, and the league leader (or the runner-up for the leader itself).
function compareTargets({ clubCode, nextOpponent, standings: tableStandings }) {
  // In a grouped table the leader is the leader of the club's own group; positions repeat across groups.
  const grouped = isGroupedTable(tableStandings);
  const ownGroup = tableStandings.find((row) => row.clubCode === clubCode)?.groupName;
  const standings = grouped ? tableStandings.filter((row) => row.groupName === ownGroup) : tableStandings;
  const targets = [];
  if (nextOpponent?.clubCode) {
    targets.push({ key: "next", tabLabel: "Next opponent", club: clubFromTeam(nextOpponent) });
  }

  const leaderIsSelf = standings.find((row) => row.basic?.position === 1)?.clubCode === clubCode;
  const rival = standings.find((row) => row.basic?.position === (leaderIsSelf ? 2 : 1));
  if (rival && rival.clubCode !== clubCode) {
    const club = { clubCode: rival.clubCode, name: rival.clubName ?? rival.clubCode, tvCode: rival.clubTvCode, crestUrl: rival.crestUrl };
    const tabLabel = leaderIsSelf ? "Runner-up" : grouped ? "Group leader" : "League leader";
    if (targets[0]?.club.clubCode === rival.clubCode) {
      targets[0].tabLabel = `Next opponent · ${tabLabel.toLowerCase()}`;
    } else {
      targets.push({ key: "rival", tabLabel, club });
    }
  }
  return targets;
}

// The club set against its next opponent or the league leader on the numbers that decide games. Both clubs' numbers come
// from the league-wide advanced standings (`advancedQuery`).
export default function TeamQuickCompare({ seasonCode, clubCode, team, nextOpponent, standingsQuery, advancedQuery, stageName }) {
  const [selectedKey, setSelectedKey] = useState("next");

  if (advancedQuery.isPending || standingsQuery.isPending) {
    return <AsyncState status="loading" label="Loading the comparison" />;
  }
  if (advancedQuery.isError) {
    return <AsyncState status="error" message="Could not load the comparison." onRetry={() => advancedQuery.refetch()} />;
  }

  const standings = standingsQuery.data?.standings ?? [];
  const targets = compareTargets({ clubCode, nextOpponent, standings });
  const active = targets.find((target) => target.key === selectedKey) ?? targets[0];
  const self = clubFromTeam(team);

  if (!active) {
    return (
      <Panel as="section" className="p-4">
        <PanelHeader kicker="COMPARE" title="Quick comparison" />
        <EmptyText>{`No upcoming game or league leader to compare against in the ${stageName}.`}</EmptyText>
      </Panel>
    );
  }

  const rows = advancedQuery.data?.standings ?? [];
  const own = rows.find((row) => row.clubCode === clubCode);
  const other = rows.find((row) => row.clubCode === active.club.clubCode);

  return (
    <Panel as="section" className="flex flex-col p-4">
      <PanelHeader
        kicker="COMPARE"
        title="Quick comparison"
        trailing={
          <Link
            to={`/${seasonCode}/compare?teamA=${encodeURIComponent(clubCode)}&teamB=${encodeURIComponent(active.club.clubCode)}`}
            className="panel-link whitespace-nowrap"
          >
            Full comparison →
          </Link>
        }
      />
      {targets.length > 1 ? (
        <TabStrip
          ariaLabel="Compare against"
          panelId="team-compare-panel"
          scrolling
          activeKey={active.key}
          onChange={setSelectedKey}
          className="mb-3 w-fit"
          tabs={targets.map((target) => ({ key: target.key, label: target.tabLabel }))}
        />
      ) : (
        <p className="eyebrow mb-3">{active.tabLabel}</p>
      )}
      <TabPanel id="team-compare-panel" focusKey={active.key} scroll={false} className="flex flex-1 flex-col">
        {own && other ? (
          // Keyed by the chosen opponent, so each switch replays the entrance instead of swapping numbers in place. The rows
          // grow to fill the panel, so it ends level with the form and fixtures column beside it.
          <motion.div key={active.key} className="flex flex-1 flex-col" variants={listContainer} initial="hidden" animate="show">
            <motion.div variants={listItem} className="mb-1 grid grid-cols-2 gap-4">
              <div className="flex justify-end">
                <ClubLabel club={self} />
              </div>
              <ClubLabel club={active.club} />
            </motion.div>
            {COMPARE_ROWS.map(({ field, format, ...row }) => (
              <ComparisonRow
                key={row.label}
                {...row}
                animated
                inline
                rawA={own[field]}
                rawB={other[field]}
                displayA={format(own[field])}
                displayB={format(other[field])}
              />
            ))}
            <motion.p variants={listItem} className="muted mt-3 text-sm">
              Ratings are per 100 possessions. The highlighted side has the edge.
            </motion.p>
          </motion.div>
        ) : (
          <EmptyText>{`Advanced numbers for this comparison aren't available yet for the ${stageName}.`}</EmptyText>
        )}
      </TabPanel>
    </Panel>
  );
}
