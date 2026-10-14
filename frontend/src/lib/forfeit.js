// A recorded forfeit (E2001 game 264, E2003 game 200): the score is awarded, not played, and there is no box score. It counts as a win
// or loss, but its score is not points scored on court, so averages, margins and highlights built from game scores leave it out.
export const isForfeit = (game) => game?.gameStatus === "Walkover";
