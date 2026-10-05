import { motion } from "motion/react";
import { listContainer, listItem } from "../lib/motion";
import Matchup from "./Matchup";

// Where each cell sits on a wide screen. The Playoffs column is ordered so the two matchups that feed one semifinal are
// neighbours (1 v 8 over 4 v 5, 2 v 7 over 3 v 6); a semifinal then spans their two rows, and the final spans all four, which
// lines every winner up with the matchup it goes to. On a narrow screen the cells simply stack, stage by stage.
const PLACE = {
  pi1: "lg:col-start-1 lg:row-start-2",
  pi2: "lg:col-start-1 lg:row-start-3",
  pi3: "lg:col-start-1 lg:row-start-4",
  po1: "lg:col-start-2 lg:row-start-2 bk-out",
  po4: "lg:col-start-2 lg:row-start-3 bk-out",
  po2: "lg:col-start-2 lg:row-start-4 bk-out",
  po3: "lg:col-start-2 lg:row-start-5 bk-out",
  sf1: "lg:col-start-3 lg:row-start-2 lg:row-span-2 bk-in bk-out",
  sf2: "lg:col-start-3 lg:row-start-4 lg:row-span-2 bk-in bk-out",
  final: "lg:col-start-4 lg:row-start-2 lg:row-span-4 bk-in",
  third: "lg:col-start-4 lg:row-start-6",
};

const NOTES = {
  pi1: "Winner plays the 2nd seed",
  pi2: "Winner plays the loser of 7 v 8",
  pi3: "Winner plays the 1st seed",
};

const HEADINGS = [
  { id: "PI", title: "Play-In", sub: "Seeds 7 to 10", col: "lg:col-start-1" },
  { id: "PO", title: "Playoffs", sub: "Best of 5", col: "lg:col-start-2" },
  { id: "SF", title: "Final Four", sub: "Semifinals", col: "lg:col-start-3" },
  { id: "F", title: "Final", sub: "The champion", col: "lg:col-start-4" },
];

function Cell({ slot, selectedId, focusClub, onSelect, onFocusClub, note }) {
  return (
    <motion.div variants={listItem} className={"bk-cell " + PLACE[slot.id]}>
      <div className="w-full">
        <Matchup slot={slot} selected={selectedId === slot.id} focusClub={focusClub} onSelect={onSelect} onFocusClub={onFocusClub} />
        {note ? <p className="muted mt-1 hidden px-1 text-xs lg:block">{note}</p> : null}
      </div>
    </motion.div>
  );
}

function Heading({ heading }) {
  return (
    <div className={"lg:row-start-1 " + heading.col}>
      <p className="eyebrow mb-0.5">{heading.sub.toUpperCase()}</p>
      <h3 className="text-lg font-bold">{heading.title}</h3>
    </div>
  );
}

// The bracket: Play-In, Playoffs, Final Four and Final as columns joined by lines (stacked stage by stage on a phone).
export default function Bracket({ bracket, selectedId, focusClub, onSelect, onFocusClub }) {
  const cell = (slot) => <Cell key={slot.id} slot={slot} selectedId={selectedId} focusClub={focusClub} onSelect={onSelect} onFocusClub={onFocusClub} note={NOTES[slot.id]} />;
  const [pi1, pi2, pi3] = bracket.playIn;
  const [po1, po2, po3, po4] = bracket.playoffs;
  const [sf1, sf2] = bracket.semis;
  return (
    <motion.div
      className="bk-grid grid grid-cols-1 gap-x-9 gap-y-3 lg:grid-cols-4 lg:grid-rows-[auto_repeat(4,7.6rem)_auto]"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      <Heading heading={HEADINGS[0]} />
      {cell(pi1)}
      {cell(pi2)}
      {cell(pi3)}
      <Heading heading={HEADINGS[1]} />
      {cell(po1)}
      {cell(po4)}
      {cell(po2)}
      {cell(po3)}
      <Heading heading={HEADINGS[2]} />
      {cell(sf1)}
      {cell(sf2)}
      <Heading heading={HEADINGS[3]} />
      {cell(bracket.final)}
      {bracket.third ? cell(bracket.third) : null}
    </motion.div>
  );
}
