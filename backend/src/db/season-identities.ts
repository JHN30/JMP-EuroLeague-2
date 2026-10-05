import { and, asc, eq, exists, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import { clubs, people, registrations, seasonStatsTraditional } from "./season-schema";

const COMPETITION_CODE = "E";
const PLAYER_ROLE_CODE = "J";

export type Page<T> = { items: T[]; hasMore: boolean };
export type CountedPage<T> = Page<T> & { total: number };

export type Team = {
  clubCode: string;
  name: string | null;
  abbreviatedName: string | null;
  countryCode: string | null;
  crestUrl: string | null;
};

export type Player = {
  personKey: string;
  name: string | null;
  jerseyName: string | null;
  countryCode: string | null;
  heightCm: number | null;
};

// A directory entry: the player plus what the card shows beside the name. The photo exists only for a player who has
// played (it comes from the season statistics), and the club is the one on his current registration.
export type PlayerListEntry = Player & {
  imageUrl: string | null;
  clubCode: string | null;
  clubName: string | null;
  crestUrl: string | null;
  dorsal: string | null;
  positionName: string | null;
};

export type Registration = {
  registrationKey: string;
  personKey: string;
  clubCode: string | null;
  roleCode: string | null;
  roleName: string | null;
  active: boolean | null;
  sortOrder: number | null;
  dorsal: string | null;
  positionName: string | null;
};

export type RosterEntry = Registration & { player: Player | null };
export type PlayerRegistration = Registration & { team: Team | null };

const teamFields = {
  clubCode: clubs.clubCode,
  name: clubs.name,
  abbreviatedName: clubs.abbreviatedName,
  countryCode: clubs.countryCode,
  crestUrl: clubs.crestUrl,
};

const playerFields = {
  personKey: people.personKey,
  name: people.name,
  jerseyName: people.jerseyName,
  countryCode: people.countryCode,
  heightCm: people.heightCm,
};

const registrationFields = {
  registrationKey: registrations.registrationKey,
  personKey: registrations.personKey,
  clubCode: registrations.clubCode,
  roleCode: registrations.roleCode,
  roleName: registrations.roleName,
  active: registrations.active,
  sortOrder: registrations.sortOrder,
  dorsal: registrations.dorsal,
  positionName: registrations.positionName,
};

function playerScope(seasonCode: string) {
  // The live registration role J is "Player"; other roles are staff.
  return and(
    eq(people.competitionCode, COMPETITION_CODE),
    eq(people.seasonCode, seasonCode),
    or(eq(people.isReferee, false), isNull(people.isReferee)),
    exists(db.select({ one: sql`1` }).from(registrations).where(and(
      eq(registrations.competitionCode, COMPETITION_CODE),
      eq(registrations.seasonCode, seasonCode),
      eq(registrations.personKey, people.personKey),
      eq(registrations.roleCode, PLAYER_ROLE_CODE),
    ))),
  );
}

export async function getTeams(seasonCode: string): Promise<Team[]> {
  return catalogRead(() =>
    db.select(teamFields)
      .from(clubs)
      .where(and(eq(clubs.competitionCode, COMPETITION_CODE), eq(clubs.seasonCode, seasonCode)))
      .orderBy(asc(clubs.name), asc(clubs.clubCode)),
  );
}

export async function getTeam(seasonCode: string, clubCode: string): Promise<Team | null> {
  const rows = await catalogRead(() =>
    db.select(teamFields)
      .from(clubs)
      .where(and(
        eq(clubs.competitionCode, COMPETITION_CODE),
        eq(clubs.seasonCode, seasonCode),
        eq(clubs.clubCode, clubCode),
      ))
      .limit(1),
  );
  return rows[0] ?? null;
}

export async function getPlayers(
  seasonCode: string,
  limit: number,
  offset: number,
  search?: string,
): Promise<CountedPage<PlayerListEntry>> {
  const scope = search
    ? and(playerScope(seasonCode), or(ilike(people.name, `%${search}%`), ilike(people.jerseyName, `%${search}%`))!)
    : playerScope(seasonCode);
  const [pageRows, countRows] = await Promise.all([
    catalogRead(() =>
      db.select(playerFields)
        .from(people)
        .where(scope)
        .orderBy(asc(people.name), asc(people.personKey))
        .limit(limit + 1)
        .offset(offset),
    ),
    catalogRead(() =>
      db.select({ count: sql<number>`count(*)::int` }).from(people).where(scope),
    ),
  ]);
  const players = pageRows.slice(0, limit);
  const details = await getPlayerListDetails(seasonCode, players.map((player) => player.personKey));
  return {
    items: players.map((player) => ({ ...player, ...listEntryDetails(details, player.personKey) })),
    hasMore: pageRows.length > limit,
    total: countRows[0]?.count ?? 0,
  };
}

function listEntryDetails(details: Awaited<ReturnType<typeof getPlayerListDetails>>, personKey: string) {
  const registration = details.registrations.get(personKey);
  return {
    imageUrl: details.images.get(personKey) ?? null,
    clubCode: registration?.clubCode ?? null,
    clubName: registration?.clubName ?? null,
    crestUrl: registration?.crestUrl ?? null,
    dorsal: registration?.dorsal ?? null,
    positionName: registration?.positionName ?? null,
  };
}

// Two small lookups for one page of players: each one's current registration (the active one, else the first by sort
// order) with its club, and a photo from the season statistics (the same picture in every phase and mode).
async function getPlayerListDetails(seasonCode: string, personKeys: string[]) {
  const registrationsByPerson = new Map<
    string,
    { clubCode: string | null; clubName: string | null; crestUrl: string | null; dorsal: string | null; positionName: string | null }
  >();
  const images = new Map<string, string>();
  if (personKeys.length === 0) return { registrations: registrationsByPerson, images };

  const [registrationRows, imageRows] = await Promise.all([
    catalogRead(() =>
      db.select({
        personKey: registrations.personKey,
        active: registrations.active,
        clubCode: registrations.clubCode,
        clubName: clubs.name,
        crestUrl: clubs.crestUrl,
        dorsal: registrations.dorsal,
        positionName: registrations.positionName,
      })
        .from(registrations)
        .leftJoin(clubs, and(
          eq(clubs.competitionCode, registrations.competitionCode),
          eq(clubs.seasonCode, registrations.seasonCode),
          eq(clubs.clubCode, registrations.clubCode),
        ))
        .where(and(
          eq(registrations.competitionCode, COMPETITION_CODE),
          eq(registrations.seasonCode, seasonCode),
          eq(registrations.roleCode, PLAYER_ROLE_CODE),
          inArray(registrations.personKey, personKeys),
        ))
        .orderBy(asc(registrations.sortOrder), asc(registrations.registrationKey)),
    ),
    catalogRead(() =>
      db.selectDistinct({
        personKey: seasonStatsTraditional.personKey,
        imageUrl: seasonStatsTraditional.playerImageUrl,
      })
        .from(seasonStatsTraditional)
        .where(and(
          eq(seasonStatsTraditional.competitionCode, COMPETITION_CODE),
          eq(seasonStatsTraditional.seasonCode, seasonCode),
          inArray(seasonStatsTraditional.personKey, personKeys),
          sql`${seasonStatsTraditional.playerImageUrl} is not null`,
        )),
    ),
  ]);

  // Rows come in sort order, so the first one seen is the fallback and an active one replaces it.
  const activeSeen = new Set<string>();
  for (const { personKey, active, ...rest } of registrationRows) {
    if (!registrationsByPerson.has(personKey) || (active === true && !activeSeen.has(personKey))) {
      registrationsByPerson.set(personKey, rest);
    }
    if (active === true) activeSeen.add(personKey);
  }
  for (const { personKey, imageUrl } of imageRows) {
    if (imageUrl && !images.has(personKey)) images.set(personKey, imageUrl);
  }
  return { registrations: registrationsByPerson, images };
}

// The photo of each of these players (the season statistics are the only place the feed keeps one); a player who has not
// played has none.
export async function getPlayerImages(seasonCode: string, personKeys: string[]): Promise<Map<string, string>> {
  return (await getPlayerListDetails(seasonCode, personKeys)).images;
}

export async function getPlayer(seasonCode: string, personKey: string): Promise<PlayerListEntry | null> {
  const rows = await catalogRead(() =>
    db.select(playerFields)
      .from(people)
      .where(and(playerScope(seasonCode), eq(people.personKey, personKey)))
      .limit(1),
  );
  const player = rows[0];
  if (!player) return null;
  const details = await getPlayerListDetails(seasonCode, [personKey]);
  return { ...player, ...listEntryDetails(details, personKey) };
}

export async function getTeamRoster(
  seasonCode: string,
  clubCode: string,
  limit: number,
  offset: number,
): Promise<Page<RosterEntry>> {
  const rows = await catalogRead(() =>
    db.select({ registration: registrationFields, player: playerFields })
      .from(registrations)
      .leftJoin(people, and(
        eq(people.competitionCode, registrations.competitionCode),
        eq(people.seasonCode, registrations.seasonCode),
        eq(people.personKey, registrations.personKey),
      ))
      .where(and(
        eq(registrations.competitionCode, COMPETITION_CODE),
        eq(registrations.seasonCode, seasonCode),
        eq(registrations.clubCode, clubCode),
        eq(registrations.roleCode, PLAYER_ROLE_CODE),
        or(eq(people.isReferee, false), isNull(people.isReferee)),
      ))
      .orderBy(asc(registrations.sortOrder), asc(registrations.registrationKey))
      .limit(limit + 1)
      .offset(offset),
  );
  return {
    items: rows.slice(0, limit).map((row) => ({ ...row.registration, player: row.player })),
    hasMore: rows.length > limit,
  };
}

// The feed's coaching roles in registrations: E is the head coach and A an assistant (its own spelling is "Assitant").
const HEAD_COACH_ROLE_CODE = "E";
const ASSISTANT_COACH_ROLE_CODE = "A";

export type Coach = {
  personKey: string;
  name: string | null;
  countryCode: string | null;
  roleCode: string;
};

// A club's current head coach and assistants, the head coach first, then the assistants by name. Staff have no photo or
// height in the data, only a name and a nationality.
export async function getTeamCoaches(seasonCode: string, clubCode: string): Promise<Coach[]> {
  const rows = await catalogRead(() =>
    db.select({
      personKey: registrations.personKey,
      roleCode: registrations.roleCode,
      name: people.name,
      countryCode: people.countryCode,
    })
      .from(registrations)
      .leftJoin(people, and(
        eq(people.competitionCode, registrations.competitionCode),
        eq(people.seasonCode, registrations.seasonCode),
        eq(people.personKey, registrations.personKey),
      ))
      .where(and(
        eq(registrations.competitionCode, COMPETITION_CODE),
        eq(registrations.seasonCode, seasonCode),
        eq(registrations.clubCode, clubCode),
        inArray(registrations.roleCode, [HEAD_COACH_ROLE_CODE, ASSISTANT_COACH_ROLE_CODE]),
        or(eq(registrations.active, true), isNull(registrations.active)),
      ))
      .orderBy(asc(registrations.roleCode), asc(people.name), asc(registrations.personKey)),
  );
  // "A" sorts before "E", so put the head coach first explicitly.
  return rows
    .filter((row): row is typeof row & { roleCode: string } => row.roleCode !== null)
    .sort((a, b) => Number(b.roleCode === HEAD_COACH_ROLE_CODE) - Number(a.roleCode === HEAD_COACH_ROLE_CODE));
}

export async function getPlayerRegistrations(
  seasonCode: string,
  personKey: string,
): Promise<PlayerRegistration[]> {
  const rows = await catalogRead(() =>
    db.select({ registration: registrationFields, team: teamFields })
      .from(registrations)
      .leftJoin(clubs, and(
        eq(clubs.competitionCode, registrations.competitionCode),
        eq(clubs.seasonCode, registrations.seasonCode),
        eq(clubs.clubCode, registrations.clubCode),
      ))
      .where(and(
        eq(registrations.competitionCode, COMPETITION_CODE),
        eq(registrations.seasonCode, seasonCode),
        eq(registrations.personKey, personKey),
        eq(registrations.roleCode, PLAYER_ROLE_CODE),
      ))
      .orderBy(asc(registrations.sortOrder), asc(registrations.registrationKey)),
  );
  return rows.map((row) => ({ ...row.registration, team: row.team }));
}
