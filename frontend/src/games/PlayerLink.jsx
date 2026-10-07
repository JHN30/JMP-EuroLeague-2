import { Link } from "react-router";

// A player's name as a link to their page. `noComma` shows "LAST FIRST" instead of the feed's "LAST, FIRST".
export default function PlayerLink({ seasonCode, player, className = "", noComma = false }) {
  const feedName = player.personName ?? player.personKey;
  const name = noComma ? feedName.replace(/\s*,\s*/g, " ") : feedName;
  return (
    <Link to={`/${seasonCode}/players/${player.personKey}`} className={`hover:text-primary ${className}`} title={name}>
      {name}
    </Link>
  );
}
