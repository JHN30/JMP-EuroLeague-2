import { sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import { getClubTvCodes, tvCodeOf } from "./season-identities";

const COMPETITION_CODE = "E";

// The stats the form view covers, as the box-score column and the key it is returned under.
const FORM_STATS = [
  { key: "pts", column: "points" },
  { key: "reb", column: "total_rebounds" },
  { key: "ast", column: "assists" },
  { key: "stl", column: "steals" },
  { key: "blk", column: "blocks" },
  { key: "pir", column: "pir" },
] as const;

export type FormStat = (typeof FORM_STATS)[number]["key"];
export type PlayerForm = {
  personKey: string;
  playerName: string | null;
  clubCode: string | null;
  clubName: string | null;
  clubTvCode: string | null;
  imageUrl: string | null;
  crestUrl: string | null;
  games: number;
  recentGames: number;
  // Per game over the whole phase, over the last `recentGames` games, and over the games before the latest round.
  season: Record<FormStat, number | null>;
  recent: Record<FormStat, number | null>;
  // Where the player ranks on the per-game average now, and before the latest round (null when they had no earlier game).
  rank: Record<FormStat, { now: number; before: number | null }>;
};

type Row = Record<string, unknown>;
const num = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));

// For every qualified player of a season and phase (the players the leaderboards list): their per-game numbers over the
// last N games they played, over the whole phase, and their rank on each stat now and before the latest round, so a
// leaderboard can show who is hot and who has moved. Worked out from the box scores, here, so no page re-aggregates them.
export async function getPlayerForm(seasonCode: string, phaseCode: string | undefined, recentGames: number) {
  const phaseFilter: SQL = phaseCode === undefined ? sql`true` : sql`g.phase_code = ${phaseCode}`;
  const poolPhase: SQL = phaseCode === undefined ? sql`phase_code = 'all'` : sql`phase_code = ${phaseCode}`;
  const aggregates = FORM_STATS.map(({ key, column }) =>
    sql.raw(
      `avg(${column}) as s_${key}, avg(${column}) filter (where rn <= ${recentGames}) as r_${key}, avg(${column}) filter (where round_number < last_round) as p_${key}`,
    ),
  );
  const ranks = FORM_STATS.map(({ key }) =>
    sql.raw(
      `rank() over (order by s_${key} desc nulls last) as rk_${key}, case when prev_games > 0 then rank() over (order by p_${key} desc nulls last) end as rkp_${key}`,
    ),
  );
  const join = (parts: SQL[]) => parts.reduce((acc, part, index) => (index === 0 ? part : sql`${acc}, ${part}`));

  const result = await catalogRead(() =>
    db.execute(sql`
      with played as (
        select p.person_key, p.club_code, p.person_name, g.round_number, p.seconds_played,
               p.points, p.total_rebounds, p.assists, p.steals, p.blocks, p.pir,
               row_number() over (partition by p.person_key order by g.scheduled_at desc, p.game_code desc) as rn,
               max(g.round_number) over () as last_round
        from app_game_player_stats p
        join app_games g
          on g.competition_code = p.competition_code and g.season_code = p.season_code and g.game_code = p.game_code
        where p.competition_code = ${COMPETITION_CODE} and p.season_code = ${seasonCode}
          and ${phaseFilter} and p.seconds_played > 0
      ),
      pool as (
        select person_key, player_image_url, club_image_url, club_name from app_season_player_stats_traditional
        where competition_code = ${COMPETITION_CODE} and season_code = ${seasonCode} and ${poolPhase}
          and mode = 'perGame' and qualified
      ),
      agg as (
        select played.person_key,
               (array_agg(club_code order by rn))[1] as club_code,
               (array_agg(person_name order by rn))[1] as player_name,
               max(pool.player_image_url) as player_image_url, max(pool.club_image_url) as club_image_url, max(pool.club_name) as club_name,
               count(*) as games,
               count(*) filter (where rn <= ${recentGames}) as recent_games,
               count(*) filter (where round_number < last_round) as prev_games,
               max(last_round) as last_round,
               ${join(aggregates)}
        from played join pool on pool.person_key = played.person_key
        group by played.person_key
      )
      select *, ${join(ranks)} from agg
    `),
  );

  const codes = await getClubTvCodes(seasonCode);
  const rows = result.rows as Row[];
  const lastRound = rows.length > 0 ? num(rows[0].last_round) : null;
  const players: PlayerForm[] = rows.map((row) => {
    const pick = (prefix: string) =>
      Object.fromEntries(FORM_STATS.map(({ key }) => [key, num(row[`${prefix}_${key}`])])) as Record<FormStat, number | null>;
    return {
      personKey: String(row.person_key),
      playerName: (row.player_name as string | null) ?? null,
      clubCode: (row.club_code as string | null) ?? null,
      clubName: (row.club_name as string | null) ?? null,
      clubTvCode: tvCodeOf(codes, (row.club_code as string | null) ?? null),
      imageUrl: (row.player_image_url as string | null) ?? null,
      crestUrl: (row.club_image_url as string | null) ?? null,
      games: Number(row.games),
      recentGames: Number(row.recent_games),
      season: pick("s"),
      recent: pick("r"),
      rank: Object.fromEntries(
        FORM_STATS.map(({ key }) => [key, { now: Number(row[`rk_${key}`]), before: num(row[`rkp_${key}`]) }]),
      ) as PlayerForm["rank"],
    };
  });
  return { lastRound, players };
}
