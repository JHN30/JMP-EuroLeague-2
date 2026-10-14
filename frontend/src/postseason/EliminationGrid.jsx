import { Fragment } from "react";
import { motion } from "motion/react";
import { listContainer, listItem } from "../lib/motion";
import Matchup from "./Matchup";

// The elimination bracket: round of 16, quarterfinals, semifinals and final as columns joined by lines (stacked stage by stage on a
// phone). A tie of stage n spans 2^n rows, so each sits level with the two ties that feed it; the lines are drawn only while the
// bracket is verified as connected. The cell positions come from CSS variables (see .elim-cell).
export default function EliminationGrid({ bracket, selectedId, focusClub, onSelect, onFocusClub }) {
  const last = bracket.rounds.length - 1;
  return (
    <motion.div className="bk-grid elim-grid grid grid-cols-1 gap-x-9 gap-y-3 lg:grid-cols-4" variants={listContainer} initial="hidden" animate="show">
      {bracket.rounds.map((round, stageIndex) => (
        <Fragment key={round.id}>
          <div className="elim-head" style={{ "--c": stageIndex + 1 }}>
            <p className="eyebrow mb-0.5">{round.winTarget ? `BEST OF ${2 * round.winTarget - 1}` : "SERIES"}</p>
            <h3 className="text-lg font-bold">{round.title}</h3>
          </div>
          {round.slots.map((slot, index) => (
            <motion.div
              key={slot.id}
              variants={listItem}
              className={"bk-cell elim-cell" + (bracket.connected && stageIndex < last ? " bk-out" : "") + (bracket.connected && stageIndex > 0 ? " bk-in" : "")}
              style={{ "--c": stageIndex + 1, "--r": 2 + index * 2 ** stageIndex, "--s": 2 ** stageIndex }}
            >
              <div className="w-full">
                <Matchup slot={slot} selected={selectedId === slot.id} focusClub={focusClub} onSelect={onSelect} onFocusClub={onFocusClub} />
              </div>
            </motion.div>
          ))}
        </Fragment>
      ))}
    </motion.div>
  );
}
