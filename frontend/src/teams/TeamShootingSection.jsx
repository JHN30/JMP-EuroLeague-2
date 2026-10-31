import AsyncState from "../lib/AsyncState";
import { SkeletonShooting } from "../lib/Skeleton";
import EmptyText from "../lib/EmptyText";
import { formatCount } from "../lib/format";
import { useSeasonShots } from "../lib/shootingData";
import ShootingStudio from "../games/ShootingStudio";

// Every opponent's shots are one side of the studio, under this code.
const OPPONENTS_CODE = "OPPONENTS";
const OPPONENTS = { clubCode: OPPONENTS_CODE, name: "Opponents", abbreviatedName: "Opponents", tvCode: "OPP", crestUrl: null };

const FREE_THROWS_TIP =
  "Free throws come from the box scores: every game of the stage, for the team or its opponents. The period, shot and play-context filters don't apply to them";

// The game page's shooting studio over a whole stage: the club's shots on the left and every opponent's shots against it on
// the right, as one side. Both courts are always whole teams (no player filter), so they compare like with like; the
// shared filters, the zone, quarter and play-context comparisons and the club's player table work as on the game page.
export default function TeamShootingSection({ seasonCode, phaseCode, stageName, team, games, teamStatsSummaryQuery }) {
  const playedGames = games.filter(
    (game) => game.phaseCode === phaseCode && game.played && game.localScore != null && game.roadScore != null,
  );
  const { loading, errored, shots, retry } = useSeasonShots(seasonCode, playedGames);

  if (playedGames.length === 0) {
    return <EmptyText>{`No played games yet in the ${stageName} to map shot locations from.`}</EmptyText>;
  }
  if (loading) {
    return (
      <AsyncState
        status="loading"
        label={`Aggregating ${formatCount(playedGames.length)} shooting charts`}
        skeleton={<SkeletonShooting />}
      />
    );
  }
  if (errored) {
    return <AsyncState status="error" message="Could not load season shot locations." onRetry={retry} />;
  }

  const sideShots = shots.map((shot) => (shot.clubCode === team.clubCode ? shot : { ...shot, clubCode: OPPONENTS_CODE }));
  const summary = teamStatsSummaryQuery.data;
  const freeThrows = (teamIndex) => {
    const side = teamIndex === 0 ? summary?.own : summary?.opponent;
    return side?.freeThrowsMade == null || side?.freeThrowsAttempted == null
      ? null
      : { made: side.freeThrowsMade, attempted: side.freeThrowsAttempted };
  };

  return (
    <ShootingStudio
      shots={sideShots}
      localTeam={team}
      roadTeam={OPPONENTS}
      freeThrows={freeThrows}
      freeThrowsTip={FREE_THROWS_TIP}
      playerFilterTeams={[]}
      playerTableTeams={[0]}
      initialPresentation="zones"
      title={`${team.abbreviatedName ?? team.name ?? team.clubCode} and its opponents, ${stageName}`}
      emptyText={`No shot locations recorded in the ${stageName} yet.`}
    />
  );
}
