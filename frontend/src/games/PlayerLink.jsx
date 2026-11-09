import { Link } from "react-router";
import { displayName } from "../lib/playerName";

// A player's name as a link to their page. `noComma` shows "Shane Larkin" instead of the stored "Larkin, Shane".
export default function PlayerLink({ seasonCode, player, className = "", noComma = false }) {
  const storedName = player.personName ?? player.personKey;
  const name = noComma ? displayName(storedName) : storedName;
  return (
    <Link to={`/${seasonCode}/players/${player.personKey}`} className={`hover:text-primary ${className}`} title={name}>
      {name}
    </Link>
  );
}
