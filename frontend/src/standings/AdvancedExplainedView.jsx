import { Fragment, useState } from "react";
import { motion } from "motion/react";
import { formatDecimal, formatFractionPercent, formatSignedDecimal } from "../lib/format";
import Panel from "../lib/Panel";
import { DivergingBars, DotStrip, Dumbbells, ScaleBars, ShotGrid, Waffle } from "./explainedVisuals";

const dec = (value) => formatDecimal(value);
const signed = (value) => formatSignedDecimal(value);
const pct = (value) => formatFractionPercent(value);
const has = (...values) => values.every((value) => value !== null && value !== undefined);
const nameOf = (entry) => entry.clubName ?? entry.clubCode;

function average(entries, key) {
  const values = entries.map((entry) => entry[key]).filter((value) => value !== null && value !== undefined);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

// Every row explains one statistic: what it measures, why it exists, how to read it, then a live example and a picture
// drawn from the selected team and the rest of the league. `example` and `visual` receive that data.
const SECTIONS = [
  {
    title: "Ratings and pace",
    intro: "Raw points per game depend on how fast a team plays. These put every team on the same footing.",
    rows: [
      {
        key: "net",
        name: "Net rating",
        abbr: "ORtg · DRtg · Net",
        formula: "ORtg = 100 × points scored ÷ possessions. DRtg = 100 × points allowed ÷ possessions. Net = ORtg − DRtg.",
        measures:
          "How many more points a team scores than it allows over 100 possessions. ORtg is the attack, DRtg is the defence, and Net is the gap between them.",
        why: "Points per game mislead: a team that plays fast has more possessions, so it scores and allows more without being better. Counting per possession removes pace. Dean Oliver built this into basketball analytics (Basketball on Paper, 2004), and it is now the standard way to compare teams.",
        read: "Higher Net is better. For DRtg, lower is better, because it is points allowed.",
        example: (e) =>
          has(e.offensiveRating, e.defensiveRating, e.netRating)
            ? `${nameOf(e)} scored ${dec(e.offensiveRating)} and allowed ${dec(e.defensiveRating)} points per 100 possessions: a net rating of ${signed(e.netRating)}.`
            : null,
        visual: (e) => {
          if (!has(e.offensiveRating, e.defensiveRating)) return null;
          const low = Math.floor(Math.min(e.offensiveRating, e.defensiveRating) / 10) * 10 - 10;
          const high = Math.ceil(Math.max(e.offensiveRating, e.defensiveRating) / 10) * 10;
          return (
            <ScaleBars
              min={low}
              max={high}
              rows={[
                { label: "Scored", value: e.offensiveRating, format: dec, tone: "good" },
                { label: "Allowed", value: e.defensiveRating, format: dec, tone: "bad" },
              ]}
              caption={`Points per 100 possessions. The bars start at ${low} so the gap is easy to see. The gap is the net rating: ${signed(e.netRating)}.`}
            />
          );
        },
      },
      {
        key: "pace",
        name: "Pace",
        abbr: "Pace",
        formula: "40 × possessions ÷ minutes played",
        measures: "How many possessions a team uses in a 40-minute game. It describes a style, not quality.",
        why: "A fast team has more shots, rebounds and turnovers just because there are more possessions. Pace is what lets the other advanced stats be rates per possession, and it explains why some teams' raw totals look big or small.",
        read: "Higher is faster. Neither fast nor slow is better: what matters is how many points a team scores and allows per possession.",
        example: (e, all) =>
          has(e.pace) ? `${nameOf(e)} plays ${dec(e.pace)} possessions per 40 minutes; the league average is ${dec(average(all, "pace"))}.` : null,
        visual: (e, all) => <DotStrip entries={all} valueOf={(entry) => entry.pace} exampleCode={e.clubCode} format={dec} />,
      },
      {
        key: "mov",
        name: "Margin of victory",
        abbr: "MOV",
        formula: "average of (points scored − points allowed) per game",
        measures: "By how many points a team wins or loses a typical game.",
        why: "A win by 1 and a win by 25 both count as one win. Average margin keeps how convincingly a team wins, and it is a better guide to how good a team is, and how it will do next, than its record alone. It is also the starting point of SRS.",
        read: "Positive means it outscores opponents on average. +6 is a strong team.",
        example: (e) => (has(e.mov) ? `${nameOf(e)} has an average margin of ${signed(e.mov)} points per game.` : null),
        visual: (e, all) => <DotStrip entries={all} valueOf={(entry) => entry.mov} exampleCode={e.clubCode} format={signed} includeZero />,
      },
      {
        key: "expected",
        name: "Expected wins",
        abbr: "Exp W",
        formula: "games × points scored^k ÷ (points scored^k + points allowed^k), the Pythagorean expectation",
        measures: "How many games a team would usually have won given the points it scored and allowed.",
        why: "Bill James found this formula for baseball; basketball versions use a bigger exponent. Close games are close to coin flips, so a team that wins far more than its points suggest has probably been lucky and may slip back, while one that wins fewer has probably been unlucky and may improve.",
        read: "Compare it to actual wins. A positive gap means more wins than the scoring suggests.",
        example: (e) =>
          has(e.pythagoreanWins)
            ? `${nameOf(e)} has ${e.wins} wins against ${dec(e.pythagoreanWins)} expected, a gap of ${signed(e.wins - e.pythagoreanWins)}.`
            : null,
        visual: (e, all) => {
          const rated = all.filter((entry) => has(entry.pythagoreanWins));
          const gap = (entry) => entry.wins - entry.pythagoreanWins;
          const over = rated.reduce((best, entry) => (!best || gap(entry) > gap(best) ? entry : best), null);
          const under = rated.reduce((best, entry) => (!best || gap(entry) < gap(best) ? entry : best), null);
          const picks = [e, over, under].filter(Boolean);
          const unique = picks.filter((entry, index) => picks.findIndex((other) => other.clubCode === entry.clubCode) === index);
          return (
            <Dumbbells
              rows={unique.map((entry) => ({
                key: entry.clubCode,
                label: `${nameOf(entry)}${entry.clubCode === e.clubCode ? "" : entry.clubCode === over?.clubCode ? " (most over)" : " (most under)"}`,
                wins: entry.wins,
                expected: entry.pythagoreanWins,
              }))}
            />
          );
        },
      },
    ],
  },
  {
    title: "Four factors",
    intro:
      "Dean Oliver found that four things explain most of why teams win: shooting, turnovers, rebounding and free throws. Each shows up for a team's attack and for its defence.",
    rows: [
      {
        key: "efg",
        name: "Effective field goal percentage",
        abbr: "eFG%",
        formula: "(field goals made + 0.5 × three-pointers made) ÷ field goal attempts",
        measures: "How accurately a team shoots from the field, with a three-pointer counted for what it is worth.",
        why: "Plain field goal percentage treats a three and a two as the same, although a three is worth 50% more. Two teams can shoot the same percentage and score very differently. eFG% fixes that, and it is the most important of the four factors.",
        read: "Higher is better on offence. On defence, the opponents' eFG% allowed is better when it is lower.",
        example: (e, all) =>
          has(e.efgPct, e.oppEfgPct)
            ? `${nameOf(e)} shoots ${pct(e.efgPct)} effective and allows ${pct(e.oppEfgPct)}; the league average is ${pct(average(all, "efgPct"))}.`
            : null,
        visual: (e, all) => (
          <div className="explained-stack">
            <ShotGrid />
            <DotStrip entries={all} valueOf={(entry) => entry.efgPct} exampleCode={e.clubCode} format={pct} />
          </div>
        ),
      },
      {
        key: "tov",
        name: "Turnover rate",
        abbr: "TOV%",
        formula: "turnovers ÷ (field goal attempts + 0.44 × free throw attempts + turnovers)",
        measures: "The share of a team's plays that end in a turnover.",
        why: "A turnover wastes a whole possession with no chance to score. Measuring it per play, not per game, stops fast teams from looking careless just because they have the ball more often.",
        read: "Lower is better for a team's own turnovers. The opponents' rate (TOV% forced) is better when it is higher.",
        example: (e) =>
          has(e.tovPct, e.oppTovPct)
            ? `${nameOf(e)} turns the ball over on ${pct(e.tovPct)} of its plays and forces a turnover on ${pct(e.oppTovPct)} of the opponents'.`
            : null,
        visual: (e, all) => (
          <div className="explained-stack">
            <Waffle share={e.tovPct} describe={(n) => `${n} of every 100 plays end in a turnover`} />
            <DotStrip entries={all} valueOf={(entry) => entry.tovPct} exampleCode={e.clubCode} format={pct} />
          </div>
        ),
      },
      {
        key: "reb",
        name: "Rebound rates",
        abbr: "ORB% · DRB%",
        formula: "ORB% = own offensive rebounds ÷ (own offensive + opponent defensive rebounds). DRB% is the same for defensive rebounds.",
        measures: "The share of the rebounds that were up for grabs that a team actually takes.",
        why: "Total rebounds favour teams that miss a lot, because there are more rebounds to collect. A rate compares what a team took with what was available, so it measures the skill of rebounding rather than the volume of misses.",
        read: "Higher is better, for both offensive and defensive rebounding.",
        example: (e) =>
          has(e.orbPct, e.drbPct)
            ? `${nameOf(e)} takes ${pct(e.orbPct)} of the available offensive rebounds and ${pct(e.drbPct)} of the defensive ones.`
            : null,
        visual: (e, all) => (
          <div className="explained-stack">
            <Waffle share={e.orbPct} describe={(n) => `${n} of every 100 available offensive rebounds are won`} />
            <DotStrip entries={all} valueOf={(entry) => entry.orbPct} exampleCode={e.clubCode} format={pct} />
          </div>
        ),
      },
      {
        key: "ft",
        name: "Free throw rate",
        abbr: "FT rate",
        formula: "free throws made ÷ field goal attempts",
        measures: "How many free throws a team makes for every shot it takes from the field.",
        why: "Free throws are the most efficient shots in the game. Teams that attack the basket, or defend without fouling, win the free throw battle, and it decides close games.",
        read: "Higher is better on offence. On defence, the rate opponents get (FT rate allowed) is better when it is lower.",
        example: (e) =>
          has(e.ftRate, e.oppFtRate)
            ? `${nameOf(e)} makes ${pct(e.ftRate)} as many free throws as it takes field goals, and lets opponents make ${pct(e.oppFtRate)}.`
            : null,
        visual: (e, all) => (
          <div className="explained-stack">
            <Waffle share={e.ftRate} describe={(n) => `${n} free throws made for every 100 field goal attempts`} />
            <DotStrip entries={all} valueOf={(entry) => entry.ftRate} exampleCode={e.clubCode} format={pct} />
          </div>
        ),
      },
    ],
  },
  {
    title: "More about scoring",
    intro: "Two other views of how a team scores.",
    rows: [
      {
        key: "ts",
        name: "True shooting percentage",
        abbr: "TS%",
        formula: "points ÷ (2 × (field goal attempts + 0.44 × free throw attempts))",
        measures: "How efficiently a team turns its shots into points, counting twos, threes and free throws.",
        why: "eFG% leaves free throws out. True shooting adds them, so a team that draws fouls and shoots well from the line gets credit. The 0.44 is an estimate of how many free throw attempts end a possession.",
        read: "Higher is better. It is the best single number for scoring efficiency.",
        example: (e, all) =>
          has(e.trueShootingPct)
            ? `${nameOf(e)} has a true shooting percentage of ${pct(e.trueShootingPct)}; the league average is ${pct(average(all, "trueShootingPct"))}.`
            : null,
        visual: (e, all) => <DotStrip entries={all} valueOf={(entry) => entry.trueShootingPct} exampleCode={e.clubCode} format={pct} />,
      },
      {
        key: "ast",
        name: "Assist ratio",
        abbr: "AST ratio",
        formula: "assists ÷ field goals made",
        measures: "The share of a team's made baskets that came from a pass.",
        why: "It shows how a team creates its points: through ball movement, or through players making their own shots. It describes style rather than quality, but it helps explain why two teams with the same efficiency look so different.",
        read: "Higher means more of the scoring comes off passes. It is not better or worse in itself.",
        example: (e) =>
          has(e.assistRatio) ? `${nameOf(e)} records an assist on ${pct(e.assistRatio)} of its field goals.` : null,
        visual: (e, all) => (
          <div className="explained-stack">
            <Waffle share={e.assistRatio} describe={(n) => `${n} of every 100 made baskets are assisted`} />
            <DotStrip entries={all} valueOf={(entry) => entry.assistRatio} exampleCode={e.clubCode} format={pct} />
          </div>
        ),
      },
    ],
  },
  {
    title: "Strength of schedule",
    intro:
      "Not every team plays the same opponents. These account for that. They can only be worked out once every club is linked to every other through a chain of opponents (A played B, B played C, and so on). Clubs do not need to have played each other, so this usually happens within the first few rounds; until then these columns stay blank.",
    rows: [
      {
        key: "srs",
        name: "Simple Rating System",
        abbr: "SRS",
        formula: "a team's margin of victory plus the average SRS of its opponents, solved for every team together. The league average is 0.",
        measures: "How many points per game better (+) or worse (−) than an average team a club is, once the strength of its opponents is counted.",
        why: "A big average margin earned against weak opponents is worth less than a smaller one against strong opponents. SRS (from Basketball-Reference) fixes that. It has to be solved for every club at once, because each rating depends on its opponents' ratings.",
        read: "0 is an average team. +5 means five points a game better than average.",
        example: (e) =>
          has(e.srs, e.mov, e.sos)
            ? `${nameOf(e)} has an SRS of ${signed(e.srs)} from a margin of ${signed(e.mov)}, because its schedule was ${
                Math.abs(e.sos) < 0.5 ? "about average" : e.sos > 0 ? "harder than average" : "easier than average"
              } (${signed(e.sos)}).`
            : null,
        visual: (e, all) => <DotStrip entries={all} valueOf={(entry) => entry.srs} exampleCode={e.clubCode} format={signed} includeZero />,
      },
      {
        key: "sos",
        name: "Strength of schedule and of victories",
        abbr: "SOS · SOV",
        formula: "SOS = the average SRS of all opponents. SOV = the average SRS of the opponents a team beat.",
        measures: "How good the opponents were that a team faced, and how good the ones it beat were.",
        why: "Two teams with the same record can have had very different roads. SOS shows how hard the schedule was. SOV shows whether the wins came against good teams or only against weak ones.",
        read: "Above 0 is harder than average. A SOV well below SOS means the wins came against weaker opponents.",
        example: (e) =>
          has(e.sos, e.sov) ? `${nameOf(e)} has a strength of schedule of ${signed(e.sos)} and a strength of victories of ${signed(e.sov)}.` : null,
        visual: (e) => (
          <DivergingBars
            rows={[
              { label: "Schedule", value: e.sos, format: signed, neutral: true },
              { label: "Victories", value: e.sov, format: signed, neutral: true },
            ]}
            caption="In points per game of SRS. Right of the line: opponents better than average. Grey because neither side is better or worse."
          />
        ),
      },
      {
        key: "adj",
        name: "Adjusted ratings",
        abbr: "Adj ORtg · Adj DRtg · Adj Net",
        formula: "offensive, defensive and net rating after adjusting for the opponents faced",
        measures: "The same ratings as above, but as they would look against an average schedule.",
        why: "It applies the idea behind SRS to per-possession ratings, so that a team that has faced strong defences is not penalised and one that has faced weak ones is not flattered.",
        read: "Compare Adj Net with Net. If the adjusted value is higher, the schedule was tougher than average.",
        example: (e) =>
          has(e.netRating, e.adjNetRating)
            ? `${nameOf(e)} has a net rating of ${signed(e.netRating)}, and ${signed(e.adjNetRating)} after adjusting for its opponents.`
            : null,
        visual: (e) => (
          <DivergingBars
            rows={[
              { label: "Net", value: e.netRating, format: signed },
              { label: "Adj Net", value: e.adjNetRating, format: signed },
            ]}
            caption="Points per 100 possessions, before and after the adjustment."
          />
        ),
      },
    ],
  },
  {
    title: "Context",
    intro: "Numbers mean more next to the league and next to recent form.",
    rows: [
      {
        key: "relative",
        name: "Versus league average",
        abbr: "Off · Def · Pace",
        formula: "a team's offensive rating, defensive rating or pace minus the league average",
        measures: "How far above or below the league average a team's attack, defence and pace are.",
        why: "An offensive rating of 118 says little on its own: it depends on how much the whole league scores. The gap to the average gives the context, and it lets seasons with different scoring levels be compared.",
        read: "For Off, positive is better. For Def, negative is better, because it means fewer points allowed than the league average.",
        example: (e) =>
          has(e.relativeOffensiveRating, e.relativeDefensiveRating)
            ? `${nameOf(e)} scores ${signed(e.relativeOffensiveRating)} and allows ${signed(e.relativeDefensiveRating)} per 100 possessions compared with the league average.`
            : null,
        visual: (e) => (
          <DivergingBars
            rows={[
              { label: "Offense", value: e.relativeOffensiveRating, format: signed },
              { label: "Defense", value: e.relativeDefensiveRating, format: signed, invert: true },
              { label: "Pace", value: e.relativePace, format: signed, neutral: true },
            ]}
            caption="Right of the line is above the league average. For defence, left (fewer points allowed) is the good side. Pace is grey: neither is better."
          />
        ),
      },
      {
        key: "splits",
        name: "Splits",
        abbr: "Home · Away · Last 5 · Last 10",
        formula: "the same ratings, but only over home games, away games, or the latest 5 or 10 games",
        measures: "How a team does at home and on the road, and how it is doing lately.",
        why: "Season averages hide home-court advantage and form. Home and away show how far a team depends on its own court. Last 5 and Last 10 show whether it is rising or falling.",
        read: "Short samples swing a lot. Five games is noise as much as form, so treat the last-5 figure with care.",
        example: (e) =>
          has(e.homeNetRating, e.awayNetRating)
            ? `${nameOf(e)} has a net rating of ${signed(e.homeNetRating)} at home and ${signed(e.awayNetRating)} away.`
            : null,
        visual: (e) => (
          <DivergingBars
            rows={[
              { label: "Season", value: e.netRating, format: signed },
              { label: "Home", value: e.homeNetRating, format: signed },
              { label: "Away", value: e.awayNetRating, format: signed },
              { label: "Last 5", value: e.last5NetRating, format: signed },
              { label: "Last 10", value: e.last10NetRating, format: signed },
            ]}
            caption="Net rating, points per 100 possessions."
          />
        ),
      },
    ],
  },
];

export default function AdvancedExplainedView({ standings, scopeLabel, round }) {
  const [exampleCode, setExampleCode] = useState(null);
  const entries = standings;
  const selected = entries.find((entry) => entry.clubCode === exampleCode) ?? entries[0];

  return (
    <div className="breakdown-vis flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center whitespace-nowrap gap-2 text-xs text-base-content/70">
          Example team
          <select className="select select-sm select-bordered" value={selected.clubCode} onChange={(event) => setExampleCode(event.target.value)}>
            {entries.map((entry) => (
              <option key={entry.clubCode} value={entry.clubCode}>
                {nameOf(entry)}
              </option>
            ))}
          </select>
        </label>
        <p className="muted text-xs">
          The examples and pictures use the real numbers for {scopeLabel}, through round {round}.
        </p>
      </div>

      <Panel className="p-2">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="table explained-table">
            <thead>
              <tr>
                <th>Statistic</th>
                <th>What it tells you</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => (
                <Fragment key={section.title}>
                  <tr className="explained-section">
                    <td colSpan={2}>
                      <b>{section.title}</b>
                      <span>{section.intro}</span>
                    </td>
                  </tr>
                  {section.rows.map((row) => {
                    const example = row.example(selected, entries);
                    return (
                      <motion.tr
                        key={row.key}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.35 }}
                      >
                        <td className="explained-name">
                          <div className="explained-name-stack">
                            <b>{row.name}</b>
                            {row.abbr !== row.name ? <span className="badge badge-sm badge-ghost">{row.abbr}</span> : null}
                            <code>{row.formula}</code>
                          </div>
                        </td>
                        <td>
                          <div className="explained-body">
                            <div className="explained-text">
                              <p>
                                <b>What it measures.</b> {row.measures}
                              </p>
                              <p>
                                <b>Why it exists.</b> {row.why}
                              </p>
                              <p>
                                <b>How to read it.</b> {row.read}
                              </p>
                              {example ? (
                                <p className="explained-example">
                                  <b>Example.</b> {example}
                                </p>
                              ) : (
                                <p className="explained-example muted">
                                  <b>Example.</b> Not available for {nameOf(selected)} yet in this scope and round.
                                </p>
                              )}
                            </div>
                            <div className="explained-visual">{row.visual(selected, entries)}</div>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
