import AsyncState from "../lib/AsyncState";
import ComparisonRow from "../lib/ComparisonRow";
import EmptyText from "../lib/EmptyText";
import Panel from "../lib/Panel";
import TeamLabel from "./TeamLabel";
import { scoringProfileRows } from "./teamFlow";

// The team labels above a column of mirrored rows: the local team on the left, the road team on the right.
function TeamHeader({ localTeam, roadTeam, className = "" }) {
  return (
    <div className={`mb-2 grid grid-cols-2 gap-4 ${className}`}>
      <div className="flex justify-end">
        <TeamLabel team={localTeam} />
      </div>
      <TeamLabel team={roadTeam} />
    </div>
  );
}

// How each team scored and how the game was led, from the pipeline's per-game team tables. Its own loading, error and
// unavailable states, so trouble here never hides the rest of the Team comparison tab.
export default function ScoringProfile({ teamFlowQuery, localTeam, roadTeam }) {
  if (teamFlowQuery.isLoading) return <AsyncState status="loading" label="Loading the scoring profile" compact />;
  if (teamFlowQuery.isError) {
    return <AsyncState status="error" message="Could not load the scoring profile." onRetry={() => teamFlowQuery.refetch()} />;
  }
  const rows = teamFlowQuery.data?.available ? scoringProfileRows(teamFlowQuery.data.teams) : [];
  if (rows.length === 0) return <EmptyText>The scoring profile isn't available for this game yet.</EmptyText>;

  return (
    <Panel className="p-4">
      <div className="grid gap-x-10 lg:grid-cols-2" data-testid="scoring-profile-grid">
        <TeamHeader localTeam={localTeam} roadTeam={roadTeam} />
        <TeamHeader localTeam={localTeam} roadTeam={roadTeam} className="hidden lg:grid" />
        {rows.map(({ key, ...row }) => (
          <ComparisonRow key={key} {...row} />
        ))}
      </div>
    </Panel>
  );
}
