import { motion } from "motion/react";
import { Link } from "react-router";
import { EASE_OUT, sectionContainer, sectionItem } from "../lib/motion";
import Panel from "../lib/Panel";
import PlayerPortrait from "../lib/PlayerPortrait";
import { nameParts } from "../lib/playerName";
import RevealImage from "../lib/RevealImage";
import ShortLabel from "../lib/ShortLabel";
import { statNumber } from "./playerOverview";

function Fact({ label, value, sub }) {
  return (
    <motion.div className="flex flex-col max-sm:w-1/3 max-sm:items-center max-sm:text-center" variants={sectionItem}>
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
  // Below sm the club goes by the code it has this season.
  const short = team?.tvCode ?? team?.abbreviatedName ?? registration.clubCode ?? label;
  const content = (
    <>
      {team?.crestUrl ? <RevealImage src={team.crestUrl} className="h-6 w-6 flex-none object-contain" /> : null}
      <span className="truncate font-semibold">
        <ShortLabel short={short} full={label} />
      </span>
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
      ? [{ registrationKey: player.clubCode, clubCode: player.clubCode, active: true, team: { clubCode: player.clubCode, name: player.clubName, tvCode: player.clubTvCode, crestUrl: player.crestUrl } }]
      : []);

  return (
    // Below sm everything is centred in one column under the portrait; from sm the portrait is the left side of the whole panel.
    <Panel as="section" className="relative mb-6 grid overflow-hidden sm:grid-cols-[11rem_1fr]">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary" />
      <PlayerPortrait imageUrl={photoUrl} className="max-sm:mx-auto max-sm:mt-5 max-sm:aspect-4/5 max-sm:w-36 max-sm:rounded-box sm:row-span-2 sm:w-full" />
      <motion.div className="min-w-0 p-3 pb-0 max-sm:text-center sm:p-6 sm:pb-0" variants={sectionContainer} initial="hidden" animate="show">
        <motion.div className="flex flex-col items-center gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3" variants={sectionItem}>
          <div className="min-w-0">
            <p className="eyebrow mb-1">PLAYER{player.positionName ? ` · ${player.positionName.toUpperCase()}` : ""}</p>
            <h1 className="min-w-0 break-words">
              <span className="muted block text-xs font-bold uppercase tracking-[0.2em] max-sm:mb-1 sm:text-sm">{first}</span>
              <span className="block text-3xl font-black uppercase leading-none max-sm:wrap-break-word sm:text-5xl">{last}</span>
            </h1>
          </div>
          {player.dorsal ? (
            <motion.p
              className="flex-none text-3xl font-black leading-none tabular-nums sm:text-6xl"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}
            >
              <span className="muted mr-0.5 text-xl font-bold sm:text-3xl">#</span>
              {player.dorsal}
            </motion.p>
          ) : null}
        </motion.div>
      </motion.div>

      <motion.div className="flex min-w-0 flex-col gap-4 p-3 sm:px-6 sm:pb-6 sm:pt-4" variants={sectionContainer} initial="hidden" animate="show">
        {clubs.length > 0 ? (
          <motion.div className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-start" variants={sectionItem}>
            {clubs.map((registration) => (
              <ClubChip key={registration.registrationKey} registration={registration} seasonCode={seasonCode} />
            ))}
          </motion.div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-y-3 sm:justify-start sm:gap-x-8">
          <Fact label="Country" value={player.countryCode ?? "—"} />
          <Fact label="Height" value={player.heightCm ? `${player.heightCm} cm` : "—"} />
          <Fact label="Age" value={age ?? "—"} />
          {gamesPlayed !== null ? (
            <Fact label="Games" value={gamesPlayed} sub={gamesStarted !== null ? `${gamesStarted} started` : null} />
          ) : null}
          {wins !== null && losses !== null ? <Fact label="Team record" value={`${wins}–${losses}`} sub="with the player" /> : null}
        </div>
        <motion.div variants={sectionItem}>
          <Link to={`/${seasonCode}/compare?view=players&playerA=${encodeURIComponent(player.personKey)}`} className="btn btn-outline btn-sm max-sm:w-full">
            Compare with another player
          </Link>
        </motion.div>
      </motion.div>
    </Panel>
  );
}
