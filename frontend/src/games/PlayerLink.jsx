import { Link } from "react-router";

// A player's name as a link to their page.
export default function PlayerLink({ seasonCode, player, className = "" }) {
  const name = player.personName ?? player.personKey;
  return (
    <Link to={`/${seasonCode}/players/${player.personKey}`} className={`hover:text-primary ${className}`} title={name}>
      {name}
    </Link>
  );
}
