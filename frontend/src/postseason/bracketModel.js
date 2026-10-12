// The postseason as one bracket, filled from two sources: the regular-season standings (who is seeded where) and the postseason
// series the pipeline has recorded. A matchup that has been played carries its series; one that has not is filled from the seeds
// and from the winners of the matchups before it, or left as a placeholder ("Winner of 7 v 8").
//
// The structure, which the recorded seasons confirm:
//   Play-In   7 v 8, 9 v 10, then the loser of 7 v 8 against the winner of 9 v 10 (for the 8th place); single games
//   Playoffs  1 v 8, 2 v 7, 3 v 6, 4 v 5; best of five
//   Final Four  (1 v 8 winner) v (4 v 5 winner) and (2 v 7 winner) v (3 v 6 winner), the final, and where a season has one,
//               the third-place game

// The numbers come from the season's format: the seeds from its qualification lines, the wins a tie needs from each stage's win
// target, and the third-place game from its Final Four. A club leading a series has not won it: only reaching the win target does.

// Used only while the format cannot be read: the modern seasons' values.
const DEFAULT_WIN_TARGETS = { PI: 1, PO: 3, FF: 1 };
const DEFAULT_DIRECT_SEEDS = 6;
const DEFAULT_PLAY_IN_LAST_SEED = 10;

const pairKey = (a, b) => [a, b].sort().join("|");

function ordinalOf(number) {
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return number + "th";
  return number + ({ 1: "st", 2: "nd", 3: "rd" }[number % 10] ?? "th");
}

// The wins a tie of the stage needs, from the format.
export function stageWinTarget(format, stageCode) {
  if (!format) return DEFAULT_WIN_TARGETS[stageCode] ?? null;
  return format.stages.find((stage) => stage.code === stageCode)?.winTarget ?? null;
}

// The club that has reached the win target, or null while nobody has (a series can be led without being won).
export function clinchedWinner(entry, winTarget) {
  if (!entry || !winTarget) return null;
  if ((entry.clubAWins ?? 0) >= winTarget) return entry.clubA.clubCode;
  if ((entry.clubBWins ?? 0) >= winTarget) return entry.clubB.clubCode;
  return null;
}

// The seeds of the bracket from the qualification lines (6 direct places and the Play-In to 10 in the modern seasons).
export function bracketSeeds(tiers) {
  const directSeeds = tiers?.find((line) => line.tier === "postseason")?.to ?? DEFAULT_DIRECT_SEEDS;
  const playInLast = tiers?.find((line) => line.tier === "playin")?.to ?? (tiers ? directSeeds : DEFAULT_PLAY_IN_LAST_SEED);
  return { directSeeds, playInLast };
}

export function buildBracket({ standings, teams, series, regularSeasonDone, format = null, tiers = null }) {
  const { directSeeds, playInLast } = bracketSeeds(tiers);
  const hasPlayIn = format ? format.stages.some((stage) => stage.code === "PI") : playInLast > directSeeds;
  const thirdPlaceGame = format ? (format.stages.find((stage) => stage.code === "FF")?.thirdPlaceGame ?? null) : null;
  const bySeed = new Map();
  const seedOfClub = new Map();
  for (const entry of standings) {
    bySeed.set(entry.basic.position, entry);
    seedOfClub.set(entry.clubCode, entry.basic.position);
  }
  const teamInfo = new Map(teams.map((team) => [team.clubCode, team]));

  const clubFromSeries = new Map();
  for (const entry of series) {
    clubFromSeries.set(entry.clubA.clubCode, entry.clubA);
    clubFromSeries.set(entry.clubB.clubCode, entry.clubB);
  }

  const projected = !regularSeasonDone && series.length === 0;

  function club(clubCode) {
    const standing = standings.find((entry) => entry.clubCode === clubCode);
    const info = teamInfo.get(clubCode) ?? clubFromSeries.get(clubCode);
    return {
      clubCode,
      name: info?.name ?? standing?.clubName ?? clubCode,
      short: info?.abbreviatedName ?? info?.name ?? standing?.clubName ?? clubCode,
      crestUrl: info?.crestUrl ?? standing?.crestUrl ?? null,
      seed: seedOfClub.get(clubCode) ?? null,
      record: standing ? standing.basic.gamesWon + "-" + standing.basic.gamesLost : null,
    };
  }
  const seeded = (seed) => (bySeed.has(seed) ? club(bySeed.get(seed).clubCode) : null);

  // A pairing is looked up only inside its own stage, so two clubs meeting in two stages are never confused.
  const seriesByStagePair = new Map(series.map((entry) => [entry.phaseCode + ":" + pairKey(entry.clubA.clubCode, entry.clubB.clubCode), entry]));
  const used = new Set();
  const take = (entry) => {
    if (entry) used.add(entry);
    return entry ?? null;
  };

  const winnerOf = (slot) => (slot.winnerClubCode ? club(slot.winnerClubCode) : null);
  const loserOf = (slot) => {
    if (!slot.winnerClubCode) return null;
    const other = slot.series.clubA.clubCode === slot.winnerClubCode ? slot.series.clubB : slot.series.clubA;
    return club(other.clubCode);
  };

  // A slot is its two sides (a club or a placeholder text), its series when there is one, and where it stands.
  function slot(id, stage, label, sides, entry, extra = {}) {
    const real = entry ? [club(entry.clubA.clubCode), club(entry.clubB.clubCode)].sort((x, y) => (x.seed ?? 99) - (y.seed ?? 99)) : null;
    const participants = (real ?? sides).map((side) => (side && side.clubCode ? side : { placeholder: side?.placeholder ?? side ?? "To be decided" }));
    const allClubs = participants.every((side) => side.clubCode);
    const winTarget = stageWinTarget(format, stage);
    const winnerClubCode = clinchedWinner(entry, winTarget);
    let state = "pending";
    if (entry) state = winnerClubCode ? "done" : "live";
    else if (allClubs) state = projected ? "projected" : "upcoming";
    return { id, stage, label, participants, series: entry, state, winTarget, winnerClubCode, ...extra };
  }

  const matchSeries = (a, b, stage) => (a && b ? take(seriesByStagePair.get(stage + ":" + pairKey(a.clubCode, b.clubCode))) : null);

  // Play-In
  // The Play-In's four seeds follow the direct places (7 to 10 in the modern seasons).
  const playInFirst = directSeeds + 1;
  const firstPair = playInFirst + " v " + (playInFirst + 1);
  const secondPair = playInFirst + 2 + " v " + (playInFirst + 3);
  function buildPlayIn() {
    const s7 = seeded(playInFirst);
    const s8 = seeded(playInFirst + 1);
    const s9 = seeded(playInFirst + 2);
    const s10 = seeded(playInFirst + 3);
    const pi1 = slot("pi1", "PI", firstPair, [s7, s8], matchSeries(s7, s8, "PI"));
    const pi2 = slot("pi2", "PI", secondPair, [s9, s10], matchSeries(s9, s10, "PI"));
    const loser1 = loserOf(pi1);
    const winner2 = winnerOf(pi2);
    const leftoverPlayIn = series.find((entry) => entry.phaseCode === "PI" && !used.has(entry));
    const pi3Entry = loser1 && winner2 ? matchSeries(loser1, winner2, "PI") ?? take(leftoverPlayIn) : take(leftoverPlayIn);
    const pi3 = slot(
      "pi3",
      "PI",
      "Decider for " + ordinalOf(playInFirst + 1),
      [loser1 ?? { placeholder: "Loser of " + firstPair }, winner2 ?? { placeholder: "Winner of " + secondPair }],
      pi3Entry ?? null,
    );
    return [pi1, pi2, pi3];
  }
  const playIn = hasPlayIn ? buildPlayIn() : [];
  const [pi1, , pi3] = playIn;

  // Playoffs: the top seed of each matchup is a seed from 1 to 4; its opponent is a seed (5, 6) or a Play-In winner.
  const seventh = hasPlayIn ? winnerOf(pi1) : seeded(7);
  const eighth = hasPlayIn ? winnerOf(pi3) : seeded(8);
  const po1 = slot("po1", "PO", "1 v 8", [seeded(1), eighth ?? (hasPlayIn ? { placeholder: "Winner of the Play-In" } : null)], matchSeries(seeded(1), eighth, "PO"));
  const po2 = slot("po2", "PO", "2 v 7", [seeded(2), seventh ?? (hasPlayIn ? { placeholder: "Winner of " + firstPair } : null)], matchSeries(seeded(2), seventh, "PO"));
  const po3 = slot("po3", "PO", "3 v 6", [seeded(3), seeded(6)], matchSeries(seeded(3), seeded(6), "PO"));
  const po4 = slot("po4", "PO", "4 v 5", [seeded(4), seeded(5)], matchSeries(seeded(4), seeded(5), "PO"));

  // Final Four
  const ffSeries = series.filter((entry) => entry.phaseCode === "FF");
  const winnerPlaceholder = (slotRef) => winnerOf(slotRef) ?? { placeholder: "Winner of " + slotRef.label };
  const semiEntry = (a, b) => (a && b ? take(ffSeries.find((entry) => pairKey(entry.clubA.clubCode, entry.clubB.clubCode) === pairKey(a.clubCode, b.clubCode))) : null);
  const w1 = winnerOf(po1);
  const w4 = winnerOf(po4);
  const w2 = winnerOf(po2);
  const w3 = winnerOf(po3);
  const sf1 = slot("sf1", "FF", "Semifinal", [winnerPlaceholder(po1), winnerPlaceholder(po4)], semiEntry(w1, w4));
  const sf2 = slot("sf2", "FF", "Semifinal", [winnerPlaceholder(po2), winnerPlaceholder(po3)], semiEntry(w2, w3));
  const finalists = [winnerOf(sf1), winnerOf(sf2)];
  const final = slot(
    "final",
    "FF",
    "Final",
    [winnerPlaceholder(sf1), winnerPlaceholder(sf2)],
    finalists[0] && finalists[1] ? take(ffSeries.find((entry) => pairKey(entry.clubA.clubCode, entry.clubB.clubCode) === pairKey(finalists[0].clubCode, finalists[1].clubCode))) : null,
  );
  const losers = [loserOf(sf1), loserOf(sf2)];
  // A third-place game only where the season's Final Four had one (none in E2025, for example).
  const thirdEntry =
    thirdPlaceGame !== false && losers[0] && losers[1]
      ? take(ffSeries.find((entry) => pairKey(entry.clubA.clubCode, entry.clubB.clubCode) === pairKey(losers[0].clubCode, losers[1].clubCode)))
      : null;
  const third = thirdEntry ? slot("third", "FF", "Third place", [losers[0], losers[1]], thirdEntry) : null;

  const champion = winnerOf(final);
  return { projected, directSeeds, playInLast, playIn, playoffs: [po1, po2, po3, po4], semis: [sf1, sf2], final, third, champion, all: [...playIn, po1, po2, po3, po4, sf1, sf2, final, ...(third ? [third] : [])] };
}

// The score of one club in a matchup: wins in the best-of-five Playoffs, points in a single game.
export function clubScore(slotEntry, clubCode) {
  const entry = slotEntry.series;
  if (!entry) return null;
  if ((slotEntry.winTarget ?? 1) <= 1) {
    const game = entry.games[0];
    if (!game || game.localScore == null || game.roadScore == null) return null;
    return game.localClubCode === clubCode ? game.localScore : game.roadScore;
  }
  return entry.clubA.clubCode === clubCode ? entry.clubAWins : entry.clubBWins;
}

// Where every club that played in the postseason finished, for a season that is over.
export function placements(bracket) {
  if (!bracket.champion) return null;
  const rows = [];
  const add = (club, label, order) => club && rows.push({ club, label, order });
  const loser = (slotEntry) => {
    const entry = slotEntry?.series;
    if (!slotEntry?.winnerClubCode) return null;
    const other = entry.clubA.clubCode === slotEntry.winnerClubCode ? entry.clubB : entry.clubA;
    return slotEntry.participants.find((side) => side.clubCode === other.clubCode) ?? null;
  };
  const winner = (slotEntry) => slotEntry?.participants.find((side) => side.clubCode === slotEntry.winnerClubCode) ?? null;
  add(winner(bracket.final), "Champion", 1);
  add(loser(bracket.final), "Runner-up", 2);
  if (bracket.third) {
    add(winner(bracket.third), "Third place", 3);
    add(loser(bracket.third), "Fourth place", 4);
  } else {
    for (const semi of bracket.semis) add(loser(semi), "Final Four", 3);
  }
  for (const slotEntry of bracket.playoffs) add(loser(slotEntry), "Playoffs", 5);
  // Of the Play-In, the loser of 9 v 10 and the loser of the decider are out; the others reach the Playoffs.
  add(loser(bracket.playIn[1]), "Play-In", 6);
  add(loser(bracket.playIn[2]), "Play-In", 6);
  return rows.sort((a, b) => a.order - b.order);
}

// ---- The race for the bracket (while the regular season is on) ----

// Each club's standing against the lines, from wins and games left alone (tiebreakers are ignored, so a club is only called
// clinched or out when no tiebreaker could change it).
export function raceStatus(standings, remainingByClub, { directSeeds = DEFAULT_DIRECT_SEEDS, playInLast = DEFAULT_PLAY_IN_LAST_SEED } = {}) {
  const rows = standings.map((entry) => ({
    clubCode: entry.clubCode,
    wins: entry.basic.gamesWon,
    losses: entry.basic.gamesLost,
    remaining: remainingByClub.get(entry.clubCode) ?? 0,
  }));
  return new Map(
    rows.map((row) => {
      const others = rows.filter((other) => other.clubCode !== row.clubCode);
      const mightFinishAhead = others.filter((other) => other.wins + other.remaining >= row.wins).length;
      const surelyAhead = others.filter((other) => other.wins > row.wins + row.remaining).length;
      let status = "alive";
      if (mightFinishAhead < directSeeds) status = "playoffs";
      else if (mightFinishAhead < playInLast) status = "playin";
      else if (surelyAhead >= playInLast) status = "out";
      else if (surelyAhead >= directSeeds) status = "playin-race";
      return [row.clubCode, { status, remaining: row.remaining }];
    }),
  );
}
