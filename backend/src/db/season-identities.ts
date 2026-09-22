import { and, asc, eq, exists, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "./client";
import { catalogRead } from "./season-catalog";
import { clubs, people, registrations } from "./season-schema";

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
  // The live E2025/E2026 registration role J is "Player"; other roles are staff.
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
): Promise<CountedPage<Player>> {
  const scope = search
    ? and(playerScope(seasonCode), or(ilike(people.name, `%${search}%`), ilike(people.jerseyName, `%${search}%`))!)
    : playerScope(seasonCode);
  const [rows, countRows] = await Promise.all([
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
  return { items: rows.slice(0, limit), hasMore: rows.length > limit, total: countRows[0]?.count ?? 0 };
}

export async function getPlayer(seasonCode: string, personKey: string): Promise<Player | null> {
  const rows = await catalogRead(() =>
    db.select(playerFields)
      .from(people)
      .where(and(playerScope(seasonCode), eq(people.personKey, personKey)))
      .limit(1),
  );
  return rows[0] ?? null;
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
