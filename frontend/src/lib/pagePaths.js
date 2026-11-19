import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { displayName } from "./playerName";

// Game, player and team pages are addressed by readable words with the code at the end: "maccabi-vs-dubai-122",
// "alberto-abalde-003733", "real-madrid-mad". Only the code is ever used to find the page, so stale or misspelled words still
// open it. Codes never hold a hyphen or a lower-case letter (club codes and person keys are [A-Z0-9]+, game codes are
// digits), so the code is the text after the last hyphen, upper-cased.

// Letters that stay whole when accents are split off.
const PLAIN_LETTERS = { đ: "d", ø: "o", ł: "l", ß: "ss", æ: "ae", œ: "oe", ı: "i", þ: "th" };

function words(text) {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đøłßæœıþ]/g, (letter) => PLAIN_LETTERS[letter])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function segment(name, code) {
  const lowerCode = String(code).toLowerCase();
  const named = words(name);
  return named ? `${named}-${lowerCode}` : lowerCode;
}

// The code a page address stands for: "maccabi-vs-dubai-122" -> "122", "real-mad" -> "MAD", "MAD" -> "MAD".
export function codeFromSegment(value) {
  const text = value ?? "";
  return text.slice(text.lastIndexOf("-") + 1).toUpperCase();
}

const clubName = (team) => team?.abbreviatedName || team?.name;

// `game` needs `gameCode`; with both teams it also reads "local-vs-road". A link that knows only the code passes
// `{ gameCode }`, and the game page then moves the address to the full form.
export function gamePath(seasonCode, game) {
  const local = words(clubName(game.localTeam));
  const road = words(clubName(game.roadTeam));
  return `/${seasonCode}/games/${segment(local && road ? `${local} vs ${road}` : "", game.gameCode)}`;
}

// `name` is the stored "Surname, Given" form (or already "Given Surname"); without it the address is the bare key.
export function playerPath(seasonCode, personKey, name) {
  return `/${seasonCode}/players/${segment(name ? displayName(name) : "", personKey)}`;
}

// `team` needs `clubCode`, and reads its full name (`name`, else `abbreviatedName`): "real-madrid-mad". The full name,
// unlike the short one, is on every answer that links to a team (standings and records carry only `clubName`).
export function teamPath(seasonCode, team) {
  return `/${seasonCode}/teams/${segment(team.name || team.abbreviatedName, team.clubCode)}`;
}

// The page an address shows, whatever words it carries: "/2026/games/maccabi-vs-dubai-122" and "/2026/games/122" are both
// "/2026/games/122". Keying on it, unlike on the raw path, does not remount a page when its address becomes canonical.
export function pageIdentity(pathname) {
  return pathname.replace(/^(\/[^/]+\/(?:games|players|teams)\/)([^/]+)/, (match, start, value) => start + codeFromSegment(value));
}

// Once a page knows its game, player or team, an address in any other form (an old bare code, other words) is replaced
// by the canonical one, keeping the query string and hash, without adding a history entry.
export function useCanonicalPath(path) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (path && location.pathname !== path) {
      navigate({ pathname: path, search: location.search, hash: location.hash }, { replace: true });
    }
  }, [path, location.pathname, location.search, location.hash, navigate]);
}
