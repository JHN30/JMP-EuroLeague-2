import { Link } from "react-router";
import { formatShortDate, formatTimeOfDay } from "../lib/format";
import Panel from "../lib/Panel";
import RevealImage from "../lib/RevealImage";
import { clubScore } from "./bracketModel";

const STAGE_NAMES = { PI: "Play-In", PO: "Playoffs", FF: "Final Four" };

function Side({ side, slot }) {
  if (!side.clubCode) {
    return <p className="muted italic">{side.placeholder}</p>;
  }
  const score = clubScore(slot, side.clubCode);
  const won = slot.series?.winnerClubCode === side.clubCode;
  return (
    <div className="flex min-w-0 items-center gap-3">
      {side.crestUrl ? <RevealImage src={side.crestUrl} className="h-12 w-12 flex-none object-contain" /> : <span className="h-12 w-12 flex-none" />}
      <div className="min-w-0">
        <p className={"truncate text-lg " + (won ? "font-black" : "font-bold")}>{side.name}</p>
        <p className="muted text-xs tabular-nums">
          {side.seed ? "Regular season: " + side.seed + (side.seed === 1 ? "st" : side.seed === 2 ? "nd" : side.seed === 3 ? "rd" : "th") : ""}
          {side.record ? " (" + side.record + ")" : ""}
        </p>
      </div>
      {score !== null ? <span className="ml-auto text-3xl font-black tabular-nums">{score}</span> : null}
    </div>
  );
}

function resultText(slot) {
  const entry = slot.series;
  if (!entry) return null;
  const winner = slot.participants.find((side) => side.clubCode === entry.winnerClubCode);
  if (!winner) return entry.games.length ? "In progress" : null;
  const loser = slot.participants.find((side) => side.clubCode !== entry.winnerClubCode);
  if (slot.stage === "PO") {
    const wins = clubScore(slot, winner.clubCode);
    const losses = clubScore(slot, loser.clubCode);
    return winner.name + " won the series " + wins + "-" + losses;
  }
  return winner.name + " won";
}

// The games of the selected matchup, or what is known of it before it is played.
export default function MatchupDetail({ slot, seasonCode }) {
  const clubs = slot.participants.filter((side) => side.clubCode);
  const byCode = new Map(clubs.map((side) => [side.clubCode, side]));
  const games = slot.series?.games ?? [];
  const comparable = clubs.length === 2 && slot.state !== "done";
  return (
    <Panel className="p-4">
      <p className="eyebrow mb-0.5">{STAGE_NAMES[slot.stage].toUpperCase() + " · " + slot.label.toUpperCase()}</p>
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <Side side={slot.participants[0]} slot={slot} />
        <Side side={slot.participants[1]} slot={slot} />
      </div>
      {resultText(slot) ? <p className="mb-3 font-semibold">{resultText(slot)}</p> : null}
      {slot.state === "projected" ? (
        <p className="muted mb-3 text-sm">Projected from the current standings: it changes as the regular season goes on.</p>
      ) : null}
      {games.length > 0 ? (
        <ul className="flex flex-col">
          {games.map((game, index) => {
            const local = byCode.get(game.localClubCode);
            const road = byCode.get(game.roadClubCode);
            const played = game.localScore != null && game.roadScore != null;
            return (
              <li key={game.gameCode} className="border-b border-base-300 last:border-0">
                <Link to={"/" + seasonCode + "/games/" + game.gameCode} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-field px-1 py-2 hover:bg-base-200">
                  <span className="muted text-xs">
                    Game {index + 1}
                    <br />
                    {formatShortDate(game.scheduledAt)}
                  </span>
                  <span className="min-w-0 truncate text-sm">
                    <span className={played && game.localScore > game.roadScore ? "font-bold" : ""}>{local?.short ?? game.localClubCode}</span>{" "}
                    <span className="muted">v</span>{" "}
                    <span className={played && game.roadScore > game.localScore ? "font-bold" : ""}>{road?.short ?? game.roadClubCode}</span>
                  </span>
                  <span className="font-bold tabular-nums">{played ? game.localScore + "-" + game.roadScore : formatTimeOfDay(game.scheduledAt)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : clubs.length < 2 ? (
        <p className="muted text-sm">Waiting for the results that decide who plays here.</p>
      ) : (
        <p className="muted text-sm">Not played yet. The higher seed has home court.</p>
      )}
      {comparable ? (
        <div className="mt-4">
          <Link
            to={"/" + seasonCode + "/compare?teamA=" + encodeURIComponent(clubs[0].clubCode) + "&teamB=" + encodeURIComponent(clubs[1].clubCode)}
            className="btn btn-outline btn-sm"
          >
            Compare {clubs[0].short} and {clubs[1].short}
          </Link>
        </div>
      ) : null}
    </Panel>
  );
}
