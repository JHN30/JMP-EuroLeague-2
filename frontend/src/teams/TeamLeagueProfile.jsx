import { motion } from "motion/react";
import AsyncState from "../lib/AsyncState";
import EmptyText from "../lib/EmptyText";
import HeaderTip from "../lib/HeaderTip";
import { barFill } from "../lib/motion";
import Panel from "../lib/Panel";
import PanelHeader from "../lib/PanelHeader";
import { ordinal, PROFILE_GROUPS, rankOf, rankTier } from "./teamLeague";

function ProfileRow({ metric, own, standing }) {
  const tier = rankTier(standing);
  // Best in the league fills the bar; last place leaves a sliver so it still reads as a bar.
  const fill = Math.max(5, ((standing.of - standing.rank + 1) / standing.of) * 100);

  return (
    <li className="py-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <HeaderTip tip={metric.tip}>{metric.label}</HeaderTip>
        <span className="flex items-baseline gap-2">
          <span className="font-semibold tabular-nums">{metric.format(own[metric.field])}</span>
          <span className={`w-10 text-right text-xs font-bold tabular-nums ${tier.text}`}>{ordinal(standing.rank)}</span>
        </span>
      </div>
      <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-base-300">
        <motion.div
          className={`h-full origin-left rounded-full ${tier.bar}`}
          style={{ width: `${fill}%` }}
          {...barFill}
        />
      </div>
    </li>
  );
}

// Where a club sits among all clubs on ten offensive and defensive numbers, so the Overview says what the club is
// good and bad at rather than only how it has been playing. `advancedQuery` is the league-wide advanced standings.
export default function TeamLeagueProfile({ advancedQuery, clubCode, team }) {
  const name = team.abbreviatedName ?? team.name ?? clubCode;

  if (advancedQuery.isPending) return <AsyncState status="loading" label="Loading the league profile" />;
  if (advancedQuery.isError) {
    return <AsyncState status="error" message="Could not load the league profile." onRetry={() => advancedQuery.refetch()} />;
  }

  const rows = (advancedQuery.data?.standings ?? []).filter((row) => row.gamesPlayed > 0);
  const own = rows.find((row) => row.clubCode === clubCode);
  if (!own) {
    return (
      <Panel as="section" className="p-4">
        <PanelHeader kicker="PROFILE" title={`Where ${name} ranks in the league`} />
        <EmptyText>No league rankings yet for this phase.</EmptyText>
      </Panel>
    );
  }

  const groups = PROFILE_GROUPS.map((group) => ({
    ...group,
    metrics: group.metrics
      .map((metric) => ({ metric, standing: rankOf(rows, clubCode, metric.field, metric.higherIsBetter) }))
      .filter((entry) => entry.standing),
  }));
  const ranked = groups.flatMap((group) => group.metrics);
  const strongest = ranked.reduce((best, entry) => (!best || entry.standing.rank < best.standing.rank ? entry : best), null);
  const weakest = ranked.reduce((worst, entry) => (!worst || entry.standing.rank > worst.standing.rank ? entry : worst), null);
  const showExtremes = strongest && weakest && strongest.standing.rank !== weakest.standing.rank;
  const extremes = showExtremes ? (
    <>
      <span className="stat-badge stat-badge-positive">
        Strongest: {strongest.metric.label} · {ordinal(strongest.standing.rank)}
      </span>
      <span className="stat-badge stat-badge-negative">
        Weakest: {weakest.metric.label} · {ordinal(weakest.standing.rank)}
      </span>
    </>
  ) : null;

  return (
    <Panel as="section" className="p-4">
      <PanelHeader
        kicker="PROFILE"
        title={`Where ${name} ranks in the league`}
        trailing={extremes ? <div className="flex flex-wrap justify-end gap-2 max-sm:hidden">{extremes}</div> : null}
      />
      {/* Below sm the badges sit under the title, where they have the panel's whole width; the other copy is hidden then. */}
      {extremes ? <div className="-mt-2 mb-4 flex flex-wrap gap-2 sm:hidden">{extremes}</div> : null}
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h3 className="muted mb-1 text-xs font-bold tracking-wide uppercase">{group.title}</h3>
            <ul>
              {group.metrics.map(({ metric, standing }) => (
                <ProfileRow key={metric.field} metric={metric} own={own} standing={standing} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="muted mt-3 text-sm">
        Ranked among the {rows.length} clubs that have played. A full bar is the best in the league on that number;
        green is the top third and red the bottom third.
      </p>
    </Panel>
  );
}
