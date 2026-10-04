import { motion } from "motion/react";
import { Link } from "react-router";
import { EASE_OUT, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PlayerPortrait from "../lib/PlayerPortrait";
import { nameParts } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import { statNumber } from "./playerOverview";

function Fact({ label, value, sub }) {
  return (
    <motion.div className="flex flex-col" variants={sectionItem}>
      <span className="muted text-xs font-bold uppercase tracking-wide">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      {sub ? <span className="muted text-xs">{sub}</span> : null}
    </motion.div>
  );
}

// One club on the player's registrations this season; a traded player has several.
function ClubChip({ registration, seasonCode }) {
  const team = registration.team;
  const former = registration.active === false;
  const label = team?.name ?? registration.clubCode ?? "Unknown team";
  const content = (
    <>
      {team?.crestUrl ? <RevealImage src={team.crestUrl} className="h-6 w-6 flex-none object-contain" /> : null}
      <span className="truncate font-semibold">{label}</span>
      {former ? <span className="badge badge-ghost badge-sm">Former</span> : null}
    </>
  );
  const className = "flex min-w-0 items-center gap-2";
  return team ? (
    <Link to={`/${seasonCode}/teams/${team.clubCode}`} className={`${className} link-hover`}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}

// The top of a player page, above every tab: photo, name and number, club, and the facts that do not change by tab.
export default function PlayerHero({ player, registrations, stats, seasonCode }) {
  const { last, first } = nameParts(player.name ?? player.jerseyName ?? player.personKey);
  const age = statNumber(stats?.playerAge);
  const gamesPlayed = statNumber(stats?.traditional?.gamesPlayed);
  const gamesStarted = statNumber(stats?.traditional?.gamesStarted ?? stats?.misc?.gamesStarted);
  const wins = statNumber(stats?.misc?.wins);
  const losses = statNumber(stats?.misc?.losses);
  const photoUrl = player.imageUrl ?? stats?.playerImageUrl ?? null;
  // The registrations arrive on their own request; until then the club the player is listed with stands in for them.
  const clubs =
    registrations ??
    (player.clubCode
      ? [{ registrationKey: player.clubCode, clubCode: player.clubCode, active: true, team: { clubCode: player.clubCode, name: player.clubName, crestUrl: player.crestUrl } }]
      : []);

  return (
    <Panel as="section" className="relative mb-6 flex overflow-hidden">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary" />
      <PlayerPortrait imageUrl={photoUrl} className="w-28 sm:w-44" />
      <motion.div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-6" variants={sectionContainer} initial="hidden" animate="show">
        <motion.div className="flex items-start justify-between gap-3" variants={sectionItem}>
          <div className="min-w-0">
            <p className="eyebrow mb-1">PLAYER{player.positionName ? ` · ${player.positionName.toUpperCase()}` : ""}</p>
            <h1 className="min-w-0 break-words">
              <span className="muted block text-xs font-bold uppercase tracking-[0.2em] sm:text-sm">{first}</span>
              <span className="block text-3xl font-black uppercase leading-none sm:text-5xl">{last}</span>
            </h1>
          </div>
          {player.dorsal ? (
            <motion.p
              className="flex-none text-4xl font-black leading-none tabular-nums sm:text-6xl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}
            >
              <span className="muted mr-0.5 text-xl font-bold sm:text-3xl">#</span>
              {player.dorsal}
            </motion.p>
          ) : null}
        </motion.div>

        {clubs.length > 0 ? (
          <motion.div className="flex flex-wrap gap-x-5 gap-y-2" variants={sectionItem}>
            {clubs.map((registration) => (
              <ClubChip key={registration.registrationKey} registration={registration} seasonCode={seasonCode} />
            ))}
          </motion.div>
        ) : null}

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Fact label="Country" value={player.countryCode ?? "—"} />
          <Fact label="Height" value={player.heightCm ? `${player.heightCm} cm` : "—"} />
          <Fact label="Age" value={age ?? "—"} />
          {gamesPlayed !== null ? (
            <Fact label="Games" value={gamesPlayed} sub={gamesStarted !== null ? `${gamesStarted} started` : null} />
          ) : null}
          {wins !== null && losses !== null ? <Fact label="Team record" value={`${wins}–${losses}`} sub="with the player" /> : null}
        </div>
      </motion.div>
    </Panel>
  );
}
