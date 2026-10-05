import { formatShortDate } from "../lib/format";
import Panel from "../lib/Panel";
import RevealImage from "../lib/RevealImage";
import { clubScore, placements } from "./bracketModel";

// The champion and where every other club finished, for a season that is over.
export default function ChampionPanel({ bracket, seasonLabel }) {
  const champion = bracket.champion;
  const rows = placements(bracket) ?? [];
  const finalSlot = bracket.final;
  const runnerUp = finalSlot.participants.find((side) => side.clubCode && side.clubCode !== champion.clubCode);
  const game = finalSlot.series?.games?.[0];
  const groups = [];
  for (const row of rows.filter((entry) => entry.order > 2)) {
    const last = groups[groups.length - 1];
    if (last && last.label === row.label) last.clubs.push(row.club);
    else groups.push({ label: row.label, clubs: [row.club] });
  }
  return (
    <Panel className="relative overflow-hidden p-5">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <div className="flex flex-wrap items-center gap-5">
        {champion.crestUrl ? <RevealImage src={champion.crestUrl} className="h-24 w-24 flex-none object-contain" /> : null}
        <div className="min-w-0">
          <p className="eyebrow mb-1">{seasonLabel ? "CHAMPION · " + seasonLabel.toUpperCase() : "CHAMPION"}</p>
          <h2 className="text-3xl font-black">{champion.name}</h2>
          {runnerUp ? (
            <p className="muted mt-1">
              Won the final against {runnerUp.name} {clubScore(finalSlot, champion.clubCode)}-{clubScore(finalSlot, runnerUp.clubCode)}
              {game?.scheduledAt ? " on " + formatShortDate(game.scheduledAt) : ""}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 grid gap-4 border-t border-base-300 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Runner-up", clubs: runnerUp ? [runnerUp] : [] }, ...groups].map((group) => (
          <div key={group.label}>
            <p className="muted mb-1.5 text-xs font-bold uppercase tracking-wide">{group.label}</p>
            <ul className="flex flex-col gap-1">
              {group.clubs.map((club) => (
                <li key={group.label + club.clubCode} className="flex items-center gap-2 text-sm">
                  {club.crestUrl ? <RevealImage src={club.crestUrl} className="h-5 w-5 flex-none object-contain" /> : <span className="h-5 w-5 flex-none" />}
                  <span className="truncate font-semibold">{club.short}</span>
                  {club.seed ? <span className="muted text-xs">({club.seed})</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}
