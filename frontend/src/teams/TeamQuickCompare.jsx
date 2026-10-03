import { useState } from "react";
import { Link } from "react-router";
import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { TabPanel, TabStrip } from "../lib/TabStrip";
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
        {club.name}
      </span>
    </div>
  );
}

function clubFromTeam(team) {
  return { clubCode: team.clubCode, name: team.abbreviatedName ?? team.name ?? team.clubCode, crestUrl: team.crestUrl };
}

// Who this club can be set against: the next opponent, and the league leader (or the runner-up for the leader itself).
function compareTargets({ clubCode, nextOpponent, standings }) {
  const targets = [];
  if (nextOpponent?.clubCode) {
    targets.push({ key: "next", tabLabel: "Next opponent", club: clubFromTeam(nextOpponent) });
  }

  const leaderIsSelf = standings.find((row) => row.basic?.position === 1)?.clubCode === clubCode;
  const rival = standings.find((row) => row.basic?.position === (leaderIsSelf ? 2 : 1));
  if (rival && rival.clubCode !== clubCode) {
    const club = { clubCode: rival.clubCode, name: rival.clubName ?? rival.clubCode, crestUrl: rival.crestUrl };
    const tabLabel = leaderIsSelf ? "Runner-up" : "League leader";
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
export default function TeamQuickCompare({ seasonCode, clubCode, team, nextOpponent, standingsQuery, advancedQuery }) {
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
        <EmptyText>No upcoming game or league leader to compare against in this phase.</EmptyText>
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
            to={`/${seasonCode}/comparisons?teamA=${encodeURIComponent(clubCode)}&teamB=${encodeURIComponent(active.club.clubCode)}`}
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
          activeKey={active.key}
          onChange={setSelectedKey}
          className="mb-3 w-fit"
          tabs={targets.map((target) => ({ key: target.key, label: target.tabLabel }))}
        />
      ) : (
        <p className="eyebrow mb-3">{active.tabLabel}</p>
      )}
      <TabPanel id="team-compare-panel" focusKey={active.key} scroll={false}>
        {own && other ? (
          <>
            <div className="mb-1 grid grid-cols-2 gap-4">
              <div className="flex justify-end">
                <ClubLabel club={self} />
              </div>
              <ClubLabel club={active.club} />
            </div>
            {COMPARE_ROWS.map(({ field, format, ...row }) => (
              <ComparisonRow
                key={row.label}
                {...row}
                rawA={own[field]}
                rawB={other[field]}
                displayA={format(own[field])}
                displayB={format(other[field])}
              />
            ))}
            <p className="muted mt-3 text-sm">Ratings are per 100 possessions. The highlighted side has the edge.</p>
          </>
        ) : (
          <EmptyText>Advanced numbers for this comparison aren&apos;t available yet in this phase.</EmptyText>
        )}
      </TabPanel>
    </Panel>
  );
}
