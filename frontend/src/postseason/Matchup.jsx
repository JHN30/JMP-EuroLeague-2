import RevealImage from "../lib/RevealImage";
import { clubScore } from "./bracketModel";

const FORMATS = { PI: "One game", PO: "Best of 5", FF: "One game" };

function Crest({ url }) {
  return url ? <RevealImage src={url} className="h-6 w-6 flex-none object-contain" /> : <span className="h-6 w-6 flex-none" />;
}

function TeamRow({ slot, side, onSelect, onFocusClub }) {
  const winnerCode = slot.series?.winnerClubCode ?? null;
  const decided = Boolean(winnerCode);
  const won = decided && winnerCode === side.clubCode;
  const score = clubScore(slot, side.clubCode);
  return (
    <button
      type="button"
      onClick={() => onSelect(slot.id)}
      onMouseEnter={() => onFocusClub(side.clubCode)}
      onFocus={() => onFocusClub(side.clubCode)}
      onBlur={() => onFocusClub(null)}
      aria-label={side.name + ", " + slot.label}
      className={
        "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-base-200 " +
        (won ? "bg-success/10 font-bold" : decided ? "opacity-60" : "")
      }
    >
      <span className="muted w-6 flex-none text-right text-xs font-bold tabular-nums" title="Regular-season place">
        {side.seed ?? ""}
      </span>
      <Crest url={side.crestUrl} />
      <span className="min-w-0 flex-1 truncate text-sm">{side.short}</span>
      {score !== null ? <span className="flex-none text-base font-black tabular-nums">{score}</span> : null}
    </button>
  );
}

// One matchup of the bracket: the two sides with their regular-season places, and the score once there is one. Hovering a club
// lets the rest of the bracket pick out where that club plays.
export default function Matchup({ slot, selected, focusClub, onSelect, onFocusClub }) {
  const involved = focusClub ? slot.participants.some((side) => side.clubCode === focusClub) : true;
  const live = slot.state === "live";
  return (
    <div
      role="group"
      aria-label={slot.label}
      onMouseLeave={() => onFocusClub(null)}
      className={
        "w-full overflow-hidden rounded-box border bg-base-100 transition-opacity " +
        (selected ? "border-primary shadow-lg shadow-primary/10 " : "border-base-300 ") +
        (slot.state === "projected" ? "border-dashed " : "") +
        (involved ? "" : "opacity-35")
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-base-300 px-3 py-1">
        <span className="muted text-[0.7rem] font-bold uppercase tracking-wide">{slot.label}</span>
        <span className="flex items-center gap-1.5 text-[0.7rem]">
          {live ? <span className="badge badge-warning badge-xs">Live</span> : null}
          {slot.state === "projected" ? <span className="badge badge-ghost badge-xs">Projected</span> : null}
          <span className="muted">{FORMATS[slot.stage]}</span>
        </span>
      </div>
      {slot.participants.map((side, index) =>
        side.clubCode ? (
          <TeamRow key={side.clubCode} slot={slot} side={side} onSelect={onSelect} onFocusClub={onFocusClub} />
        ) : (
          <div key={"placeholder-" + index} className="muted flex items-center gap-2 px-3 py-2 text-sm italic">
            <span className="w-6 flex-none" />
            <span className="h-6 w-6 flex-none rounded-full border border-dashed border-base-300" />
            <span className="truncate">{side.placeholder}</span>
          </div>
        ),
      )}
    </div>
  );
}
